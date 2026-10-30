import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import test from 'node:test';
import ts from 'typescript';

const uiVue = createRequire(new URL('../packages/ui/package.json', import.meta.url))('vue');
const builtinRequire = createRequire(new URL('../packages/builtin-plugins/package.json', import.meta.url));
const coreRequire = createRequire(new URL('../packages/core/package.json', import.meta.url));

function loadModule(filename, dependencies = {}, globals = {}) {
  const source = fs.readFileSync(new URL(`../${filename}`, import.meta.url), 'utf8');
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  });
  const exports = {};
  vm.runInNewContext(outputText, {
    exports,
    console,
    ...globals,
    require(name) {
      if (Object.hasOwn(dependencies, name)) return dependencies[name];
      throw new Error(`Unexpected dependency: ${name}`);
    },
  }, { filename });
  return exports;
}

function createHistory(initial) {
  let children = structuredClone(initial);
  let failRestore = false;
  const { HistoryManager } = loadModule('packages/core/src/core/history.ts');
  const document = {
    snapshot: () => structuredClone(children),
    subscribe: () => () => { },
    replace(data) {
      if (failRestore) throw new Error('restore failed');
      children = structuredClone(data);
    },
  };
  return {
    history: new HistoryManager(document),
    get children() { return children; },
    set failRestore(value) { failRestore = value; },
  };
}

function createOverlayRegistry() {
  const toggle = loadModule('packages/core/src/api/panel-toggle.ts');
  const { OverlayPanelRegistry } = loadModule('packages/core/src/core/overlay-panel-registry.ts', {
    '../api/panel-toggle': toggle,
  });
  return new OverlayPanelRegistry();
}

test('image filter settings normalize and round-trip Leafer filter entries', () => {
  const filters = loadModule('packages/core/src/document/image-filters.ts');
  assert.equal(JSON.stringify(filters.normalizeImageFilterSettings({ exposure: 4, contrast: -0.5, unknown: 1 })), JSON.stringify({
    exposure: 1,
    contrast: -0.5,
    saturation: 0,
  }));
  const runtimeFilters = filters.toLeaferImageFilters({ exposure: 0, saturation: 0.3 });
  assert.equal(runtimeFilters.length, 1);
  assert.equal(runtimeFilters[0].type, 'saturation');
  assert.equal(runtimeFilters[0].value, 0.3);
  assert.equal(JSON.stringify(filters.fromLeaferImageFilters(runtimeFilters)), JSON.stringify({
    exposure: 0,
    contrast: 0,
    saturation: 0.3,
  }));
});

test('binary asset store supports put, get and delete', async () => {
  const { BinaryAssetStore } = loadModule('packages/core/src/document/binary-asset-store.ts', {}, {
    navigator: undefined,
    Blob,
  });
  const store = new BinaryAssetStore();
  const asset = new Blob(['media-bytes'], { type: 'video/mp4' });
  await store.put('asset-test', asset);
  const restored = await store.get('asset-test');
  assert.equal(await restored.text(), 'media-bytes');
  await store.delete('asset-test');
  assert.equal(await store.get('asset-test'), undefined);
});

test('OPFS assets preserve MIME metadata across storage instances', async () => {
  const files = new Map();
  const directory = {
    async getDirectoryHandle() { return directory; },
    async getFileHandle(name, options) {
      if (!files.has(name) && !options?.create) throw new DOMException('missing', 'NotFoundError');
      return {
        async createWritable() {
          const chunks = [];
          return { async write(chunk) { chunks.push(chunk); }, async close() { files.set(name, new Blob(chunks)); } };
        },
        async getFile() { return files.get(name); },
      };
    },
    async removeEntry(name) { files.delete(name); },
  };
  const { BinaryAssetStore } = loadModule('packages/core/src/document/binary-asset-store.ts', {}, {
    navigator: { storage: { getDirectory: async () => directory } }, Blob, DOMException,
  });
  await new BinaryAssetStore().putStream('video', 'video/mp4', new Blob(['video-bytes']).stream());
  const storage = new BinaryAssetStore();
  const restored = await storage.get('video');
  assert.equal(restored.type, 'video/mp4');
  assert.equal(await restored.text(), 'video-bytes');
  await storage.delete('video');
  assert.equal(files.size, 0);
});

test('overlay registration accepts plugin ids and release handles cannot remove replacements', () => {
  const registry = createOverlayRegistry();
  let changes = 0;
  const unsubscribe = registry.subscribe(() => changes++);
  const panel = { id: 'example.custom-panel', label: 'Custom panel', component: {}, visibilityMode: 'open-prop', pluginId: 'example' };
  const release = registry.register(panel);
  assert.equal(changes, 1);
  assert.throws(() => registry.register(panel), /already registered/);
  release();
  assert.equal(changes, 2);
  const replacement = { ...panel };
  registry.register(replacement);
  release();
  assert.equal(registry.list()[0], replacement);
  registry.unregisterByPlugin('example');
  assert.equal(registry.list().length, 0);
  assert.equal(changes, 4);
  unsubscribe();
  registry.register(panel);
  assert.equal(changes, 4);
});

test('overlay requests are instance scoped and release their subscribers', () => {
  const first = createOverlayRegistry();
  const second = createOverlayRegistry();
  const received = [];
  const other = [];
  const release = first.subscribeRequests(request => received.push(request));
  second.subscribeRequests(request => other.push(request));
  first.request('example.panel', 'open');
  first.request('example.panel', 'close');
  first.request('example.panel');
  assert.equal(received.map(request => request.action).join(','), 'open,close,toggle');
  assert.equal(other.length, 0);
  release();
  first.request('example.panel');
  assert.equal(received.length, 3);
});

test('overlay subscriptions follow editor replacement and release with their Vue scope', () => {
  const { useOverlayPanels } = loadModule('packages/ui/src/composables/useOverlayPanels.ts', { vue: uiVue });
  const first = createOverlayRegistry();
  const second = createOverlayRegistry();
  const editor = uiVue.shallowRef({ overlayPanels: first });
  const scope = uiVue.effectScope();
  const panels = scope.run(() => useOverlayPanels(editor));
  first.register({ id: 'first.panel', label: 'First', component: {}, visibilityMode: 'open-prop' });
  assert.equal(panels.value.length, 1);
  editor.value = { overlayPanels: second };
  assert.equal(panels.value.length, 0);
  first.register({ id: 'old.panel', label: 'Old', component: {}, visibilityMode: 'open-prop' });
  assert.equal(panels.value.length, 0);
  second.register({ id: 'second.panel', label: 'Second', component: {}, visibilityMode: 'open-prop' });
  assert.equal(panels.value[0].id, 'second.panel');
  scope.stop();
  second.unregister('second.panel');
  assert.equal(panels.value.length, 1);
});

test('dynamic dock metadata is instance scoped and unload removes active flyouts', () => {
  const storage = new Map();
  const { createPanelDock } = loadModule('packages/ui/src/composables/usePanelDock.ts', { vue: uiVue }, {
    window: {
      localStorage: {
        getItem: key => storage.get(key) ?? null,
        setItem: (key, value) => storage.set(key, value),
      }
    },
  });
  const first = createPanelDock();
  const second = createPanelDock();
  const meta = { id: 'example.custom-panel', label: 'Custom panel', icon: 'settings' };
  first.syncPanels([meta]);
  second.syncPanels([meta]);
  first.dockPanel(meta.id);
  assert.equal(first.dockedPanels.value[0].label, 'Custom panel');
  assert.equal(first.isFlyoutOpen(meta.id), true);
  assert.equal(second.isPanelDocked(meta.id), false);
  first.syncPanels([]);
  assert.equal(first.dockedPanels.value.length, 0);
  assert.equal(first.activeFlyoutId.value, null);
  assert.equal(first.isPanelDocked(meta.id), false);
});

function createDocumentRuntime(limits = {}) {
  const binaryAssetStore = loadModule('packages/core/src/document/binary-asset-store.ts', {}, {
    navigator: undefined, Blob, Response,
  });
  const resourceModule = loadModule('packages/core/src/document/resources.ts', {
    './binary-asset-store': binaryAssetStore,
    '@noble/hashes/sha2.js': coreRequire('@noble/hashes/sha2.js'),
  }, {
    crypto, structuredClone, URL, Blob, Uint8Array, TextEncoder, TransformStream,
  });
  const model = loadModule('packages/core/src/document/model.ts', { './resources': resourceModule }, { crypto });
  const { DocumentStore } = loadModule('packages/core/src/document/document-store.ts', { './model': model }, { structuredClone });
  const operations = loadModule('packages/core/src/document/element-operations.ts', {}, { crypto });
  const flowGraph = loadModule('packages/core/src/core/flow-graph.ts');
  const imageFilters = loadModule('packages/core/src/document/image-filters.ts');
  const { DocumentCommands } = loadModule('packages/core/src/document/commands.ts', {
    './element-operations': operations,
    '../core/flow-graph': flowGraph,
    '../core/builtin-node-types': { FLOW_NODE_DOCUMENT_TYPE: 'leafer-flow.flow-node' },
  }, { structuredClone, crypto });
  const { NodeTypeRegistry } = loadModule('packages/core/src/core/node-type-registry.ts');
  const { registerBuiltinNodeTypes } = loadModule('packages/core/src/core/builtin-node-types.ts', {
    './flow-graph-view': { createFlowGraphNode() { throw new Error('Rendering not available in document test'); } },
    './flow-node-shape': { FLOW_BOX_SIZE_PROP: '__flowBoxSize', FLOW_SHAPE_KIND_PROP: '__flowShapeKind' },
    '../document/image-filters': imageFilters,
  }, { structuredClone });
  const { DocumentClipboard } = loadModule('packages/core/src/document/clipboard.ts', {
    './resources': resourceModule,
    './document-store': { DocumentStore },
  }, { structuredClone, crypto });
  const nodeTypes = new NodeTypeRegistry();
  registerBuiltinNodeTypes(nodeTypes);
  const document = new DocumentStore();
  const resources = new resourceModule.ResourceService(document, limits);
  const clipboard = new DocumentClipboard(document, resources);
  return { document, nodeTypes, resources, clipboard, commands: new DocumentCommands(document, nodeTypes, resources, clipboard) };
}

test('element commands move selected roots once and respect locked ancestors', () => {
  const { document, commands } = createDocumentRuntime();
  commands.insertNode({
    id: 'group', type: 'Group', version: 1, data: { x: 10, y: 20 }, children: [
      { id: 'child', type: 'Rect', version: 1, data: { x: 3, y: 4 }, children: [] },
    ]
  });
  commands.insertNode({ id: 'locked', type: 'Rect', version: 1, data: { locked: true, x: 2 }, children: [] });
  assert.equal(commands.moveElements(['child', 'group', 'group', 'locked'], 5, -2), 1);
  assert.equal(document.getNode('group').data.x, 15);
  assert.equal(document.getNode('child').data.x, 3);
  assert.equal(document.getNode('locked').data.x, 2);
  commands.setElementState(['group'], { locked: true });
  const revision = document.revision;
  assert.equal(commands.moveElements(['child'], 1, 1), 0);
  assert.equal(document.revision, revision);
  assert.throws(() => commands.moveElements(['child'], Infinity, 1), /finite/);
  assert.equal(commands.unlockAll(), 2);
  assert.equal(commands.moveElements(['child'], 1, 1), 1);
});

test('element commands move floating endpoints and label offsets without changing node bindings', () => {
  const { document, commands } = createDocumentRuntime();
  commands.insertNode({ id: 'node', type: 'Rect', version: 1, data: {}, children: [] });
  commands.insertEdge({ id: 'edge', parentId: null, from: { nodeId: 'node', port: {} }, to: { x: 10, y: 20 }, data: { waypoints: [{ x: 5, y: 6 }] } });
  commands.insertNode({ id: 'label', type: 'Text', version: 1, data: {}, children: [], label: { edgeId: 'edge', offsetX: 2, offsetY: 3 } });
  assert.equal(commands.moveElements(['edge'], 3, 4), 1);
  const edge = document.snapshot().edges[0];
  assert.equal(edge.from.nodeId, 'node');
  assert.equal(edge.to.x, 13);
  assert.equal(edge.data.waypoints[0].y, 10);
  assert.equal(commands.moveElements(['label'], -1, 2), 1);
  assert.equal(document.getNode('label').label.offsetX, 1);
  assert.equal(document.getNode('label').label.offsetY, 5);
});

test('element commands preserve relative order across nodes and edges and skip no-op history', () => {
  const { document, commands } = createDocumentRuntime();
  for (const id of ['a', 'b', 'c']) commands.insertNode({ id, type: 'Rect', version: 1, data: {}, children: [] });
  commands.insertEdge({ id: 'edge', parentId: null, from: { x: 0, y: 0 }, to: { x: 10, y: 10 }, data: {} });
  const order = () => [...document.snapshot().nodes, ...document.snapshot().edges]
    .sort((left, right) => (left.data.zIndex ?? 0) - (right.data.zIndex ?? 0)).map(item => item.id).join(',');
  assert.equal(commands.reorderElements(['b', 'a'], 'bringForward'), 2);
  assert.equal(order(), 'c,a,b,edge');
  commands.reorderElements(['b', 'a'], 'sendToBack');
  assert.equal(order(), 'a,b,c,edge');
  commands.reorderElements(['edge', 'a'], 'bringToFront');
  assert.equal(order(), 'b,c,a,edge');
  const revision = document.revision;
  assert.equal(commands.reorderElements(['edge'], 'bringToFront'), 0);
  assert.equal(document.revision, revision);
  commands.setElementState(['a', 'edge'], { visible: false, locked: true });
  assert.equal(document.getNode('a').data.visible, false);
  assert.equal(document.snapshot().edges[0].data.locked, true);
});

test('document alignment and distribution update nested local coordinates as one document operation', () => {
  const { document, commands } = createDocumentRuntime();
  commands.insertNode({
    id: 'group', type: 'Group', version: 1, data: { x: 100, y: 50 }, children: [
      { id: 'a', type: 'Rect', version: 1, data: { x: 0, y: 0, width: 20, height: 10 }, children: [] },
      { id: 'b', type: 'Rect', version: 1, data: { x: 50, y: 30, width: 40, height: 20 }, children: [] },
    ]
  });
  assert.equal(commands.alignElements(['a', 'b'], 'alignLeft'), 1);
  assert.equal(document.getNode('a').data.x, 0);
  assert.equal(document.getNode('b').data.x, 0);
  assert.equal(document.getNode('b').data.y, 30);
  commands.insertNode({ id: 'c', type: 'Rect', version: 1, data: { x: 90, y: 70, width: 10, height: 10 }, children: [] }, 'group');
  assert.equal(commands.alignElements(['a', 'b', 'c'], 'distributeHorizontal'), 1);
  assert.equal(document.getNode('b').data.x, 35);
});

