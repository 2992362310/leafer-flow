import { App, Text, type IAppConfig, type IPointData, type IUI } from "leafer";
import type { IExecuteCommand, TCallback } from "./types";
import { TOOL_NAME } from "./constants";
import { HistoryManager } from "./core/history";
import { AutoSave } from "./core/auto-save";
import { PluginManager } from "./core/plugin-manager";
import { ToolRegistry } from "./core/tool-registry";
import { CommandRegistry } from "./core/command-registry";
import { MenuRegistry } from "./core/menu-registry";
import { ActionButtonRegistry } from "./core/action-button-registry";
import { ViewControlRegistry } from "./core/view-control-registry";
import { PropertyPanelRegistry } from "./core/property-panel-registry";
import { OverlayPanelRegistry } from "./core/overlay-panel-registry";
import type { ToolContribution } from "./api/tool";
import type { Snap } from "leafer-x-easy-snap";
import { captureSelectedConnectorLabelOffsets, syncConnectorLabels } from "./core/connector-labels";
import { Connector, hasConnectors, onConnectorGeometryUpdated, syncConnectors } from "./core/connector";
import { DocumentStore } from "./document/document-store";
import { LeaferDocumentAdapter } from "./document/leafer-document-adapter";
import { DocumentCommands } from "./document/commands";
import { registerDocumentCommands } from "./action/document-commands";
import { NodeTypeRegistry } from "./core/node-type-registry";
import { registerBuiltinNodeTypes } from "./core/builtin-node-types";
import { ResourceService } from "./document/resources";
import { DocumentClipboard } from "./document/clipboard";
import { MediaController } from "./core/media-controller";

const INIT_CONFIG = {
  view: window,
  editor: {},
  tree: {},
};

function getDrawResultElement(result: unknown): IUI | null {
  if (!result || typeof result !== "object" || !("element" in result)) return null;
  return (result as { element?: IUI | null }).element ?? null;
}

export default class Editor {
  app: App;
  public pluginManager: PluginManager;
  public toolRegistry: ToolRegistry;
  public commands: CommandRegistry;
  public menus: MenuRegistry;
  public actionButtons: ActionButtonRegistry;
  public viewControls: ViewControlRegistry;
  public propertyPanels: PropertyPanelRegistry;
  public overlayPanels: OverlayPanelRegistry;
  public readonly nodeTypes: NodeTypeRegistry;
  private currentCursorClass: string = "";
  private syncingConnectors = false;
  private disposed = false;
  private initialized = false;
  private disposePromise?: Promise<void>;
  private cleanups: Array<() => void> = [];
  public snap?: Snap;

  public history: HistoryManager;
  public autoSave: AutoSave;
  public readonly document: DocumentStore;
  public readonly renderer: LeaferDocumentAdapter;
  public readonly documentCommands: DocumentCommands;
  public readonly resources: ResourceService;
  public readonly clipboard: DocumentClipboard;
  public readonly media: MediaController;

  constructor(config: IAppConfig = INIT_CONFIG) {
    const app = new App(config);
    this.app = app;
    this.document = new DocumentStore();
    this.resources = new ResourceService(this.document);
    this.clipboard = new DocumentClipboard(this.document, this.resources);
    this.nodeTypes = new NodeTypeRegistry();
    registerBuiltinNodeTypes(this.nodeTypes);
    this.renderer = new LeaferDocumentAdapter(
      app,
      this.nodeTypes,
      this.resources,
      () => this.commitInteraction({ syncConnectorLabels: true }),
    );
    this.media = new MediaController(app, this.resources, (id) => this.renderer.getNode(id));
    this.cleanups.push(this.nodeTypes.subscribe(() => {
      if (!this.disposed) {
        this.media.beforeRender();
        this.renderer.render(this.document.snapshot());
        this.media.sync(this.document.snapshot());
      }
    }));
    this.cleanups.push(this.document.connect({
      apply: (document, origin) => {
        this.resources.validate(document);
        if (origin === "interaction") this.renderer.acceptInteraction(document);
        else {
          if (origin === "load") this.media.reset();
          this.media.beforeRender();
          this.renderer.render(document);
          this.media.sync(document);
        }
      },
    }));
    this.history = new HistoryManager(this.document, this.resources);
    this.autoSave = new AutoSave(this.document, this.resources);
    this.pluginManager = new PluginManager(this);
    this.toolRegistry = new ToolRegistry(this);
    this.commands = new CommandRegistry(this);
    this.documentCommands = new DocumentCommands(this.document, this.nodeTypes, this.resources, this.clipboard);
    registerDocumentCommands(this);
    this.menus = new MenuRegistry(this);
    this.actionButtons = new ActionButtonRegistry();
    this.viewControls = new ViewControlRegistry();
    this.propertyPanels = new PropertyPanelRegistry();
    this.overlayPanels = new OverlayPanelRegistry();

    // 使用 Leafer 的 ready 事件确保 editor 已就绪后再初始化监听
    const onReady = () => {
      if (this.disposed || this.initialized) return;
      this.initialized = true;
      this.initHistoryListeners();
      this.autoSave.start();
    };
    app.on("ready", onReady);
    this.cleanups.push(() => app.off("ready", onReady));
  }