test('document presentation updates toggle node reflection scale without writing Leafer objects', () => {
  const { document, commands } = createDocumentRuntime();
  const { HistoryManager } = loadModule('packages/core/src/core/history.ts');
  const history = new HistoryManager(document);
  commands.insertNode({ id: 'node', type: 'Rect', version: 1, data: {}, children: [] });
  commands.updatePresentation(['node'], { scale_x: -1 });
  assert.equal(document.getNode('node').data.scaleX, -1);
  commands.updatePresentation(['node'], { scale_x: 1 });
  assert.equal(document.getNode('node').data.scaleX, 1);
  history.undo();
  assert.equal(document.getNode('node').data.scaleX, -1);
});

test('auto layout calculates positions from document edges without mutating its input', () => {
  const { document, commands } = createDocumentRuntime();
  commands.insertNode({ id: 'start', type: 'Rect', version: 1, data: { x: 0, y: 0, width: 80, height: 40 }, children: [] });
  commands.insertNode({ id: 'end', type: 'Rect', version: 1, data: { x: 10, y: 10, width: 80, height: 40 }, children: [] });
  commands.insertEdge({ id: 'edge', parentId: null, from: { nodeId: 'start', port: {} }, to: { nodeId: 'end', port: {} }, data: {} });
  const input = document.snapshot();
  const layout = loadModule('packages/builtin-plugins/src/builtin/plugins/auto-layout/layout-engine.ts', {
    dagre: builtinRequire('dagre'),
  });
  const result = layout.autoLayout(input, ['start', 'end'], { marginX: 0, marginY: 0 });
  assert.equal(result.success, true);
  assert.equal(result.movedCount >= 1, true);
  assert.equal(result.positions.start.y < result.positions.end.y, true);
  assert.equal(document.snapshot().nodes[1].data.y, 10);
  assert.equal(layout.autoLayout(input, ['missing']).success, false);
  const locked = structuredClone(input);
  locked.nodes.forEach(node => { node.data.locked = true; });
  assert.match(layout.autoLayout(locked, ['start', 'end']).message, /锁定/);
});

test('template flow graphs become one document transaction with mapped endpoints, labels and settings', () => {
  const { document, commands } = createDocumentRuntime();
  const graph = {
    nodes: [
      { id: 'template:start', kind: 'startEnd', text: 'Start', x: 10, y: 20, width: 100, height: 50 },
      { id: 'template:task', kind: 'process', text: 'Task', x: 180, y: 20, width: 120, height: 60, style: { fill: '#abcdef', stroke: '#123456', strokeWidth: 3 } },
    ],
    edges: [{ id: 'template:edge', from: 'template:start', to: 'template:task', fromSide: 'right', toSide: 'left', label: 'Next', routeType: 'bezier' }],
  };
  const revision = document.revision;
  const inserted = commands.insertFlowGraph(graph, kind => ({ fill: '#fff', stroke: '#000', strokeWidth: 2 }), { connectorRouteType: 'bezier' });
  const snapshot = document.snapshot();
  assert.equal(document.revision, revision + 1);
  assert.equal(inserted.nodeIds.length, 2);
  assert.equal(inserted.edgeCount, 1);
  assert.equal(inserted.labelCount, 1);
  assert.equal(snapshot.nodes[1].data.style.fill, '#abcdef');
  assert.equal(snapshot.edges[0].from.nodeId, inserted.nodeIds[0]);
  assert.equal(snapshot.edges[0].to.nodeId, inserted.nodeIds[1]);
  assert.equal(snapshot.nodes[2].label.edgeId, snapshot.edges[0].id);
  assert.equal(snapshot.settings.connectorRouteType, 'bezier');
});

test('element commands place nodes and edges within declared containers and reject cycles atomically', () => {
  const { document, commands } = createDocumentRuntime();
  commands.insertNode({ id: 'group', type: 'Group', version: 1, data: {}, children: [] });
  commands.insertNode({ id: 'node', type: 'Rect', version: 1, data: { x: 10, y: 20 }, children: [] });
  commands.insertEdge({ id: 'edge', parentId: null, from: { x: 0, y: 0 }, to: { x: 10, y: 10 }, data: {} });
  assert.equal(commands.placeElement('node', 'group', 'inside'), true);
  assert.equal(document.getNode('group').children[0].id, 'node');
  assert.equal(document.getNode('node').data.x, 10);
  commands.placeElement('edge', 'node', 'before');
  assert.equal(document.snapshot().edges[0].parentId, 'group');
  assert.equal(document.snapshot().edges[0].data.zIndex < document.getNode('node').data.zIndex, true);
  const revision = document.revision;
  assert.throws(() => commands.placeElement('group', 'node', 'before'), /descendant/);
  assert.throws(() => commands.placeElement('node', 'node', 'after'), /itself/);
  assert.throws(() => commands.placeElement('edge', 'node', 'inside'), /does not accept/);
  assert.equal(document.revision, revision);
  commands.placeElement('node', 'group', 'after');
  assert.equal(document.getNode('group').children.length, 0);
  assert.equal(document.snapshot().nodes.some(node => node.id === 'node'), true);
});

test('resources prepare portable content and deduplicate atomic node imports', async () => {
  const { document, commands, resources } = createDocumentRuntime();
  const file = new Blob(['image-content'], { type: 'image/png' });
  const first = await resources.prepare(file);
  const repeated = await resources.prepare(file);
  assert.equal(first.id, repeated.id);
  const streamed = await resources.importStream(first, file.stream());
  assert.equal(streamed.id, first.id);
  await assert.rejects(resources.importStream({ ...first, size: 1 }, new Blob(['bad']).stream()), /metadata mismatch/);
  assert.equal(await (await resources.getBlob(first.id)).text(), 'image-content');
  assert.equal(Object.keys(document.snapshot().assets).length, 0);
  commands.insertNode({ id: 'image-one', type: 'Image', version: 1, data: { assetId: first.id }, children: [] }, undefined, [first]);
  commands.insertNode({ id: 'image-two', type: 'Image', version: 1, data: { nested: { assetIds: [first.id] }, assetId: first.id }, children: [] }, undefined, [repeated]);
  assert.equal(Object.keys(document.snapshot().assets).length, 1);
  assert.equal(document.getNode('image-two').data.assetId, first.id);
  assert.equal(document.getNode('image-two').data.nested.assetIds[0], first.id);
  const packaged = JSON.parse(JSON.stringify(document.snapshot()));
  assert.ok(resources.resolve(first.id, packaged).startsWith('blob:'));
  assert.equal(packaged.assets[first.id].source, undefined);
  assert.ok(JSON.stringify(packaged).length < 1000);
  const restored = createDocumentRuntime();
  await restored.resources.importStream(first, file.stream());
  await restored.resources.hydrateAssets(packaged.assets);
  restored.document.replace(packaged, 'load', 'Restore packaged resource');
  assert.ok(restored.resources.resolve(first.id).startsWith('blob:'));
  const second = await resources.prepare(new Blob(['second-image'], { type: 'image/png' }));
  const invalidAsset = { ...first, source: 'blob:temporary' };
  await assert.rejects(restored.resources.hydrateAssets({ invalid: invalidAsset }), /restore document resources/);
  await assert.rejects(restored.resources.getBlob(second.id), /Missing stored resource/);
});

test('document packages stream binary assets and restore metadata-only documents', async () => {
  const state = createDocumentRuntime();
  const model = loadModule('packages/core/src/document/model.ts', {
    './resources': loadModule('packages/core/src/document/resources.ts', {
      './binary-asset-store': {}, '@noble/hashes/sha2.js': coreRequire('@noble/hashes/sha2.js'),
    }),
  }, { crypto });
  const archive = loadModule('packages/core/src/document/document-package.ts', {
    fflate: coreRequire('fflate'), './model': model,
  }, { Blob, TextEncoder, TextDecoder, Uint8Array, TransformStream });
  const asset = await state.resources.prepare(new Blob(['media bytes'], { type: 'video/mp4' }));
  state.commands.insertNode({ id: 'media', type: 'Video', version: 1, data: { assetId: asset.id }, children: [] }, undefined, [asset]);
  const snapshot = state.document.snapshot();
  const file = await archive.exportDocumentPackage(snapshot, state.resources);
  const restored = createDocumentRuntime();
  const imported = await archive.importDocumentPackage(file, restored.resources);
  restored.document.replace(imported, 'load', 'Package');
  assert.deepEqual(structuredClone(imported), snapshot);
  assert.equal(await (await restored.resources.getBlob(asset.id)).text(), 'media bytes');
  assert.equal(JSON.stringify(imported).includes('base64'), false);
  await assert.rejects(archive.importDocumentPackage(new Blob(['invalid']), restored.resources));
  const { zipSync } = coreRequire('fflate');
  const manifest = new TextEncoder().encode(JSON.stringify(snapshot));
  await assert.rejects(archive.importDocumentPackage(new Blob([zipSync({ 'document.json': manifest }, { level: 0 })]), restored.resources), /incomplete/);
  await assert.rejects(archive.importDocumentPackage(new Blob([zipSync({
    'document.json': manifest,
    [`assets/${asset.id}`]: new TextEncoder().encode('wrong bytes'),
  }, { level: 0 })]), restored.resources), /hash mismatch/);
  assert.equal(await (await restored.resources.getBlob(asset.id)).text(), 'media bytes');
  await assert.rejects(archive.importDocumentPackage(new Blob([zipSync({ 'document.json': manifest })]), restored.resources), /unsupported package/);
});

test('media runtime restores video position, observes ended/errors and releases audio', async () => {
  class Media extends EventTarget {
    paused = true;
    currentTime = 0;
    duration = 10;
    readyState = 1;
    async play() { this.paused = false; this.dispatchEvent(new Event('play')); }
    pause() { this.paused = true; this.dispatchEvent(new Event('pause')); }
    removeAttribute() { this.src = ''; }
    load() { }
  }
  const { MediaController } = loadModule('packages/core/src/core/media-controller.ts', {}, {
    window: { document: { createElement: () => new Media() } },
  });
  const app = createEmitter();
  let video = new Media();
  const getView = () => ({ decoder: { decoder: video }, play() { }, pause() { video.pause(); }, set currentTime(value) { video.currentTime = value; } });
  const runtime = new MediaController(app, { resolve: () => 'blob:media' }, getView);
  const nodes = [
    { id: 'video', type: 'Video', data: { assetId: 'v', volume: 0.5, muted: true }, children: [] },
    { id: 'audio', type: 'Audio', data: { assetId: 'a', volume: 0.8 }, children: [] },
  ];
  runtime.sync({ nodes });
  await runtime.toggle('video');
  video.currentTime = 7;
  video.dispatchEvent(new Event('timeupdate'));
  runtime.beforeRender();
  video = new Media();
  runtime.sync({ nodes });
  await Promise.resolve();
  assert.equal(video.currentTime, 7);
  assert.equal(video.paused, false);
  assert.equal(video.volume, 0.5);
  video.paused = true;
  video.dispatchEvent(new Event('ended'));
  assert.equal(runtime.getState('video').paused, true);
  video.error = { message: 'decode failed' };
  video.dispatchEvent(new Event('error'));
  assert.equal(runtime.getState('video').error, 'decode failed');
  await runtime.toggle('audio');
  assert.equal(runtime.getState('audio').paused, false);
  runtime.seek('audio', 20);
  assert.equal(runtime.getState('audio').currentTime, 10);
  runtime.reset();
  assert.equal(runtime.getState('audio').paused, true);
  runtime.dispose();
  assert.equal(app.count(), 0);
});

test('media image headers reject oversized images before decoding', async () => {
  let decoded = false;
  const media = loadModule('packages/core/src/core/media-import.ts', {
    'image-dimensions': { imageDimensionsFromData: () => ({ width: 10000, height: 10000 }) },
  }, { Uint8Array, createImageBitmap() { decoded = true; } });
  await assert.rejects(media.prepareImagePreview(new Blob(['header'])), /3200/);
  assert.equal(decoded, false);
  assert.equal(JSON.stringify(media.fitMedia(4000, 2000, 2048)), JSON.stringify({ width: 2048, height: 1024 }));
});

test('resources reject invalid references, nonportable sources and capacity violations atomically', async () => {
  const { document, commands, resources } = createDocumentRuntime({ maxAssetBytes: 4, maxDocumentBytes: 5 });
  assert.throws(() => resources.validateFile(new Blob(['12345'], { type: 'image/png' })), /size limit/);
  assert.throws(() => resources.validateFile(new Blob(['1'])), /MIME type/);
  await assert.rejects(resources.prepare(new Blob(['12345'], { type: 'text/plain' })), /size limit/);
  const first = await resources.prepare(new Blob(['123'], { type: 'text/plain' }));
  commands.insertNode({ id: 'first', type: 'Rect', version: 1, data: { nested: { assetId: first.id } }, children: [] }, undefined, [first]);
  const revision = document.revision;
  const second = await resources.prepare(new Blob(['456'], { type: 'text/plain' }));
  assert.throws(() => commands.insertNode({ id: 'second', type: 'Rect', version: 1, data: {}, children: [] }, undefined, [second]), /size limit/);
  assert.equal(document.revision, revision);
  assert.equal(document.getNode('second'), undefined);
  assert.equal(resources.pruneUnused(), 1);
  assert.throws(() => commands.updateNode('first', { nested: { assetId: 'missing' } }), /Missing document asset/);
  assert.throws(() => commands.insertNode({ id: 'bad', type: 'Image', version: 1, data: { assetId: first.id }, children: [] }, undefined, [{ ...first, source: 'blob:temporary' }]), /unsupported fields/);
  assert.equal(document.revision, revision);
});

test('videos have a separate asset limit while sharing the document resource limit', () => {
  const { resources } = createDocumentRuntime({ maxAssetBytes: 4, maxVideoBytes: 8, maxDocumentBytes: 12 });
  assert.doesNotThrow(() => resources.validateFile(new Blob(['12345678'], { type: 'video/mp4' })));
  assert.throws(() => resources.validateFile(new Blob(['123456789'], { type: 'video/mp4' })), /Video resource.*size limit/);
  assert.throws(() => resources.validateFile(new Blob(['12345'], { type: 'image/png' })), /Resource.*size limit/);
});

test('resources retain pinned assets and cleanup is undoable without losing content', async () => {
  const { document, commands, resources } = createDocumentRuntime();
  const { HistoryManager } = loadModule('packages/core/src/core/history.ts');
  const history = new HistoryManager(document, resources);
  const asset = await resources.prepare(new Blob(['retained'], { type: 'text/plain' }));
  commands.insertNode({ id: 'node', type: 'Rect', version: 1, data: { assetId: asset.id }, children: [] }, undefined, [asset]);
  const release = resources.retain([asset.id]);
  commands.remove(['node']);
  assert.equal(resources.pruneUnused(), 0);
  release();
  release();
  assert.equal(resources.pruneUnused(), 1);
  assert.equal(Object.keys(document.snapshot().assets).length, 0);
  history.undo();
  assert.ok(resources.resolve(asset.id).startsWith('blob:'));
  assert.equal(await (await resources.getBlob(asset.id)).text(), 'retained');
  history.undo();
  assert.equal(document.getNode('node').data.assetId, asset.id);
  resources.dispose();
  await assert.rejects(resources.prepare(new Blob(['later'], { type: 'text/plain' })), /disposed/);
});

test('resources resolve through image projection without duplicating document assets', async () => {
  const { document, commands, resources, adapter } = createNodeProjection();
  const asset = await resources.prepare(new Blob(['image-content'], { type: 'image/png' }));
  commands.insertNode({ id: 'image', type: 'Image', version: 1, data: { assetId: asset.id, width: 80, height: 40 }, children: [] }, undefined, [asset]);
  const snapshot = document.snapshot();
  adapter.render(snapshot);
  assert.equal(adapter.getNode('image').url, resources.resolve(asset.id));
  const roundTrip = adapter.readInteraction(snapshot);
  assert.equal(Object.keys(roundTrip.assets).length, 1);
  assert.equal(roundTrip.nodes[0].data.assetId, asset.id);
  assert.equal(roundTrip.nodes[0].data.url, undefined);
  assert.deepEqual(structuredClone(roundTrip.nodes), snapshot.nodes);
});

test('image filter projection preserves the embedded asset and filter settings', async () => {
  const { document, commands, resources, adapter } = createNodeProjection();
  const asset = await resources.prepare(new Blob(['filtered-image'], { type: 'image/png' }));
  commands.insertNode({
    id: 'filtered-image', type: 'Image', version: 1,
    data: { assetId: asset.id, width: 80, height: 40, imageFilters: { exposure: 0.4, contrast: 0, saturation: -0.2 } },
    children: [],
  }, undefined, [asset]);

  const snapshot = document.snapshot();
  adapter.render(snapshot);
  const view = adapter.getNode('filtered-image');
  assert.equal(view.fill.type, 'image');
  assert.equal(view.fill.url, resources.resolve(asset.id));
  assert.deepEqual(structuredClone(view.fill.filter), [
    { type: 'exposure', value: 0.4 },
    { type: 'saturation', value: -0.2 },
  ]);

  const roundTrip = adapter.readInteraction(snapshot);
  assert.equal(roundTrip.nodes[0].data.assetId, asset.id);
  assert.equal(roundTrip.nodes[0].data.imageFilters.exposure, 0.4);
  assert.equal(roundTrip.nodes[0].data.imageFilters.saturation, -0.2);
  assert.equal(roundTrip.nodes[0].data.fill, undefined);
  assert.equal(Object.keys(roundTrip.assets).length, 1);
});

test('video node projection preserves its asset but not transient playback state', async () => {
  const { document, commands, resources, adapter } = createNodeProjection();
  const asset = await resources.prepare(new Blob(['video-content'], { type: 'video/mp4' }));
  commands.insertNode({
    id: 'video', type: 'Video', version: 1,
    data: { assetId: asset.id, width: 640, height: 360, muted: true, loop: false },
    children: [],
  }, undefined, [asset]);

  const snapshot = document.snapshot();
  adapter.render(snapshot);
  const view = adapter.getNode('video');
  assert.equal(view.tag, 'Video');
  assert.equal(view.url, `${resources.resolve(asset.id)}#video`);
  view.currentTime = 3;
  view.paused = false;

  const roundTrip = adapter.readInteraction(snapshot);
  assert.equal(roundTrip.nodes[0].data.assetId, asset.id);
  assert.equal(roundTrip.nodes[0].data.muted, true);
  assert.equal(roundTrip.nodes[0].data.currentTime, undefined);
  assert.equal(roundTrip.nodes[0].data.paused, undefined);
  assert.equal(Object.keys(roundTrip.assets).length, 1);
});

test('audio projection preserves media metadata and hides its visual children', async () => {
  const { document, commands, resources, adapter } = createNodeProjection();
  const asset = await resources.prepare(new Blob(['audio-content'], { type: 'audio/mpeg' }));
  commands.insertNode({ id: 'audio', type: 'Audio', version: 1, data: { assetId: asset.id, name: 'Track', width: 240, height: 64 }, children: [] }, undefined, [asset]);
  const snapshot = document.snapshot();
  adapter.render(snapshot);
  const roundTrip = adapter.readInteraction(snapshot);
  assert.equal(roundTrip.nodes[0].type, 'Audio');
  assert.equal(roundTrip.nodes[0].children.length, 0);
  assert.equal(roundTrip.nodes[0].data.assetId, asset.id);
  assert.equal(adapter.getNode('audio').children.length, 2);
});

test('node types apply defaults and reject invalid creation without changing the document', () => {
  const { document, nodeTypes, commands } = createDocumentRuntime();
  const contribution = {
    type: 'example.card', version: 3, label: 'Card', pluginId: 'example', defaults: { title: 'Untitled', width: 120 },
    validate(data) { if (typeof data.title !== 'string') throw new Error('Invalid title'); },
    render: () => ({ tag: 'Group' }),
  };
  let changes = 0;
  nodeTypes.subscribe(() => changes++);
  const release = nodeTypes.register(contribution);
  const id = commands.createNode('example.card', { title: 'Created' });
  assert.equal(document.getNode(id).version, 3);
  assert.equal(document.getNode(id).data.width, 120);
  assert.equal(document.getNode(id).data.title, 'Created');
  const revision = document.revision;
  assert.throws(() => commands.createNode('example.card', { title: 12 }), /Invalid title/);
  assert.equal(document.revision, revision);
  assert.throws(() => nodeTypes.register(contribution), /already registered/);
  assert.equal(nodeTypes.get('example.card', 1), undefined);
  nodeTypes.unregisterByPlugin('example');
  assert.equal(changes, 2);
  nodeTypes.register(contribution);
  release();
  assert.equal(nodeTypes.get('example.card'), contribution);
  const stop = nodeTypes.subscribe(() => {
    if (nodeTypes.get('example.failed')) throw new Error('Renderer rejected type');
  });
  assert.throws(() => nodeTypes.register({ ...contribution, type: 'example.failed' }), /Renderer rejected type/);
  assert.equal(nodeTypes.get('example.failed'), undefined);
  stop();
});

function createNodeProjection() {
  let runtimeId = 0;
  class View {
    constructor(data = {}) {
      const { children = [], ...properties } = structuredClone(data);
      Object.assign(this, properties);
      this.innerId = ++runtimeId;
      this.children = [];
      children.forEach(child => this.add(child));
    }
    add(data) {
      const child = data instanceof View ? data : new View(data);
      child.parent = this;
      this.children.push(child);
    }
    addAt(data, index) {
      const child = data instanceof View ? data : new View(data);
      if (child.parent) child.parent.children.splice(child.parent.children.indexOf(child), 1);
      child.parent = this;
      this.children.splice(index, 0, child);
    }
    clear() { this.children = []; }
    toJSON() {
      const data = Object.fromEntries(Object.entries(this).filter(([key]) => !['parent', 'children', 'innerId'].includes(key)));
      return { ...structuredClone(data), children: this.children.map(child => child.toJSON()) };
    }
  }
  class Connector extends View {
    setState(state) { this.state = structuredClone(state); }
    getState() { return this.state; }
  }
  const app = {
    tree: new View({ tag: 'Group' }),
    editor: { list: [], cancel() { this.list = []; }, select(nodes) { this.list = Array.isArray(nodes) ? nodes : [nodes]; } },
  };
  const imageFilters = loadModule('packages/core/src/document/image-filters.ts');
  const { LeaferDocumentAdapter } = loadModule('packages/core/src/document/leafer-document-adapter.ts', {
    '../core/connector': { Connector, createConnector: () => new Connector() },
    '../constants': { CUSTOM_DATA_PROP: '__flowCustomData' },
    '../core/group-selection': { normalizeAtomicGroups() { } },
    './image-filters': imageFilters,
    '../core/connector-labels': {
      persistConnectorLabel() { }, syncConnectorLabels() { },
      CONNECTOR_LABEL_PROP: '__connectorLabelFor',
      CONNECTOR_LABEL_OFFSET_X_PROP: '__connectorLabelOffsetX',
      CONNECTOR_LABEL_OFFSET_Y_PROP: '__connectorLabelOffsetY',
    },
  }, { structuredClone, crypto });
  const runtime = createDocumentRuntime();
  return { ...runtime, app, adapter: new LeaferDocumentAdapter(app, runtime.nodeTypes, runtime.resources) };
}

test('element state projects to custom nodes and survives connector interaction readback', () => {
  const { document, adapter } = createNodeProjection();
  const snapshot = document.snapshot();
  snapshot.nodes = [{ id: 'custom', type: 'example.unknown', version: 2, data: { visible: false, locked: true, zIndex: 5 }, children: [] }];
  snapshot.edges = [{ id: 'edge', parentId: null, from: { x: 1, y: 2 }, to: { x: 10, y: 20 }, data: { visible: false, locked: true, zIndex: 6 } }];
  adapter.render(snapshot);
  assert.equal(adapter.getNode('custom').visible, false);
  assert.equal(adapter.getNode('custom').locked, true);
  assert.equal(adapter.getNode('custom').zIndex, 5);
  assert.equal(adapter.getNode('edge').locked, true);
  const roundTrip = adapter.readInteraction(snapshot);
  assert.equal(roundTrip.edges[0].data.visible, false);
  assert.equal(roundTrip.edges[0].data.locked, true);
  assert.equal(roundTrip.edges[0].data.zIndex, 6);
});

test('document grouping and ungrouping preserve positions, order and nested connector geometry', () => {
  const { document, commands } = createDocumentRuntime();
  commands.insertNode({ id: 'a', type: 'Rect', version: 1, data: { x: 100, y: 80, width: 40, height: 30, zIndex: 0 }, children: [] });
  commands.insertNode({ id: 'b', type: 'Rect', version: 1, data: { x: 220, y: 160, width: 60, height: 40, zIndex: 1 }, children: [] });
  commands.insertEdge({ id: 'wire', parentId: null, from: { nodeId: 'a', port: {} }, to: { nodeId: 'b', port: {} }, data: { waypoints: [{ x: 180, y: 120 }] } });
  const grouped = commands.groupElements(['a', 'b']);
  const group = document.getNode(grouped.id);
  assert.equal(group.type, 'Group');
  assert.equal(group.data.x, 100);
  assert.equal(group.children[0].data.x, 0);
  assert.equal(group.children[1].data.x, 120);
  assert.equal(document.snapshot().edges[0].parentId, grouped.id);
  assert.equal(document.snapshot().edges[0].data.waypoints[0].x, 80);
  const ungrouped = commands.ungroupElements([grouped.id]);
  assert.equal(ungrouped.ids.length, 2);
  assert.equal(document.getNode('a').data.x, 100);
  assert.equal(document.getNode('b').data.y, 160);
  assert.equal(document.snapshot().edges[0].parentId, null);
  assert.equal(document.snapshot().edges[0].data.waypoints[0].x, 180);
});

test('document clipboard remaps nested ids, connector bindings, labels and retained assets', async () => {
  const { document, commands, resources, clipboard } = createDocumentRuntime();
  const asset = await resources.prepare(new Blob(['copy image'], { type: 'image/png' }));
  commands.insertNode({
    id: 'group', type: 'Group', version: 1, data: { x: 10, y: 20 }, children: [
      { id: 'image', type: 'Image', version: 1, data: { assetId: asset.id, x: 0, y: 0 }, children: [] },
      { id: 'target', type: 'Rect', version: 1, data: { x: 100, y: 50 }, children: [] },
      { id: 'label', type: 'Text', version: 1, data: { text: 'bind' }, children: [] },
    ]
  }, undefined, [asset]);
  document.transact('Add edge and label binding', draft => {
    draft.edges.push({ id: 'edge', parentId: 'group', from: { nodeId: 'image', port: {} }, to: { nodeId: 'target', port: {} }, data: {} });
    draft.nodes[0].children.find(node => node.id === 'label').label = { edgeId: 'edge', offsetX: 3, offsetY: 4 };
  });
  assert.equal(clipboard.copy(['group']), 5);
  commands.cutElements(['group']);
  assert.equal(document.snapshot().nodes.length, 0);
  const pasted = clipboard.paste();
  assert.equal(pasted.length, 1);
  const clone = document.getNode(pasted[0]);
  assert.notEqual(clone.id, 'group');
  const copiedImage = clone.children.find(node => node.type === 'Image');
  const copiedTarget = clone.children.find(node => node.type === 'Rect');
  const copiedLabel = clone.children.find(node => node.type === 'Text');
  const copiedEdge = document.snapshot().edges[0];
  assert.equal(copiedImage.data.assetId, asset.id);
  assert.equal(copiedEdge.parentId, clone.id);
  assert.equal(copiedEdge.from.nodeId, copiedImage.id);
  assert.equal(copiedEdge.to.nodeId, copiedTarget.id);
  assert.equal(copiedLabel.label.edgeId, copiedEdge.id);
  assert.ok(resources.resolve(asset.id).startsWith('blob:'));
});