  get isDisposed() {
    return this.disposed;
  }

  dispose(): Promise<void> {
    if (this.disposePromise) return this.disposePromise;
    this.disposed = true;
    const errors: unknown[] = [];
    for (const cleanup of [...this.cleanups.splice(0).reverse(), () => this.clearCursor()]) {
      try {
        cleanup();
      } catch (error) {
        errors.push(error);
      }
    }
    this.disposePromise = (async () => {
      for (const cleanup of [
        () => this.autoSave.destroy(),
        () => this.pluginManager.destroy(),
        () => this.history.dispose(),
        () => this.media.dispose(),
        () => this.clipboard.dispose(),
        () => this.resources.dispose(),
        () => this.document.dispose(),
        () => this.app.destroy(),
      ]) {
        try {
          await cleanup();
        } catch (error) {
          errors.push(error);
        }
      }
      if (errors.length) throw new AggregateError(errors, "Editor disposal failed");
    })();
    return this.disposePromise;
  }

  private initHistoryListeners() {
    // 使用字符串字面量避免 import 问题
    // 监听由编辑器产生的变换操作 (拖拽移动、缩放、旋转结束)
    if (!this.app.editor) return;

    const render = () => this.syncConnectorsAfterRender();
    const transform = () => this.saveAfterTransform();
    const textEditClose = (event: { editTarget?: IUI }) => {
      const target = event.editTarget;
      if (!(target instanceof Text)) return;
      const text = target.text;
      if (text === undefined) return;
      const id = this.renderer.getId(target);
      queueMicrotask(() => {
        if (this.disposed) return;
        const node = this.document.getNode(id);
        if (node?.type !== "Text" || node.data.text === text) return;
        this.documentCommands.updateNode(id, { text });
      });
    };
    const { app } = this;
    const editor = app.editor;
    app.on("render.end", render);
    app.tree.on("render.end", render);
    this.cleanups.push(() => app.off("render.end", render), () => app.tree.off("render.end", render));
    for (const event of ["drag.end", "move.end", "zoom.end", "rotate.end"]) {
      app.on(event, transform);
      this.cleanups.push(() => app.off(event, transform));
    }
    const updateConnectorHandles = () => this.updateConnectorHandles();
    editor.on("editor.select", updateConnectorHandles);
    this.cleanups.push(() => editor.off("editor.select", updateConnectorHandles));
    this.updateConnectorHandles();
    editor.on("innerEditor.close", textEditClose);
    this.cleanups.push(() => editor.off("innerEditor.close", textEditClose));
    // Labels follow inside Connector.update via attachLabel; this is a safety net.
    this.cleanups.push(onConnectorGeometryUpdated((connector) => {
      if (this.disposed || this.syncingConnectors || connector.app !== this.app) return;
      connector.syncAttachedLabels();
    }));
  }

  private syncConnectorsAfterRender() {
    if (this.disposed || this.syncingConnectors || !hasConnectors(this.app)) return;
    this.syncingConnectors = true;
    try {
      syncConnectors(this.app);
      syncConnectorLabels(this.app);
    } finally {
      this.syncingConnectors = false;
    }
  }

  private updateConnectorHandles() {
    const selected = this.app.editor?.list as IUI[] | undefined;
    const active = selected?.length === 1 && selected[0] instanceof Connector ? selected[0] : undefined;
    const visit = (nodes: IUI[]) => {
      for (const node of nodes) {
        if (node instanceof Connector) node.setEndpointHandlesVisible(node === active);
        const children = (node as IUI & { children?: IUI[] }).children;
        if (children) visit(children);
      }
    };
    visit(this.app.tree.children as IUI[]);
  }

  private saveAfterTransform() {
    this.commitInteraction({ syncConnectorLabels: true });
  }