test('document cut remains undoable while clipboard retains resources for a later paste', async () => {
  const { document, commands, resources, clipboard } = createDocumentRuntime();
  const { HistoryManager } = loadModule('packages/core/src/core/history.ts');
  const history = new HistoryManager(document);
  const asset = await resources.prepare(new Blob(['undo clipboard'], { type: 'image/png' }));
  commands.insertNode({ id: 'image', type: 'Image', version: 1, data: { assetId: asset.id }, children: [] }, undefined, [asset]);
  commands.cutElements(['image']);
  assert.equal(document.getNode('image'), undefined);
  assert.equal(resources.pruneUnused(), 0);
  history.undo();
  assert.equal(document.getNode('image').data.assetId, asset.id);
  commands.cutElements(['image']);
  history.undo();
  history.redo();
  const ids = clipboard.paste();
  assert.equal(ids.length, 1);
  assert.equal(document.getNode(ids[0]).data.assetId, asset.id);
  assert.ok(resources.resolve(asset.id).startsWith('blob:'));
});

test('presentation updates persist nested shape styles and flow-node text through history', () => {
  const { document, commands } = createDocumentRuntime();
  const { HistoryManager } = loadModule('packages/core/src/core/history.ts');
  const history = new HistoryManager(document);
  commands.insertNode({
    id: 'group', type: 'Group', version: 1, data: {}, children: [
      { id: 'shape', type: 'Rect', version: 1, data: { fill: '#fff', stroke: '#000' }, children: [] },
      { id: 'text', type: 'Text', version: 1, data: { text: 'before', fontSize: 12, fill: '#333' }, children: [] },
    ]
  });
  const flowId = commands.createNode('leafer-flow.flow-node', { text: 'Flow before' });
  commands.updatePresentation(['group', flowId], {
    fill: '#abcdef', stroke: '#123456', text: 'after', text_color: '#ff0000', font_size: 18,
  });
  assert.equal(document.getNode('shape').data.fill, '#abcdef');
  assert.equal(document.getNode('text').data.text, 'after');
  assert.equal(document.getNode(flowId).data.text, 'after');
  assert.equal(document.getNode(flowId).data.textColor, '#ff0000');
  history.undo();
  assert.equal(document.getNode('shape').data.fill, '#fff');
  assert.equal(document.getNode('text').data.text, 'before');
  assert.equal(document.getNode(flowId).data.text, 'Flow before');
});

test('format painter reads and applies document styles instead of mutating Leafer nodes', () => {
  const { document, commands, nodeTypes, resources, clipboard } = createDocumentRuntime();
  commands.insertNode({
    id: 'source', type: 'Group', version: 1, data: {}, children: [
      { id: 'source-shape', type: 'Rect', version: 1, data: { fill: '#abcdef', stroke: '#111111', strokeWidth: 3 }, children: [] },
      { id: 'source-text', type: 'Text', version: 1, data: { text: 'Source', fontSize: 16, fontWeight: 'bold', fill: '#222222' }, children: [] },
    ]
  });
  commands.insertNode({
    id: 'target', type: 'Group', version: 1, data: {}, children: [
      { id: 'target-shape', type: 'Rect', version: 1, data: { fill: '#ffffff', stroke: '#000000' }, children: [] },
      { id: 'target-text', type: 'Text', version: 1, data: { text: 'Target', fontSize: 12 }, children: [] },
    ]
  });
  const runtime = new Map([['source', {}], ['target', {}]]);
  const editor = {
    app: { editor: { list: [] } },
    document,
    renderer: { getId: value => value === runtime.get('source') ? 'source' : 'target' },
    documentCommands: commands,
  };
  const painter = loadModule('packages/core/src/action/do-format-painter.ts', {
    '../document/model': {},
    '../editor': {},
    '../core/builtin-node-types': { FLOW_NODE_DOCUMENT_TYPE: 'leafer-flow.flow-node' },
  });
  editor.app.editor.list = [runtime.get('source')];
  assert.equal(painter.doFormatPainterCopy(editor).success, true);
  editor.app.editor.list = [runtime.get('target')];
  assert.equal(painter.doFormatPainterApply(editor).success, true);
  assert.equal(document.getNode('target-shape').data.fill, '#abcdef');
  assert.equal(document.getNode('target-shape').data.stroke, '#111111');
  assert.equal(document.getNode('target-text').data.text, 'Target');
  assert.equal(document.getNode('target-text').data.fontSize, 16);
});

test('connector labels and waypoints are document data and undo as operations', () => {
  const { document, commands } = createDocumentRuntime();
  const { HistoryManager } = loadModule('packages/core/src/core/history.ts');
  const history = new HistoryManager(document);
  commands.insertNode({ id: 'from', type: 'Rect', version: 1, data: { x: 10, y: 20, width: 40, height: 20 }, children: [] });
  commands.insertNode({ id: 'to', type: 'Rect', version: 1, data: { x: 100, y: 60, width: 30, height: 20 }, children: [] });
  commands.insertEdge({ id: 'edge', parentId: null, from: { nodeId: 'from', port: { side: 'right', percent: 0.5 } }, to: { nodeId: 'to', port: { side: 'left', percent: 0.5 } }, data: {} });
  const labelId = commands.addConnectorLabel('edge');
  assert.equal(document.getNode(labelId).label.edgeId, 'edge');
  assert.equal(document.getNode(labelId).data.x, 57);
  assert.equal(commands.addConnectorLabel('edge'), labelId);
  assert.equal(document.snapshot().nodes.length, 3);
  commands.addConnectorWaypoint('edge', { x: 60, y: 45 });
  assert.equal(document.snapshot().edges[0].data.waypoints[0].x, 60);
  commands.removeConnectorWaypoints('edge');
  assert.equal(document.snapshot().edges[0].data.waypoints, undefined);
  history.undo();
  assert.equal(document.snapshot().edges[0].data.waypoints[0].x, 60);
  history.undo();
  assert.equal(document.snapshot().edges[0].data.waypoints, undefined);
  assert.equal(document.getNode(labelId).label.edgeId, 'edge');
});

test('new node connectors use dynamic side ports by default', () => {
  const { DrawArrow } = loadModule('packages/core/src/tools/draw-arrow.ts', {
    leafer: { PointerEvent: {} },
    '../core/connector': { Connector: class Connector { } },
    '../core/drawing-settings': { getConnectorRouteType: () => 'orthogonal' },
    './draw-base': { DrawBase: class DrawBase { } },
  });
  const targetOption = new DrawArrow().getTargetOption();
  assert.equal(targetOption.side, 'auto');
  assert.equal(targetOption.percent, 0.5);
});

test('node projection preserves unknown node data and logical children through placeholder interactions', () => {
  const { document, adapter } = createNodeProjection();
  const snapshot = document.snapshot();
  snapshot.nodes = [{
    id: 'custom', type: 'example.unknown', version: 4,
    data: { x: 12, y: 18, metadata: { retained: true }, title: 'Original' },
    children: [{ id: 'nested', type: 'Rect', version: 1, data: { width: 10, height: 12 }, children: [] }],
  }];
  adapter.render(snapshot);
  const view = adapter.getNode('custom');
  assert.equal(view.tag, 'Group');
  assert.equal(view.children.length, 3);
  assert.equal(adapter.getId(view.children[0]), 'custom');
  assert.equal(adapter.getId(view.children[2]), 'nested');
  assert.equal(JSON.stringify(adapter.readInteraction(snapshot).nodes), JSON.stringify(snapshot.nodes));
  view.x = 35;
  const moved = adapter.readInteraction(snapshot);
  assert.equal(moved.nodes[0].data.x, 35);
  adapter.acceptInteraction(moved);
  view.x = 12;
  const returned = adapter.readInteraction(moved);
  assert.equal(returned.nodes[0].data.x, 12);
  assert.equal(returned.nodes[0].data.title, 'Original');
  assert.equal(returned.nodes[0].children.length, 1);
});

test('node projection restores registered types without persisting visual implementation children', () => {
  const { document, nodeTypes, adapter } = createNodeProjection();
  const snapshot = document.snapshot();
  snapshot.nodes = [{ id: 'card', type: 'example.card', version: 2, data: { title: 'Business data' }, children: [] }];
  adapter.render(snapshot);
  const release = nodeTypes.register({
    type: 'example.card', version: 2, label: 'Card', pluginId: 'example',
    render: node => ({
      tag: 'Group', name: 'Registered card', children: [
        { tag: 'Rect', width: 120, height: 60 }, { tag: 'Text', text: node.data.title },
      ]
    }),
  });
  adapter.render(snapshot);
  assert.equal(adapter.getNode('card').name, 'Registered card');
  assert.equal(adapter.getNode('card').children.length, 2);
  const projected = adapter.readInteraction(snapshot);
  assert.equal(projected.nodes[0].children.length, 0);
  assert.equal(JSON.stringify(projected.nodes), JSON.stringify(snapshot.nodes));
  release();
  adapter.render(snapshot);
  assert.equal(adapter.getNode('card').name, 'example.card');
  assert.equal(JSON.stringify(adapter.readInteraction(snapshot).nodes), JSON.stringify(snapshot.nodes));
});

test('document z-index projection interleaves nodes and connectors in the same Leafer parent', () => {
  const { adapter } = createNodeProjection();
  const document = createDocumentRuntime().document.snapshot();
  document.nodes = [
    { id: 'back', type: 'Rect', version: 1, data: { zIndex: 0 }, children: [] },
    { id: 'front', type: 'Rect', version: 1, data: { zIndex: 2 }, children: [] },
  ];
  document.edges = [{ id: 'middle', parentId: null, from: { x: 0, y: 0 }, to: { x: 1, y: 1 }, data: { zIndex: 1 } }];
  adapter.render(document);
  assert.equal(adapter.app.tree.children.map(child => adapter.getId(child)).join(','), 'back,middle,front');
});

test('document transactions validate references and discard failed edits', () => {
  const { document, commands } = createDocumentRuntime();
  commands.insertNode({ id: 'node', type: 'Rect', version: 1, data: { fill: 'red' }, children: [] });
  const revision = document.revision;
  const copy = document.snapshot();
  copy.nodes[0].data.fill = 'blue';
  assert.equal(document.snapshot().nodes[0].data.fill, 'red');
  assert.throws(() => document.transact('invalid', draft => {
    draft.nodes[0].data.fill = 'blue';
    draft.edges.push({ id: 'edge', parentId: null, from: { nodeId: 'missing', port: {} }, to: { x: 1, y: 1 }, data: {} });
  }), /Missing endpoint/);
  assert.equal(document.revision, revision);
  assert.equal(document.snapshot().nodes[0].data.fill, 'red');
  assert.throws(() => document.replace({ schema: 'leafer-flow.document', version: 1 }, 'load', 'old format'), /Unsupported document/);
  assert.throws(() => document.transact('async', async () => { }), /must be synchronous/);
});

test('document transactions synchronize runtime state before applying property updates', () => {
  const { document, commands } = createDocumentRuntime();
  commands.insertNode({ id: 'node', type: 'Rect', version: 1, data: { x: 10, fill: 'red' }, children: [] });
  document.setBeforeTransaction(() => {
    const current = document.snapshot();
    current.nodes[0].data.x = 40;
    document.replace(current, 'interaction', 'Canvas interaction');
  });

  commands.updateNode('node', { fill: 'blue' });

  assert.equal(document.getNode('node').data.x, 40);
  assert.equal(document.getNode('node').data.fill, 'blue');
});

test('document projection failure restores the previous state without publishing', () => {
  const { document, commands } = createDocumentRuntime();
  commands.insertNode({ id: 'node', type: 'Rect', version: 1, data: { fill: 'red' }, children: [] });
  let published = 0;
  let rendered;
  document.subscribe(() => published++);
  document.connect({
    apply(snapshot) {
      if (snapshot.nodes[0].data.fill === 'blue') throw new Error('render failed');
      rendered = snapshot.nodes[0].data.fill;
    }
  });
  assert.throws(() => commands.updateNode('node', { fill: 'blue' }), /render failed/);
  assert.equal(document.snapshot().nodes[0].data.fill, 'red');
  assert.equal(rendered, 'red');
  assert.equal(published, 0);
});

test('document removal cascades through descendants, edges and labels', () => {
  const { document, commands } = createDocumentRuntime();
  commands.insertNode({
    id: 'group', type: 'Group', version: 1, data: {}, children: [
      { id: 'child', type: 'Rect', version: 1, data: {}, children: [] },
    ]
  });
  commands.insertEdge({ id: 'edge', parentId: null, from: { nodeId: 'child', port: {} }, to: { x: 1, y: 1 }, data: {} });
  commands.insertNode({ id: 'label', type: 'Text', version: 1, data: { text: 'label' }, children: [], label: { edgeId: 'edge', offsetX: 0, offsetY: 0 } });
  commands.remove(['group']);
  assert.equal(document.snapshot().nodes.length, 0);
  assert.equal(document.snapshot().edges.length, 0);
});

test('document history observes commits, restores settings and resets on load', () => {
  const { document, commands } = createDocumentRuntime();
  const { HistoryManager } = loadModule('packages/core/src/core/history.ts');
  const history = new HistoryManager(document);
  commands.insertNode({ id: 'node', type: 'Rect', version: 1, data: {}, children: [] });
  commands.updateSettings({ route: 'bezier' });
  assert.equal(history.undoCount, 3);
  history.undo();
  assert.equal(document.snapshot().settings.route, undefined);
  history.redo();
  assert.equal(document.snapshot().settings.route, 'bezier');
  const loaded = document.snapshot();
  loaded.id = 'another-document';
  document.replace(loaded, 'load', 'Open document');
  assert.equal(history.undoCount, 1);
  assert.equal(history.canUndo, false);
});

test('history records style, text, nested data and subpixel changes', () => {
  const state = createHistory([{ tag: 'Group', x: 0, children: [{ text: 'before', fill: 'red' }] }]);
  state.children[0].children[0].fill = 'blue';
  state.history.save();
  state.children[0].children[0].text = 'after';
  state.history.save();
  state.children[0].x = 0.1;
  state.history.save();
  assert.equal(state.history.undoCount, 4);
  state.history.save();
  assert.equal(state.history.undoCount, 4);
  state.history.undo();
  assert.equal(state.children[0].x, 0);
  state.history.undo();
  assert.equal(state.children[0].children[0].text, 'before');
  state.history.undo();
  assert.equal(state.children[0].children[0].fill, 'red');
  state.history.redo();
  assert.equal(state.children[0].children[0].fill, 'blue');
});

test('history distinguishes changes with equal position sums', () => {
  const state = createHistory([{ x: 10, y: 20 }, { x: 30, y: 40 }]);
  state.children[0].x += 5;
  state.children[1].x -= 5;
  state.history.save();
  assert.equal(state.history.undoCount, 2);
});

test('history restores its execution state and stacks after a failed restore', () => {
  const state = createHistory([{ x: 0 }]);
  state.children[0].x = 1;
  state.history.save();
  state.failRestore = true;
  assert.throws(() => state.history.undo(), /restore failed/);
  assert.equal(state.history.undoCount, 2);
  assert.equal(state.history.redoCount, 0);
  state.children[0].x = 2;
  state.history.save();
  assert.equal(state.history.undoCount, 3);
  state.failRestore = false;
  state.history.undo();
  state.failRestore = true;
  assert.throws(() => state.history.redo(), /restore failed/);
  assert.equal(state.history.redoCount, 1);
  assert.throws(() => state.history.jumpTo(0), /restore failed/);
  assert.equal(state.history.undoCount, 2);
});

test('nested history batches commit once', () => {
  const state = createHistory([{ x: 0 }]);
  state.history.beginTransaction();
  state.history.beginTransaction();
  state.children[0].x = 1;
  state.history.save();
  state.history.endTransaction();
  assert.equal(state.history.undoCount, 1);
  state.history.endTransaction();
  assert.equal(state.history.undoCount, 2);
});

function loadAgentTools() {
  return loadModule('packages/builtin-plugins/src/builtin/plugins/agent/agent-tools.ts', {
    '@leafer-flow/core/constants': { ACTION_NAME: {}, TOOL_NAME: { DRAW_RECT: 'rect' } },
    '../../../templates/defs': {},
    '../../../templates/insert': {},
    '../../templates/registry': {},
    './agent-skills': loadModule('packages/builtin-plugins/src/builtin/plugins/agent/agent-skills.ts'),
    './agent-question': loadModule('packages/builtin-plugins/src/builtin/plugins/agent/agent-question.ts'),
  }, { crypto });
}

function loadMcpBrowser(globals = {}, toolModule = loadAgentTools()) {
  return loadModule('packages/builtin-plugins/src/builtin/plugins/agent/mcp-bridge.ts', {
    '@leafer-flow/mcp/protocol': loadModule('packages/mcp/src/protocol.ts'),
    './agent-tools': toolModule,
  }, { AbortController, crypto, TextEncoder, setTimeout, clearTimeout, ...globals });
}

test('MCP browser exposes only granted tools and requires explicit document targets', async () => {
  const { getMcpToolDescriptors, executeMcpRequest } = loadMcpBrowser();
  assert.equal(getMcpToolDescriptors(false).length, 3);
  assert.equal(getMcpToolDescriptors(true).length, 8);
  assert.ok(getMcpToolDescriptors(true).find(tool => tool.name === 'set_style').inputSchema.required.includes('ids'));
  assert.equal(getMcpToolDescriptors(true).some(tool => tool.name === 'clear_canvas'), false);
  let depth = 0;
  let mutations = 0;
  const editor = {
    app: { tree: { children: [], scaleX: 1 }, editor: { list: [] } },
    document: { snapshot: () => ({ id: 'document', nodes: [], edges: [] }) },
    beginTransaction() { depth++; }, endTransaction() { depth--; },
    createElementFromTool() { mutations++; return {}; }, renderer: { getId: () => `created-${mutations}` },
  };
  const request = (name, args = {}) => ({ type: 'request', id: 'request', kind: 'tool', name, arguments: args });
  const signal = new AbortController().signal;
  assert.equal((await executeMcpRequest(editor, request('create_shape', { shape_type: 'rect' }), false, signal)).success, false);
  assert.equal((await executeMcpRequest(editor, request('clear_canvas'), true, signal)).success, false);
  assert.equal((await executeMcpRequest(editor, request('modify_text', { text: 'wrong target' }), true, signal)).success, false);
  assert.equal((await executeMcpRequest(editor, request('batch_create_shapes', { shape_type: 'rect', count: -1 }), true, signal)).success, false);
  assert.equal(mutations, 0);
  const created = await executeMcpRequest(editor, request('batch_create_shapes', { shape_type: 'rect', count: 2 }), true, signal);
  assert.equal(created.success, true);
  assert.equal(mutations, 2);
  assert.equal(depth, 0);
  const cancelled = new AbortController(); cancelled.abort();
  assert.equal((await executeMcpRequest(editor, request('create_shape', { shape_type: 'rect' }), true, cancelled.signal)).success, false);
  assert.equal(mutations, 2);
  const document = await executeMcpRequest(editor, { ...request('document'), kind: 'resource' }, false, signal);
  assert.equal(JSON.parse(document.result).id, 'document');
});

test('MCP browser closes on document changes and discards queued edits after disconnect', async () => {
  let socket;
  class FakeSocket {
    static OPEN = 1;
    readyState = 1;
    sent = [];
    constructor() { socket = this; }
    send(value) { this.sent.push(JSON.parse(value)); }
    close() { this.readyState = 3; }
  }
  let documentId = 'original';
  let listener;
  let depth = 0;
  let mutations = 0;
  let release;
  let started;
  const began = new Promise(resolve => { started = resolve; });
  const { EditorMcpBridge } = loadMcpBrowser({ WebSocket: FakeSocket }, {
    getAgentTools: () => [{
      name: 'create_shape', description: 'test', parameters: { type: 'object', properties: {} },
      execute: async () => { mutations++; started(); await new Promise(resolve => { release = resolve; }); return 'created'; },
    }], validateToolArguments() { },
  });
  const statuses = [];
  const bridge = new EditorMcpBridge({
    document: { snapshot: () => ({ id: documentId }), subscribe(callback) { listener = callback; return () => { listener = undefined; }; } },
    beginTransaction() { depth++; }, endTransaction() { depth--; },
  }, (...status) => statuses.push(status));
  bridge.connect({ port: 4318, token: 'mcp-test-token-not-a-real-secret-123456', allowWrite: true });
  socket.onopen();
  socket.onmessage({ data: JSON.stringify({ type: 'ready', sessionId: socket.sent[0].session.id }) });
  assert.equal(statuses.at(-1)[0], 'connected');
  for (const id of ['first', 'second']) socket.onmessage({ data: JSON.stringify({ type: 'request', id, kind: 'tool', name: 'create_shape', arguments: {} }) });
  await began;
  documentId = 'another'; listener();
  assert.equal(statuses.at(-1)[0], 'disconnected');
  assert.equal(listener, undefined);
  release(); await bridge.queue;
  assert.equal(mutations, 1);
  assert.equal(depth, 0);
  assert.equal(socket.sent.filter(message => message.type === 'result').length, 0);
});

function createAgentService(globals = {}, toolModule = { getAgentTools: () => [] }) {
  const { AgentService, parseToolResult } = loadModule('packages/builtin-plugins/src/builtin/plugins/agent/agent-service.ts', {
    './agent-config': { isConfigValid: () => true, getApiEndpoint: () => 'https://example.test/chat/completions' },
    './agent-tools': toolModule,
    './agent-client': { requestChat: (...args) => service.requestChat(...args) },
    './agent-question': loadModule('packages/builtin-plugins/src/builtin/plugins/agent/agent-question.ts'),
  }, { AbortController, AbortSignal, structuredClone, TextDecoder, ...globals });
  const service = new AgentService({ beginTransaction() { }, endTransaction() { } }, { maxHistoryMessages: 6 });
  service.getCanvasContext = () => '';
  service.parseToolResult = parseToolResult;
  return service;
}

function loadAgentClient(globals) {
  return loadModule('packages/builtin-plugins/src/builtin/plugins/agent/agent-client.ts', {
    './agent-config': { getApiEndpoint: config => config.provider === 'anthropic' ? 'https://example.test/messages' : 'https://example.test/chat/completions' },
    './agent-anthropic': loadModule('packages/builtin-plugins/src/builtin/plugins/agent/agent-anthropic.ts', {}, globals),
  }, globals);
}

test('agent stream flushes final SSE data and rejects truncated or invalid responses', async () => {
  for (const [body, valid] of [
    ['data:{"choices":[{"delta":{"content":"ok"}}]}\r\n\r\ndata:[DONE]', true],
    ['data: {"choices":[{"delta":{"content":"partial"}}]}\n', false],
    ['data: invalid\ndata: [DONE]\n', false],
  ]) {
    let signal;
    const { requestChat } = loadAgentClient({ AbortSignal, TextDecoder, fetch: async (_url, init) => { signal = init.signal; return new Response(body); } });
    const response = requestChat({}, [], { signal: new AbortController().signal, onToken() { } });
    if (valid) assert.equal((await response).content, 'ok');
    else await assert.rejects(response);
    assert.ok(signal instanceof AbortSignal);
  }
});

test('agent capability probe requires a real schema-compliant tool call without editing the canvas', async () => {
  for (const [toolCalls, valid] of [
    [[], false],
    [[{ id: 'probe', type: 'function', function: { name: 'verify_tool_call', arguments: '{}' } }], true],
    [[{ id: 'probe', type: 'function', function: { name: 'other', arguments: '{}' } }], false],
    [[{ id: 'probe', type: 'function', function: { name: 'verify_tool_call', arguments: '{' } }], false],
    [[{ id: 'probe', type: 'function', function: { name: 'verify_tool_call', arguments: '{"unexpected":1}' } }], false],
  ]) {
    const { testToolCalling } = loadAgentClient({
      AbortSignal, fetch: async (_url, init) => {
        const request = JSON.parse(init.body);
        assert.equal(request.tool_choice, 'required');
        assert.equal(request.stream, false);
        assert.equal(request.tools.length, 1);
        assert.equal(request.tools[0].function.name, 'verify_tool_call');
        return Response.json({ choices: [{ message: { content: '[工具执行] 成功', tool_calls: toolCalls } }] });
      }
    });
    const probe = testToolCalling({}, new AbortController().signal);
    if (valid) await probe;
    else await assert.rejects(probe);
  }
});

test('agent Claude translates history, tool errors and required choice into Messages API', async () => {
  const { requestChat } = loadAgentClient({
    AbortSignal, fetch: async (url, init) => {
      assert.equal(url, 'https://example.test/messages');
      assert.equal(init.headers['x-api-key'], 'test-key');
      assert.equal(init.headers.Authorization, undefined);
      assert.equal(init.headers['anthropic-version'], '2023-06-01');
      const body = JSON.parse(init.body);
      assert.equal(body.system, 'system');
      assert.equal(body.tool_choice.type, 'any');
      assert.equal(body.tools[0].input_schema.type, 'object');
      assert.equal(body.messages.length, 3);
      assert.equal(body.messages[1].content[0].type, 'tool_use');
      assert.equal(body.messages[2].content.length, 2);
      assert.equal(body.messages[2].content[0].is_error, true);
      assert.equal(body.messages[2].content[1].is_error, false);
      return Response.json({
        stop_reason: 'tool_use', content: [
          { type: 'text', text: '查询画布' },
          { type: 'tool_use', id: 'next', name: 'get_canvas_info', input: {} },
        ]
      });
    }
  });
  const reply = await requestChat({ provider: 'anthropic', apiKey: 'test-key', model: 'test' }, [
    { role: 'system', content: 'system' }, { role: 'user', content: 'question' },
    { role: 'assistant', content: '', tool_calls: ['a', 'b'].map(id => ({ id, type: 'function', function: { name: 'test', arguments: '{}' } })) },
    { role: 'tool', tool_call_id: 'a', content: JSON.stringify({ success: false }) },
    { role: 'tool', tool_call_id: 'b', content: JSON.stringify({ success: true }) },
  ], { signal: new AbortController().signal, toolChoice: 'required', tools: [{ type: 'function', function: { name: 'test', description: 'test', parameters: { type: 'object', properties: {} } } }] });
  assert.equal(reply.content, '查询画布');
  assert.equal(reply.toolCalls[0].function.arguments, '{}');
  assert.equal(reply.toolCalls[0].function.name, 'get_canvas_info');
});

test('agent Claude streams text and JSON tool arguments and rejects incomplete responses', async () => {
  const events = [
    { type: 'content_block_delta', index: 0, delta: { type: 'text_delta', text: '处理中' } },
    { type: 'content_block_start', index: 1, content_block: { type: 'tool_use', id: 'a', name: 'test', input: {} } },
    { type: 'content_block_delta', index: 1, delta: { type: 'input_json_delta', partial_json: '{"count":' } },
    { type: 'content_block_delta', index: 1, delta: { type: 'input_json_delta', partial_json: '2}' } },
    { type: 'message_delta', delta: { stop_reason: 'tool_use' } },
    { type: 'message_stop' },
  ];
  for (const [responseEvents, valid] of [
    [events, true],
    [events.slice(0, -1), false],
    [[...events.slice(0, -2), { type: 'message_delta', delta: { stop_reason: 'max_tokens' } }, events.at(-1)], false],
    [[{ type: 'error', error: { message: 'overloaded' } }], false],
  ]) {
    let tokens = '';
    const { requestChat } = loadAgentClient({ AbortSignal, TextDecoder, fetch: async () => new Response(responseEvents.map(event => `data: ${JSON.stringify(event)}`).join('\r\n\r\n')) });
    const pending = requestChat({ provider: 'anthropic' }, [], { signal: new AbortController().signal, onToken: token => { tokens += token; } });
    if (valid) {
      const reply = await pending;
      assert.equal(tokens, '处理中');
      assert.equal(reply.toolCalls[0].function.arguments, '{"count":2}');
    } else await assert.rejects(pending);
  }
});

test('agent Claude capability probe validates native tool use and rejects truncation', async () => {
  for (const stopReason of ['tool_use', 'max_tokens']) {
    const { testToolCalling } = loadAgentClient({
      AbortSignal, fetch: async () => Response.json({
        stop_reason: stopReason, content: [{ type: 'tool_use', id: 'probe', name: 'verify_tool_call', input: {} }],
      })
    });
    const pending = testToolCalling({ provider: 'anthropic' }, new AbortController().signal);
    if (stopReason === 'tool_use') await pending;
    else await assert.rejects(pending);
  }
});