  commitInteraction(options: {
    syncConnectorLabels?: boolean;
  } = {}) {
    if (this.disposed || this.renderer.isProjecting) return;
    syncConnectors(this.app);

    if (options.syncConnectorLabels) {
      captureSelectedConnectorLabelOffsets(this.app);
      syncConnectorLabels(this.app);
    }

    const committed = this.document.snapshot();
    try {
      this.document.replace(this.renderer.readInteraction(committed), "interaction", "Canvas interaction");
    } catch (error) {
      this.renderer.render(committed);
      throw error;
    }
  }

  /** 开始事务：事务期间的 commitMutation 不会产生新的历史记录 */
  beginTransaction() {
    if (this.disposed) return;
    this.history.beginTransaction();
  }

  /** 结束事务：提交一次历史保存 */
  endTransaction() {
    if (this.disposed) return;
    this.history.endTransaction();
  }

  registerTool(contribution: ToolContribution) {
    return this.toolRegistry.register(contribution);
  }

  unregisterTool(id: string) {
    this.toolRegistry.unregister(id);
  }

  unregisterToolsByPlugin(pluginId: string) {
    this.toolRegistry.unregisterByPlugin(pluginId);
  }

  createElementFromTool(
    name: string,
    startPoint: IPointData,
    size: { width: number; height: number },
  ): IUI | null {
    if (this.disposed) return null;
    const tool = this.toolRegistry.get(name);
    if (!tool?.createFixedElement) return null;

    const element = tool.createFixedElement(startPoint, {
      x: startPoint.x + size.width,
      y: startPoint.y + size.height,
    });

    const node = this.renderer.describeNode(element);
    element.destroy();
    this.documentCommands.insertNode(node);
    const rendered = this.renderer.getNode(node.id);
    if (rendered) this.app.editor.select(rendered);
    return rendered ?? null;
  }

  execute(command: IExecuteCommand, callback: TCallback) {
    if (this.disposed) return;
    const { pre, command: next } = command;
    const tool = this.toolRegistry.get(pre);

    // 1. 如果有前置工具在运行，先取消它
    if (tool) {
      tool.cancel(() => {
        callback({
          next: next, // 告知上层我们要切换到 next
          action: "cancel execute",
          tool: pre,
        });
        // 链式执行下一步
        this.runTool(next, callback);
      });
    } else {
      // 2. 直接执行新工具
      this.runTool(next, callback);
    }
  }

  private runTool(name: string, callback: TCallback) {
    const { app } = this;
    const tool = this.toolRegistry.get(name);

    // 清除之前的强制光标样式
    this.clearCursor();

    // 情况 A: 切换回选择模式 (Select) 或未知工具
    if (!tool) {
      app.editor.config.selector = true;
      return;
    }

    // 情况 B: 激活绘图工具
    // 1. 禁用原生的选择器，防止干扰
    app.editor.config.selector = false;

    // 2. 设置对应的强制光标
    const cursorType =
      name === TOOL_NAME.DRAW_TEXT ? "cursor-text-force" : "cursor-crosshair-force";
    this.setCursor(cursorType);

    // 3. 执行工具逻辑
    tool.execute((result) => {
      if (this.disposed) return;
      // 工具执行完毕后的回调 (例如画完了一个矩形)
      const element = getDrawResultElement(result);
      if (element && name !== TOOL_NAME.DRAW_ARROW) {
        app.editor.select(element);
      } else if (name === TOOL_NAME.DRAW_ARROW) {
        app.editor.target = undefined;
      }

      // 保存历史记录
      this.commitInteraction({ syncConnectorLabels: true });

      // 恢复选择器
      app.editor.config.selector = true;
      // 清除强制光标
      this.clearCursor();

      callback({
        next: null, // null 表示回到了默认状态 (Select)
        action: "success execute",
        tool: name,
      });
    });
  }

  private setCursor(className: string) {
    const container = this.app.view as HTMLElement;
    if (container) {
      container.classList.add(className);
      this.currentCursorClass = className;
    }
  }

  private clearCursor() {
    const container = this.app.view as HTMLElement;
    if (container && this.currentCursorClass) {
      container.classList.remove(this.currentCursorClass);
    }
    this.currentCursorClass = "";
    // 强制移除所有可能的光标类，确保干净
    if (container) {
      container.classList.remove(
        "cursor-crosshair-force",
        "cursor-text-force",
        "cursor-grab-force",
      );
    }
  }
}