test('agent trims complete turns, repairs pending calls and compresses a valid transcript', async () => {
  const service = createAgentService();
  const call = { id: 'a', type: 'function', function: { name: 'test', arguments: '{}' } };
  service.restoreHistory([
    { role: 'user', content: 'old' },
    { role: 'assistant', content: '', tool_calls: [call] },
    { role: 'tool', content: JSON.stringify({ name: 'test', arguments: {}, success: true, result: 'ok' }), tool_call_id: 'a' },
    { role: 'assistant', content: 'old done' },
    { role: 'user', content: 'new' },
    { role: 'assistant', content: '', tool_calls: [call] },
  ]);
  const history = service.getHistory();
  assert.equal(history[0].content, 'new');
  assert.equal(history.at(-1).role, 'tool');
  history[0].content = 'changed';
  assert.equal(service.getHistory()[0].content, 'new');
  service.restoreHistory([
    { role: 'user', content: 'old' }, { role: 'assistant', content: 'old done' },
    { role: 'user', content: 'new' }, { role: 'assistant', content: 'new done' },
  ]);
  service.requestChat = async (_config, messages, options) => {
    assert.equal(options.tools, undefined);
    assert.equal(messages.length, 2);
    assert.equal(messages[1].role, 'user');
    return { content: 'summary', toolCalls: [] };
  };
  assert.equal((await service.compressHistory()).success, true);
  assert.equal(service.getHistory()[1].content, 'new');
});

test('agent cancellation prevents late tool execution and rejects concurrent operations', async () => {
  const service = createAgentService();
  let resolve;
  let executed = 0;
  service.requestChat = () => new Promise(done => { resolve = done; });
  service.executeToolCall = async () => { executed++; };
  const pending = service.processMessage('first');
  assert.throws(() => service.clearHistory());
  await assert.rejects(service.processMessage('second'));
  service.cancel();
  resolve({ content: '', toolCalls: [{ id: 'a', type: 'function', function: { name: 'test', arguments: '{}' } }] });
  await pending;
  assert.equal(executed, 0);
  assert.equal(service.getHistory().some(message => message.content === 'second'), false);
  service.clearHistory();
  assert.equal(service.getHistory().length, 0);
});

test('agent waits for answers without holding transactions and cancels ignored question callbacks', async () => {
  const toolModule = loadAgentTools();
  const args = { question: '方向？', options: ['横向', '纵向'] };
  const questionCall = { id: 'question', type: 'function', function: { name: 'ask_user', arguments: JSON.stringify(args) } };
  for (const cancel of [false, true]) {
    const service = createAgentService({}, toolModule);
    let depth = 0;
    service.editor = { beginTransaction() { depth++; }, endTransaction() { depth--; } };
    let resolveAnswer;
    let questionOpened;
    const opened = new Promise(resolve => { questionOpened = resolve; });
    let requests = 0;
    service.requestChat = async (_config, messages) => {
      if (++requests === 1) return { content: '', toolCalls: [questionCall] };
      const toolResult = messages.filter(message => message.role === 'tool').at(-1);
      assert.equal(JSON.parse(JSON.parse(toolResult.content).result).selected[0], '横向');
      return { content: '已确认方向', toolCalls: [] };
    };
    const pending = service.processMessage('创建流程', {
      onQuestion(question) {
        assert.equal(question.question, args.question);
        assert.equal(depth, 0);
        questionOpened();
        return new Promise(resolve => { resolveAnswer = resolve; });
      }
    });
    await opened;
    assert.equal(requests, 1);
    if (cancel) service.cancel();
    else resolveAnswer({ selected: ['横向'], text: '' });
    const response = await pending;
    assert.equal(depth, 0);
    assert.equal(requests, cancel ? 1 : 2);
    assert.equal(response.toolCalls[0].success, !cancel);
    if (cancel) {
      resolveAnswer({ selected: ['横向'], text: '' });
      await Promise.resolve();
      assert.equal(requests, 1);
    }
  }
});

test('agent rejects mixed question and mutation batches before any tool executes', async () => {
  const service = createAgentService({}, loadAgentTools());
  let executions = 0;
  let requests = 0;
  service.executeToolCall = async () => { executions++; };
  service.requestChat = async () => ++requests === 1 ? {
    content: '', toolCalls: ['delete', 'ask_user'].map(name => ({
      id: name, type: 'function', function: { name, arguments: '{}' },
    }))
  } : { content: '请先确认', toolCalls: [] };
  const response = await service.processMessage('删除？');
  assert.equal(executions, 0);
  assert.equal(response.toolCalls.length, 2);
  assert.ok(response.toolCalls.every(result => !result.success));
});

test('agent panel restores model history, guards busy actions and saves only settled messages', async () => {
  const service = createAgentService();
  const config = { maxHistoryMessages: 3 };
  service.updateConfig(config);
  let release;
  service.requestChat = async (_config, messages) => {
    assert.ok(messages.some(message => message.content === 'previous question'));
    await new Promise(resolve => { release = resolve; });
    return { content: 'new answer', toolCalls: [] };
  };
  const storage = new Map([['leafer-flow.plugin.agent.history', JSON.stringify([
    { role: 'user', content: 'previous question' }, { role: 'assistant', content: 'previous answer' },
  ])]]);
  let writes = 0;
  const { useAgentChat } = loadModule('packages/builtin-plugins/src/builtin/plugins/agent/useAgentChat.ts', {
    vue: { ...uiVue, onUnmounted() { } },
    './agent-config': { loadAgentConfig: () => config, isConfigValid: () => true },
    './agent-service': { AgentService: class { constructor() { return service; } }, parseToolResult: content => service.parseToolResult(content) },
    './agent-question': loadModule('packages/builtin-plugins/src/builtin/plugins/agent/agent-question.ts'),
  }, {
    localStorage: {
      getItem: key => storage.get(key),
      setItem(key, value) { writes++; storage.set(key, value); },
    },
  });
  const panel = useAgentChat({});
  assert.equal(panel.historyCount.value, 2);
  panel.inputMessage.value = 'new question';
  const pending = panel.send();
  await uiVue.nextTick();
  panel.clear();
  await panel.compress();
  assert.equal(panel.messages.value.length, 4);
  assert.equal(writes, 0);
  release();
  await pending;
  assert.equal(panel.historyCount.value, 4);
  assert.equal(writes, 1);
  const saved = JSON.parse(storage.get('leafer-flow.plugin.agent.history'));
  assert.ok(saved.at(-1).content.endsWith('new answer'));
  assert.match(saved.at(-1).content, /未执行画布操作/);
  assert.match(panel.error.value, /未执行画布操作/);
  assert.equal(panel.messages.value.at(-1).isStreaming, undefined);
  assert.equal(panel.shouldCompress.value, true);
  panel.clear();
  assert.equal(panel.historyCount.value, 0);
});

test('agent panel validates answers, settles once and clears pending questions on cancel', async () => {
  for (const cancel of [false, true]) {
    const service = createAgentService({}, loadAgentTools());
    let questionOpened;
    const opened = new Promise(resolve => { questionOpened = resolve; });
    const execute = service.executeToolCall.bind(service);
    service.executeToolCall = async (...args) => {
      const result = execute(...args);
      await Promise.resolve();
      questionOpened();
      return result;
    };
    let requests = 0;
    service.requestChat = async () => ++requests === 1 ? {
      content: '', toolCalls: [{
        id: 'question', type: 'function', function: { name: 'ask_user', arguments: JSON.stringify({ question: '方向？', options: ['横向', '纵向'] }) },
      }]
    } : { content: '已确认', toolCalls: [] };
    let writes = 0;
    let saved;
    const { useAgentChat } = loadModule('packages/builtin-plugins/src/builtin/plugins/agent/useAgentChat.ts', {
      vue: { ...uiVue, onUnmounted() { } },
      './agent-config': { loadAgentConfig: () => ({ maxHistoryMessages: 20 }), isConfigValid: () => true },
      './agent-service': { AgentService: class { constructor() { return service; } }, parseToolResult: content => service.parseToolResult(content) },
      './agent-question': loadModule('packages/builtin-plugins/src/builtin/plugins/agent/agent-question.ts'),
    }, { localStorage: { getItem: () => null, setItem(_key, value) { writes++; saved = JSON.parse(value); } } });
    const panel = useAgentChat({});
    panel.inputMessage.value = '创建流程';
    const pending = panel.send();
    await opened;
    assert.equal(panel.pendingQuestion.value.question, '方向？');
    assert.equal(panel.isBusy.value, true);
    assert.equal(writes, 0);
    panel.answerQuestion({ selected: ['非法选项'], text: '' });
    assert.ok(panel.pendingQuestion.value);
    assert.ok(panel.error.value);
    if (cancel) panel.cancel();
    else {
      panel.answerQuestion({ selected: ['纵向'], text: '分支在右侧' });
      panel.answerQuestion({ selected: ['横向'], text: '' });
    }
    await pending;
    assert.equal(panel.pendingQuestion.value, undefined);
    assert.equal(panel.isBusy.value, false);
    assert.equal(writes, 1);
    assert.equal(requests, cancel ? 1 : 2);
    const toolResult = JSON.parse(saved.find(message => message.role === 'tool').content);
    assert.equal(toolResult.success, !cancel);
    if (!cancel) assert.equal(JSON.parse(toolResult.result).selected[0], '纵向');
  }
});

test('agent drawing guidance inspects context and does not default to templates', async () => {
  const service = createAgentService();
  service.requestChat = async (_config, messages) => {
    assert.match(messages[0].content, /开始绘制前先查询画布/);
    assert.match(messages[0].content, /模板不是默认绘制方式/);
    assert.doesNotMatch(messages[0].content, /流程图优先使用 insert_template/);
    return { content: '请确认业务步骤', toolCalls: [] };
  };
  await service.processMessage('画流程图');
  const { getAgentSkills } = loadModule('packages/builtin-plugins/src/builtin/plugins/agent/agent-skills.ts');
  const workflow = getAgentSkills().find(skill => skill.name === 'create_flowchart');
  assert.match(workflow.steps.join('\n'), /默认按用户的实际内容定制流程/);
  assert.doesNotMatch(getAgentSkills().map(skill => skill.steps.join('\n')).join('\n'), /优先.*模板|优先 insert_template/);
  const template = loadAgentTools().getAgentTools().find(tool => tool.name === 'insert_template');
  assert.match(template.description, /不能代替定制绘制/);
});

test('agent allows more than ten tool calls and returns the model summary', async () => {
  const service = createAgentService();
  let requests = 0;
  service.executeToolCall = async call => ({ name: call.function.name, arguments: {}, success: true, result: 'ok' });
  service.requestChat = async () => ++requests === 1 ? {
    content: '', toolCalls: Array.from({ length: 12 }, (_, index) => ({
      id: `tool-${index}`, type: 'function', function: { name: 'test', arguments: '{}' },
    })),
  } : { content: '完成', toolCalls: [] };
  const reply = await service.processMessage('many calls');
  assert.equal(reply.toolCalls.length, 12);
  assert.ok(reply.toolCalls.every(result => result.success));
  assert.equal(reply.content, '完成');
  assert.equal(reply.warning, undefined);
});

test('agent limits individual calls within one response and records skipped tool results', async () => {
  const service = createAgentService();
  let executed = 0;
  service.executeToolCall = async call => {
    executed++;
    return { name: call.function.name, arguments: {}, success: true, result: 'ok' };
  };
  const toolCalls = Array.from({ length: 102 }, (_, index) => ({
    id: `tool-${index}`, type: 'function', function: { name: 'test', arguments: '{}' },
  }));
  service.requestChat = async () => ({ content: '', toolCalls });
  await service.processMessage('many calls');
  assert.equal(executed, 100);
  const results = service.getHistory().filter(message => message.role === 'tool');
  assert.equal(results.length, 102);
  assert.equal(JSON.parse(results.at(-1).content).success, false);
});

test('agent stops unbounded tool rounds and can continue in a new turn', async () => {
  const service = createAgentService();
  let requests = 0;
  service.executeToolCall = async call => ({ name: call.function.name, arguments: {}, success: true, result: 'ok' });
  service.requestChat = async () => ({
    content: '', toolCalls: [{ id: `tool-${++requests}`, type: 'function', function: { name: 'test', arguments: '{}' } }],
  });
  const reply = await service.processMessage('many rounds');
  assert.equal(requests, 40);
  assert.equal(reply.toolCalls.length, 40);
  assert.match(reply.warning, /安全上限/);
  assert.match(reply.warning, /继续/);
  service.requestChat = async () => ({ content: '完成剩余任务', toolCalls: [] });
  const continued = await service.processMessage('继续');
  assert.equal(continued.content.endsWith('完成剩余任务'), true);
});

test('agent stores the final fallback reply in its single history source', async () => {
  const service = createAgentService();
  service.requestChat = async () => ({ content: '', toolCalls: [] });
  const reply = await service.processMessage('empty response');
  assert.match(reply.content, /未执行画布操作/);
  assert.doesNotMatch(reply.content, /操作完成/);
  assert.equal(service.getHistory().at(-1).content, reply.content);
});

test('agent distinguishes model claims from real tool execution and preserves failures', async () => {
  const service = createAgentService();
  service.requestChat = async () => ({ content: '[工具执行] 成功', toolCalls: [] });
  const unexecuted = await service.processMessage('create a shape');
  assert.match(unexecuted.content, /^本轮未调用编辑器工具/);
  assert.match(unexecuted.warning, /未执行画布操作/);
  assert.equal(unexecuted.toolCalls.length, 0);
  let requests = 0;
  service.requestChat = async () => ++requests === 1
    ? { content: '', toolCalls: [{ id: 'a', type: 'function', function: { name: 'missing', arguments: '{}' } }] }
    : { content: '全部完成', toolCalls: [] };
  const failed = await service.processMessage('try again');
  assert.match(failed.content, /^本轮有 1 次工具调用失败/);
  assert.equal(failed.toolCalls[0].success, false);
  assert.equal(service.getHistory().at(-1).content, failed.content);
});

test('agent batch creation balances its transaction on success and failure', () => {
  const tool = loadAgentTools().getAgentTools().find(candidate => candidate.name === 'batch_create_shapes');
  for (const fail of [false, true]) {
    let depth = 1;
    const execute = () => tool.execute({
      beginTransaction() { depth++; },
      endTransaction() { depth--; },
      createElementFromTool() { if (fail) throw new Error('failed'); return {}; },
      renderer: { getId: () => 'created-node' },
    }, { shape_type: 'rect', count: 2 });
    if (fail) assert.throws(execute);
    else execute();
    assert.equal(depth, 1);
  }
});

test('agent batch layout prevents overlap for large nodes and undersized spacing', () => {
  const tool = loadAgentTools().getAgentTools().find(candidate => candidate.name === 'batch_create_shapes');
  for (const spacing of [{}, { spacing_x: 1, spacing_y: 1 }]) {
    const positions = [];
    const result = JSON.parse(tool.execute({
      beginTransaction() { }, endTransaction() { },
      createElementFromTool(_tool, point) { positions.push(point); return {}; },
      renderer: { getId: () => `node-${positions.length}` },
    }, { shape_type: 'rect', count: 4, columns: 2, width: 300, height: 180, ...spacing }));
    assert.ok(positions[1].x - positions[0].x >= 330);
    assert.ok(positions[2].y - positions[0].y >= 208);
    assert.equal(result.layout.spacing_x, 330);
    assert.equal(result.layout.spacing_y, 208);
  }
});

test('agent catalog shares shape enums and exposes categories from the actual tools', () => {
  const { getAgentTools } = loadAgentTools();
  const tools = getAgentTools();
  assert.equal(getAgentTools(), tools);
  const single = tools.find(tool => tool.name === 'create_shape');
  const batch = tools.find(tool => tool.name === 'batch_create_shapes');
  assert.equal(JSON.stringify(single.parameters.properties.shape_type.enum), JSON.stringify(batch.parameters.properties.shape_type.enum));
  const listing = JSON.parse(tools.find(tool => tool.name === 'list_tools').execute({}, { category: 'edit' }));
  assert.ok(listing.some(tool => tool.name === 'delete'));
  assert.ok(listing.every(tool => tool.category === 'edit'));
  assert.equal(new Set(tools.map(tool => tool.name)).size, tools.length);
  const details = JSON.parse(tools.find(tool => tool.name === 'get_tool_details').execute({}, { tool_name: 'modify_text' }));
  assert.equal(details.category, 'text');
  assert.ok(details.parameters.properties.ids);
  const skills = JSON.parse(tools.find(tool => tool.name === 'list_skills').execute({}, {}));
  assert.equal(skills.length, 4);
  const skill = JSON.parse(tools.find(tool => tool.name === 'get_skill').execute({}, { name: 'create_flowchart' }));
  assert.ok(skill.tools.includes('batch_create_shapes'));
  assert.ok(skill.steps.length > 0);
  assert.throws(() => tools.find(tool => tool.name === 'get_skill').execute({}, { name: 'missing' }));
});

test('agent validates tool arguments and rejects failed commands', async () => {
  const { getAgentTools, validateToolArguments } = loadAgentTools();
  const tools = getAgentTools();
  const batch = tools.find(tool => tool.name === 'batch_create_shapes');
  for (const args of [{ count: 2 }, { shape_type: 'rect', count: 1.5 }, { shape_type: 'rect', count: 21 }, { shape_type: 'missing', count: 2 }]) {
    assert.throws(() => validateToolArguments(batch, args));
  }
  validateToolArguments(batch, { shape_type: 'rect', count: 2, columns: 0 });
  assert.throws(() => validateToolArguments(batch, { shape_type: 'rect', count: 2, 制: 1 }), /允许参数:.*shape_type/);
  assert.throws(() => validateToolArguments(batch, { shape_type: 'rect', count: 2, toString: 'invalid' }), /未知参数/);
  assert.throws(() => validateToolArguments(batch, { shape_type: 'rect', count: 2, width: 0 }), /数值参数/);
  await assert.rejects(tools.find(tool => tool.name === 'delete').execute({
    commands: { execute: async () => ({ success: false, message: 'not selected' }) },
  }, {}));
});

test('agent question tool validates options, booleans and user answers without editing', async () => {
  const { getAgentTools, validateToolArguments } = loadAgentTools();
  const tool = getAgentTools().find(candidate => candidate.name === 'ask_user');
  const args = { question: '排列方向？', options: ['横向', '纵向'] };
  for (const invalid of [
    { ...args, options: ['横向'] }, { ...args, options: ['横向', '横向'] },
    { ...args, options: [' ', '纵向'] }, { ...args, multiple: 'true' },
  ]) assert.throws(() => validateToolArguments(tool, invalid));
  validateToolArguments(tool, { ...args, multiple: true });
  const invoke = (answer, multiple = false) => tool.execute({}, { ...args, multiple }, { askUser: async () => answer });
  assert.equal(JSON.parse(await invoke({ selected: ['横向'], text: '' })).selected[0], '横向');
  assert.equal(JSON.parse(await invoke({ selected: [], text: ' 自定义方向 ' })).text, '自定义方向');
  await assert.rejects(invoke({ selected: ['未知'], text: '' }));
  await assert.rejects(invoke({ selected: ['横向', '纵向'], text: '' }));
  await assert.rejects(invoke({ selected: [], text: '' }));
  await assert.rejects(tool.execute({}, args));
  assert.equal(JSON.parse(await invoke({ selected: ['横向', '纵向'], text: '' }, true)).selected.length, 2);
});

test('agent service reports validation and execution failures as structured results', async () => {
  let executed = 0;
  const toolModule = loadAgentTools();
  const service = createAgentService({}, {
    ...toolModule,
    getAgentTools: () => [{
      name: 'test', category: 'edit', description: 'test',
      parameters: { type: 'object', properties: { count: { type: 'integer', minimum: 1 } }, required: ['count'] },
      execute() { executed++; throw new Error('failed'); },
    }],
  });
  const call = args => ({ id: 'tool', type: 'function', function: { name: 'test', arguments: JSON.stringify(args) } });
  const invalid = await service.executeToolCall(call({ count: 0 }));
  assert.equal(invalid.success, false);
  assert.equal(executed, 0);
  const failed = await service.executeToolCall(call({ count: 1 }));
  assert.equal(failed.success, false);
  assert.equal(executed, 1);
  assert.equal(service.parseToolResult(JSON.stringify(failed)).name, 'test');
  assert.throws(() => service.restoreHistory([{ role: 'tool', tool_call_id: 'tool', content: 'unstructured' }]));
});

test('agent connects only existing document ids and never falls back to names or indices', () => {
  const tools = loadAgentTools().getAgentTools();
  const connect = tools.find(tool => tool.name === 'connect_elements');
  const edges = [];
  const editor = {
    document: { getNode: id => ['node-a', 'node-b'].includes(id) ? { id } : undefined },
    documentCommands: { insertEdge: edge => edges.push(edge) },
    renderer: {
      getNode: id => ['node-a', 'node-b'].includes(id)
        ? { getBounds: () => ({ x: id === 'node-a' ? 0 : 200, y: 0, width: 120, height: 72 }) }
        : undefined
    },
  };
  assert.throws(() => connect.execute(editor, { from: '1', to: 'node-b' }));
  assert.throws(() => connect.execute(editor, { from: 'node-a', to: 'node-a' }));
  connect.execute(editor, { from: 'node-a', to: 'node-b' });
  assert.equal(edges[0].from.nodeId, 'node-a');
  assert.equal(edges[0].to.nodeId, 'node-b');
});

test('agent chooses connector ports from page bounds and rejects overlapping nodes', () => {
  const connect = loadAgentTools().getAgentTools().find(tool => tool.name === 'connect_elements');
  for (const [x, y, fromSide, toSide] of [
    [300, 0, 'right', 'left'], [-300, 0, 'left', 'right'],
    [0, 300, 'bottom', 'top'], [0, -300, 'top', 'bottom'],
  ]) {
    const edges = [];
    const editor = {
      document: { getNode: id => ({ id }) },
      documentCommands: { insertEdge: edge => edges.push(edge) },
      renderer: {
        getNode: id => id === 'from' || id === 'to' ? {
          getBounds(type, relative) {
            assert.equal(type, 'box');
            assert.equal(relative, 'page');
            return { x: id === 'from' ? 0 : x, y: id === 'from' ? 0 : y, width: 120, height: 72 };
          },
        } : undefined
      },
    };
    connect.execute(editor, { from: 'from', to: 'to' });
    assert.equal(edges[0].from.port.side, fromSide);
    assert.equal(edges[0].to.port.side, toSide);
    editor.renderer.getNode = () => ({ getBounds: () => ({ x: 0, y: 0, width: 120, height: 72 }) });
    assert.throws(() => connect.execute(editor, { from: 'from', to: 'to' }), /重叠/);
    assert.equal(edges.length, 1);
  }
});

test('agent configuration accepts only the current complete format and bounded settings', () => {
  let stored;
  const configModule = loadModule('packages/builtin-plugins/src/builtin/plugins/agent/agent-config.ts', {}, {
    URL, localStorage: { getItem: () => stored, setItem(_key, value) { stored = value; } },
  });
  const config = { ...configModule.loadAgentConfig(), apiKey: 'example' };
  assert.equal(configModule.isConfigValid(config), true);
  assert.equal(config.provider, 'openai');
  assert.equal(configModule.AGENT_PROVIDERS.length, 10);
  assert.equal(configModule.getApiEndpoint({ ...config, provider: 'anthropic', apiUrl: 'https://api.anthropic.com/v1/' }), 'https://api.anthropic.com/v1/messages');
  assert.equal(configModule.getApiEndpoint({ ...config, provider: 'anthropic', apiUrl: 'https://example.test/v1/messages' }), 'https://example.test/v1/messages');
  assert.equal(configModule.isConfigValid({ ...config, provider: 'missing' }), false);
  assert.equal(configModule.isConfigValid({ ...config, provider: 'ollama', apiKey: '' }), true);
  assert.equal(configModule.isConfigValid({ ...config, provider: 'custom', apiKey: '' }), false);
  configModule.saveAgentConfig(config);
  assert.equal(configModule.loadAgentConfig().apiKey, 'example');
  assert.equal(configModule.isConfigValid({ ...config, apiUrl: 'javascript:example' }), false);
  assert.throws(() => configModule.saveAgentConfig({ ...config, maxHistoryMessages: -1 }));
  stored = JSON.stringify({ apiKey: 'old-format' });
  assert.equal(configModule.loadAgentConfig().apiKey, '');
});

test('agent search returns document ids and style/text tools target them without changing selection', async () => {
  const tools = loadAgentTools().getAgentTools();
  const nodes = [{ id: '123-node', type: 'Task', data: { text: 'Approval', x: 50 }, children: [] }];
  const calls = [];
  const editor = {
    document: { snapshot: () => ({ nodes, edges: [] }), getNode: id => nodes.find(node => node.id === id) },
    app: { editor: { list: [] } },
    commands: { async execute(name, payload) { calls.push({ name, payload }); return { success: true }; } },
  };
  const result = JSON.parse(tools.find(tool => tool.name === 'search_elements').execute(editor, { query: 'approval' }));
  assert.equal(result.matches[0].id, '123-node');
  await tools.find(tool => tool.name === 'set_style').execute(editor, { ids: ['123-node'], fill: 'red' });
  await tools.find(tool => tool.name === 'modify_text').execute(editor, { ids: ['123-node'], text: 'Done' });
  assert.equal(JSON.stringify(calls[0].payload), JSON.stringify({ ids: ['123-node'], patch: { fill: 'red' } }));
  assert.equal(calls[1].payload.patch.text, 'Done');
  assert.equal(editor.app.editor.list.length, 0);
  assert.throws(() => tools.find(tool => tool.name === 'set_style').execute(editor, { ids: ['missing'], fill: 'red' }));
  assert.equal(calls.length, 2);
});

for (const mode of ['standard', 'stream']) {
  for (const outcome of ['success', 'request failure', 'tool failure', 'limit']) {
    test(`agent ${mode} closes its history batch on ${outcome}`, async () => {
      const { AgentService } = loadModule('packages/builtin-plugins/src/builtin/plugins/agent/agent-service.ts', {
        './agent-config': { isConfigValid: () => true },
        './agent-tools': { getAgentTools: () => [] },
        './agent-client': { requestChat: () => response() },
        './agent-question': loadModule('packages/builtin-plugins/src/builtin/plugins/agent/agent-question.ts'),
      }, { AbortController, structuredClone });
      let depth = 0;
      let endings = 0;
      let requests = 0;
      const editor = {
        beginTransaction() { depth++; },
        endTransaction() { depth--; endings++; },
      };
      const service = new AgentService(editor, { maxHistoryMessages: 20 });
      service.getCanvasContext = () => '';
      service.executeToolCall = async () => {
        if (outcome === 'tool failure') throw new Error('tool failed');
        return { name: 'test', arguments: {}, success: true, result: 'ok' };
      };
      const toolCalls = [{ id: 'tool-1', type: 'function', function: { name: 'test', arguments: '{}' } }];
      function response() {
        assert.equal(depth, 0, 'network requests must not hold history transactions');
        requests++;
        if (outcome === 'request failure' && requests > 1) throw new Error('request failed');
        return requests === 1 || outcome === 'limit'
          ? { content: '', toolCalls }
          : { content: 'done', toolCalls: [] };
      }
      await service.processMessage('test', mode === 'stream' ? { onToken() { } } : {});
      assert.equal(depth, 0);
      assert.equal(endings, outcome === 'limit' ? 40 : 1);
      if (outcome === 'limit') assert.equal(requests, 40);
      const history = service.getHistory();
      for (const [index, message] of history.entries()) {
        for (const call of message.tool_calls ?? []) {
          assert.ok(history.slice(index + 1).some(result => result.role === 'tool' && result.tool_call_id === call.id));
        }
      }
    });
  }
}

function createPluginManager() {
  const { PluginManager } = loadModule('packages/core/src/core/plugin-manager.ts');
  const commands = new Map();
  const removed = [];
  const registry = { unregisterByPlugin(id) { removed.push(id); } };
  const editor = {
    unregisterToolsByPlugin(id) { removed.push(id); },
    commands: {
      register(command) { commands.set(command.id, command); },
      unregisterByPlugin(id) {
        for (const [key, command] of commands) if (command.pluginId === id) commands.delete(key);
      },
    },
    menus: registry, actionButtons: registry, viewControls: registry,
    propertyPanels: registry, overlayPanels: registry, nodeTypes: registry,
  };
  return { manager: new PluginManager(editor), commands, removed };
}

test('plugin activation is serialized and deduplicated', async () => {
  const { manager } = createPluginManager();
  let starts = 0;
  const plugin = { manifest: { id: 'test' }, async activate() { starts++; } };
  await Promise.all([manager.activate(plugin), manager.activate(plugin)]);
  assert.equal(starts, 1);
  assert.equal(manager.isActive('test'), true);
});

test('failed activation releases resources and contributions and can be retried', async () => {
  const { manager, commands } = createPluginManager();
  let cleaned = 0;
  const plugin = {
    manifest: { id: 'test' },
    activate(ctx) {
      ctx.onDispose(() => { cleaned++; });
      ctx.editor.commands.register({ id: 'test.command', pluginId: 'test' });
      throw new Error('activation failed');
    },
  };
  await assert.rejects(manager.activate(plugin), /activation failed/);
  assert.equal(commands.size, 0);
  assert.equal(cleaned, 1);
  assert.equal(manager.isActive('test'), false);
  await manager.activate({ manifest: plugin.manifest, activate() { } });
  assert.equal(manager.isActive('test'), true);
});

test('deactivation queued during activation runs after activation', async () => {
  const { manager } = createPluginManager();
  const calls = [];
  await Promise.all([
    manager.activate({ manifest: { id: 'test' }, async activate() { calls.push('activate'); }, deactivate() { calls.push('deactivate'); } }),
    manager.deactivate('test'),
  ]);
  assert.deepEqual(calls, ['activate', 'deactivate']);
  assert.equal(manager.isActive('test'), false);
});

test('cleanup continues after plugin teardown and resource errors', async () => {
  const { manager, commands, removed } = createPluginManager();
  let cleaned = false;
  await manager.activate({
    manifest: { id: 'test' },
    activate(ctx) {
      ctx.editor.commands.register({ id: 'test.command', pluginId: 'test' });
      ctx.onDispose(() => { cleaned = true; });
      ctx.onDispose(() => { throw new Error('resource failure'); });
    },
    deactivate() { throw new Error('teardown failure'); },
  });
  await assert.rejects(manager.deactivate('test'), /cleanup failed/);
  assert.equal(cleaned, true);
  assert.equal(commands.size, 0);
  assert.equal(removed.length, 7);
  assert.equal(manager.isActive('test'), false);
});

test('plugin manager disposal waits for startup and disposes in reverse order', async () => {
  const { manager } = createPluginManager();
  const stopped = [];
  const first = manager.activate({ manifest: { id: 'first' }, activate() { }, deactivate() { stopped.push('first'); } });
  const second = manager.activate({ manifest: { id: 'second' }, activate() { }, deactivate() { stopped.push('second'); } });
  const disposal = manager.destroy();
  assert.equal(manager.destroy(), disposal);
  await Promise.all([first, second, disposal]);
  assert.deepEqual(stopped, ['second', 'first']);
  assert.equal(manager.listActive().length, 0);
  await assert.rejects(manager.activate({ manifest: { id: 'late' }, activate() { } }), /disposed/);
});

function createEmitter() {
  const handlers = new Map();
  return {
    on(event, handler) {
      if (!handlers.has(event)) handlers.set(event, new Set());
      handlers.get(event).add(handler);
    },
    off(event, handler) { handlers.get(event)?.delete(handler); },
    emit(event, ...args) { for (const handler of handlers.get(event) ?? []) handler(...args); },
    count() { return [...handlers.values()].reduce((total, items) => total + items.size, 0); },
  };
}

function createAutoSave(globals = {}) {
  const tree = createEmitter();
  const editor = createEmitter();
  const storage = new Map();
  const timers = new Map();
  let nextTimer = 0;
  let restored = 0;
  const { AutoSave } = loadModule('packages/core/src/core/auto-save.ts', { '../document/model': { validateDocument() { } } }, {
    localStorage: {
      getItem: key => storage.get(key) ?? null,
      setItem: (key, value) => storage.set(key, value),
      removeItem: key => storage.delete(key),
    },
    setTimeout(callback) { const id = ++nextTimer; timers.set(id, callback); return id; },
    clearTimeout(id) { timers.delete(id); },
    ...globals,
  });
  const document = {
    snapshot: () => ({ version: 2, nodes: [] }),
    subscribe(handler) { tree.on('change', handler); return () => tree.off('change', handler); },
    replace() { restored++; },
  };
  return { autoSave: new AutoSave(document), tree, editor, storage, timers, get restored() { return restored; } };
}

test('autosave subscribes once, flushes pending changes and unsubscribes on disposal', async () => {
  const state = createAutoSave();
  state.autoSave.start();
  state.autoSave.start();
  assert.equal(state.tree.count() + state.editor.count(), 1);
  state.tree.emit('change', { origin: 'command' });
  assert.equal(state.timers.size, 1);
  const disposal = state.autoSave.destroy();
  assert.equal(state.autoSave.destroy(), disposal);
  await disposal;
  assert.equal(state.storage.size, 1);
  assert.equal(state.timers.size, 0);
  assert.equal(state.tree.count() + state.editor.count(), 0);
  state.autoSave.start();
  state.tree.emit('change', { origin: 'command' });
  assert.equal(state.timers.size, 0);
  assert.equal(await state.autoSave.save(), false);
  assert.equal((await state.autoSave.load()).loaded, false);
  assert.equal(state.restored, 0);
});

test('autosave closes a database that opens after disposal starts', async () => {
  const request = {};
  let closed = 0;
  const state = createAutoSave({ indexedDB: { open: () => request } });
  const disposal = state.autoSave.destroy();
  request.result = { close() { closed++; } };
  request.onsuccess();
  await disposal;
  assert.equal(closed, 1);
});

function createEditor(options = {}) {
  const disposed = [];
  const geometryHandlers = new Set();
  const app = Object.assign(createEmitter(), {
    tree: Object.assign(createEmitter(), { children: [] }),
    editor: Object.assign(createEmitter(), { config: {} }),
    destroy() { disposed.push('app'); },
  });
  class Registry { }
  const dependencies = {
    leafer: { App: class { constructor() { return app; } } },
    './constants': { TOOL_NAME: {} },
    './core/history': { HistoryManager: class { dispose() { } } },
    './core/auto-save': { AutoSave: class { start() { disposed.push('autosave.start'); } async destroy() { disposed.push('autosave'); } } },
    './core/plugin-manager': { PluginManager: class { async destroy() { disposed.push('plugins'); if (options.failPlugins) throw new Error('plugin failure'); } } },
    './core/connector-labels': {},
    './core/connector': {
      onConnectorGeometryUpdated(handler) { geometryHandlers.add(handler); return () => geometryHandlers.delete(handler); },
      hasConnectors: () => false,
    },
    './document/document-store': { DocumentStore: class { connect() { return () => { }; } dispose() { } } },
    './document/leafer-document-adapter': { LeaferDocumentAdapter: class { } },
    './document/commands': { DocumentCommands: class { } },
    './document/clipboard': { DocumentClipboard: class { dispose() { } } },
    './core/media-controller': { MediaController: class { dispose() { } } },
    './action/document-commands': { registerDocumentCommands() { } },
    './core/node-type-registry': { NodeTypeRegistry: class { subscribe() { return () => { }; } } },
    './document/resources': { ResourceService: class { dispose() { } } },
    './core/builtin-node-types': { registerBuiltinNodeTypes() { } },
  };
  for (const [filename, name] of [
    ['tool-registry', 'ToolRegistry'], ['command-registry', 'CommandRegistry'],
    ['menu-registry', 'MenuRegistry'], ['action-button-registry', 'ActionButtonRegistry'],
    ['view-control-registry', 'ViewControlRegistry'], ['property-panel-registry', 'PropertyPanelRegistry'],
    ['overlay-panel-registry', 'OverlayPanelRegistry'],
  ]) dependencies[`./core/${filename}`] = { [name]: Registry };
  const { default: Editor } = loadModule('packages/core/src/editor.ts', dependencies, { window: {} });
  return { editor: new Editor({}), app, disposed, geometryHandlers };
}

test('editor commits canvas transforms on drag and gesture end, not during dragging', async () => {
  const state = createEditor();
  const commits = [];
  state.editor.commitInteraction = options => commits.push(options);
  state.app.emit('ready');
  state.app.emit('drag.start');
  state.app.emit('drag');
  assert.equal(commits.length, 0);
  for (const event of ['drag.end', 'move.end', 'zoom.end', 'rotate.end']) {
    const before = commits.length;
    state.app.emit(event);
    assert.equal(commits.length, before + 1, event);
    assert.equal(commits.at(-1).syncConnectorLabels, true);
  }
  await state.editor.dispose();
  state.app.emit('drag.end');
  assert.equal(commits.length, 4);
});

test('editor disposes once and releases instance-specific listeners and services', async () => {
  const state = createEditor();
  state.app.emit('ready');
  state.app.emit('ready');
  assert.equal(state.disposed.filter(item => item === 'autosave.start').length, 1);
  let synced = 0;
  for (const handler of state.geometryHandlers) {
    handler({ app: {}, syncAttachedLabels() { synced++; } });
    handler({ app: state.app, syncAttachedLabels() { synced++; } });
  }
  assert.equal(synced, 1);
  const disposal = state.editor.dispose();
  assert.equal(state.editor.dispose(), disposal);
  await disposal;
  assert.deepEqual(state.disposed.slice(-3), ['autosave', 'plugins', 'app']);
  assert.equal(state.app.count() + state.app.tree.count() + state.app.editor.count(), 0);
  assert.equal(state.geometryHandlers.size, 0);
  assert.equal(state.editor.isDisposed, true);
  state.editor.commitInteraction();
  assert.equal(state.disposed.includes('history.save'), false);
});

test('editor destroys the canvas even if plugin cleanup fails', async () => {
  const state = createEditor({ failPlugins: true });
  await assert.rejects(state.editor.dispose(), /Editor disposal failed/);
  assert.equal(state.disposed.at(-1), 'app');
  state.app.emit('ready');
  assert.equal(state.disposed.includes('autosave.start'), false);
});

test('tool removal cancels all plugin tools even when one cancel fails', () => {
  const { ToolRegistry } = loadModule('packages/core/src/core/tool-registry.ts');
  const registry = new ToolRegistry({});
  let cancelled = 0;
  for (const id of ['first', 'second']) {
    registry.register({
      id, label: id, pluginId: 'test',
      createTool: () => ({ init() { }, cancel() { cancelled++; if (id === 'first') throw new Error('cancel failed'); } }),
    });
  }
  assert.throws(() => registry.unregisterByPlugin('test'), /Tool cleanup failed/);
  assert.equal(cancelled, 2);
  assert.equal(registry.list().length, 0);
});

test('connector animation cleanup cancels frames and removes probe listeners', async () => {
  const handlers = new Map();
  const frames = new Map();
  const cleanups = [];
  const { connectorAnimationPlugin } = loadModule('packages/builtin-plugins/src/builtin/plugins/connector-animation/index.ts', {
    '@leafer-flow/core/core/connector': {},
  }, {
    CustomEvent: class { constructor(type, options) { this.type = type; this.detail = options.detail; } },
    window: {
      addEventListener(event, handler) { handlers.set(event, handler); },
      removeEventListener(event, handler) { if (handlers.get(event) === handler) handlers.delete(event); },
      dispatchEvent() { },
    },
    requestAnimationFrame(callback) { frames.set(1, callback); return 1; },
    cancelAnimationFrame(id) { frames.delete(id); },
  });
  const registry = { register() { } };
  connectorAnimationPlugin.activate({
    pluginId: 'test',
    storage: { get(key) { return key === 'enabled' ? true : undefined; } },
    onDispose(cleanup) { cleanups.push(cleanup); },
    editor: { commands: registry, actionButtons: registry },
  });
  assert.equal(handlers.size, 1);
  assert.equal(frames.size, 1);
  for (const cleanup of cleanups) await cleanup();
  assert.equal(handlers.size, 0);
  assert.equal(frames.size, 0);
});

test('page initialization discards an editor that resolves after unmount', async () => {
  let unmount;
  let resolveEditor;
  let disposed = 0;
  let bindings = 0;
  const startup = new Promise(resolve => { resolveEditor = resolve; });
  const { useEditorAppInit } = loadModule('apps/web/src/composables/useEditorAppInit.ts', {
    vue: { onUnmounted(callback) { unmount = callback; } },
    leafer: { WatchEvent: { DATA: 'data' } },
    '../editor': { initEditor: () => startup },
  });
  const editor = { value: undefined };
  const { initializeApp } = useEditorAppInit({
    editor, editorElement: { value: {} }, logRef: { value: null },
    refreshRuntimeToolContributions() { bindings++; },
    bindSelectionMarquee() { bindings++; }, bindShapeDrop() { bindings++; },
    refreshEditorStats() { },
  });
  const initialized = initializeApp();
  unmount();
  resolveEditor({ async dispose() { disposed++; } });
  assert.equal(await initialized, false);
  assert.equal(bindings, 0);
  assert.equal(disposed, 1);
  assert.equal(editor.value, undefined);
});

test('page initialization waits for restore and releases the active editor on unmount', async () => {
  let unmount;
  let disposed = 0;
  let restored = false;
  const tree = createEmitter();
  const currentEditor = {
    app: { tree },
    autoSave: { async load() { restored = true; return { loaded: false }; } },
    async dispose() { disposed++; },
  };
  const { useEditorAppInit } = loadModule('apps/web/src/composables/useEditorAppInit.ts', {
    vue: { onUnmounted(callback) { unmount = callback; } },
    leafer: { WatchEvent: { DATA: 'data' } },
    '../editor': { initEditor: async () => currentEditor },
  });
  const editor = { value: undefined };
  const { initializeApp } = useEditorAppInit({
    editor, editorElement: { value: {} }, logRef: { value: null },
    refreshRuntimeToolContributions() { }, bindSelectionMarquee() { }, bindShapeDrop() { }, refreshEditorStats() { },
  });
  assert.equal(await initializeApp(), true);
  assert.equal(restored, true);
  assert.equal(tree.count(), 1);
  unmount();
  assert.equal(tree.count(), 0);
  assert.equal(disposed, 1);
  assert.equal(editor.value, undefined);
});
