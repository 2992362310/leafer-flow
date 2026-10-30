import assert from 'node:assert/strict';
import { once } from 'node:events';
import test from 'node:test';
import { WebSocket } from 'ws';
import { BrowserBridge } from '../dist/bridge.js';
import { parseMcpBridgeRequest } from '../dist/protocol.js';
import { createMcpServer } from '../dist/server.js';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'node:net';

const token = 'mcp-test-token-not-a-real-secret-123456';
const origin = 'http://127.0.0.1:5175';
const descriptor = {
    name: 'get_canvas_info', description: 'Inspect canvas',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
};

async function setup(context, timeoutMs = 1000) {
    const bridge = new BrowserBridge({ token, port: 0, origins: [origin], timeoutMs });
    const port = await bridge.listen();
    context.after(() => bridge.close());
    return { bridge, port };
}

async function connect(port, id, tools = [descriptor]) {
    const socket = new WebSocket(`ws://127.0.0.1:${port}/mcp`, ['leafer-flow-mcp', `token.${token}`], { origin });
    await once(socket, 'open');
    const ready = once(socket, 'message');
    socket.send(JSON.stringify({ type: 'hello', session: { id, name: id, documentId: `document-${id}` }, tools }));
    assert.equal(JSON.parse((await ready)[0].toString()).type, 'ready');
    return socket;
}

test('MCP protocol rejects unsafe tools and malformed arguments', () => {
    const request = { type: 'request', id: 'a', kind: 'tool', name: 'create_shape', arguments: {} };
    assert.equal(parseMcpBridgeRequest(request).name, 'create_shape');
    for (const name of ['clear_canvas', 'delete', 'eval']) assert.throws(() => parseMcpBridgeRequest({ ...request, name }));
    assert.throws(() => parseMcpBridgeRequest({ ...request, arguments: [] }));
    assert.throws(() => parseMcpBridgeRequest({ ...request, kind: 'resource', name: 'file:///secret' }));
});

test('MCP bridge rejects unauthorized origin, host and token', async context => {
    const { port } = await setup(context);
    for (const options of [
        { origin: 'https://untrusted.invalid', supplied: token },
        { origin, supplied: 'wrong-token-value-with-enough-characters' },
        { origin, supplied: token, headers: { Host: 'untrusted.invalid' } },
    ]) {
        await new Promise((resolve, reject) => {
            const socket = new WebSocket(`ws://127.0.0.1:${port}/mcp`, ['leafer-flow-mcp', `token.${options.supplied}`], options);
            socket.on('error', () => { });
            socket.once('open', () => { socket.close(); reject(new Error('Unauthorized connection accepted')); });
            socket.once('unexpected-response', (_request, response) => {
                assert.equal(response.statusCode, 403);
                response.resume();
                socket.terminate();
                resolve();
            });
        });
    }
});

test('MCP bridge selects exact sessions and enforces each session tool grant', async context => {
    const { bridge, port } = await setup(context);
    const first = await connect(port, 'first');
    const second = await connect(port, 'second');
    assert.equal(bridge.listSessions().length, 2);
    assert.equal(bridge.listTools().length, 1);
    let firstCalled = false;
    first.on('message', () => { firstCalled = true; });
    second.once('message', raw => {
        const request = JSON.parse(raw.toString());
        second.send(JSON.stringify({ type: 'result', id: request.id, success: true, result: 'second canvas' }));
    });
    const result = await bridge.request('second', { kind: 'tool', name: 'get_canvas_info', arguments: {} });
    assert.equal(result.result, 'second canvas');
    assert.equal(firstCalled, false);
    await assert.rejects(bridge.request('first', { kind: 'tool', name: 'create_shape', arguments: {} }), /未授权/);
    await assert.rejects(bridge.request('missing', { kind: 'resource', name: 'document', arguments: {} }), /未连接/);
});

test('MCP bridge cancels and times out with an explicit unknown execution result', async context => {
    const { bridge, port } = await setup(context, 100);
    const socket = await connect(port, 'canvas');
    const controller = new AbortController();
    const received = once(socket, 'message');
    const pending = bridge.request('canvas', { kind: 'tool', name: 'get_canvas_info', arguments: {} }, controller.signal);
    await received;
    const cancelled = once(socket, 'message');
    controller.abort();
    await assert.rejects(pending, /结果未知/);
    assert.equal(JSON.parse((await cancelled)[0].toString()).type, 'cancel');
    await assert.rejects(bridge.request('canvas', { kind: 'tool', name: 'get_canvas_info', arguments: {} }), /超时.*结果未知/);
});

test('MCP bridge rejects duplicate sessions and settles requests on browser disconnect', async context => {
    const { bridge, port } = await setup(context);
    const socket = await connect(port, 'canvas');
    const duplicate = new WebSocket(`ws://127.0.0.1:${port}/mcp`, ['leafer-flow-mcp', `token.${token}`], { origin });
    await once(duplicate, 'open');
    const duplicateClosed = once(duplicate, 'close');
    duplicate.send(JSON.stringify({ type: 'hello', session: { id: 'canvas', name: 'duplicate', documentId: 'other' }, tools: [descriptor] }));
    assert.equal((await duplicateClosed)[0], 1008);
    const received = once(socket, 'message');
    const pending = bridge.request('canvas', { kind: 'tool', name: 'get_canvas_info', arguments: {} });
    await received;
    socket.close();
    await assert.rejects(pending, /断开.*结果未知/);
    assert.equal(bridge.listSessions().length, 0);
});

test('MCP official client initializes, discovers tools, targets sessions and reads resources', async context => {
    const { bridge, port } = await setup(context);
    const server = createMcpServer(bridge);
    const client = new Client({ name: 'leafer-flow-test', version: '1.0.0' });
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    await server.connect(serverTransport);
    await client.connect(clientTransport);
    context.after(async () => { await client.close(); await server.close(); });
    assert.deepEqual((await client.listTools()).tools.map(tool => tool.name), ['list_sessions']);
    const empty = await client.callTool({ name: 'list_sessions' });
    assert.equal(JSON.parse(empty.content[0].text).sessions.length, 0);
    const socket = await connect(port, 'editor');
    socket.on('message', raw => {
        const request = JSON.parse(raw.toString());
        if (request.type !== 'request') return;
        socket.send(JSON.stringify({
            type: 'result', id: request.id, success: true,
            result: request.kind === 'resource' ? JSON.stringify({ id: 'document-editor', nodes: [] }) : 'actual canvas result'
        }));
    });
    const tools = (await client.listTools()).tools;
    assert.ok(tools.find(tool => tool.name === 'get_canvas_info').inputSchema.required.includes('session_id'));
    const sessions = JSON.parse((await client.callTool({ name: 'list_sessions' })).content[0].text).sessions;
    assert.equal(sessions[0].id, 'editor');
    const result = await client.callTool({ name: 'get_canvas_info', arguments: { session_id: 'editor' } });
    assert.equal(result.isError, false);
    assert.equal(result.content[0].text, 'actual canvas result');
    await assert.rejects(client.callTool({ name: 'get_canvas_info', arguments: {} }));
    await assert.rejects(client.callTool({ name: 'clear_canvas', arguments: { session_id: 'editor' } }));
    const resources = (await client.listResources()).resources;
    assert.equal(resources.length, 2);
    const document = await client.readResource({ uri: resources[0].uri });
    assert.equal(JSON.parse(document.contents[0].text).id, 'document-editor');
    await assert.rejects(client.readResource({ uri: 'file:///secret' }));
});

test('MCP stdio entry starts with an isolated token file and closes with the client', async context => {
    const directory = await mkdtemp(join(tmpdir(), 'leafer-mcp-test-'));
    const tokenFile = join(directory, 'token');
    await writeFile(tokenFile, token, { mode: 0o600 });
    const reservation = createServer();
    await new Promise(resolve => reservation.listen(0, '127.0.0.1', resolve));
    const port = reservation.address().port;
    await new Promise(resolve => reservation.close(resolve));
    const transport = new StdioClientTransport({
        command: process.execPath,
        args: [fileURLToPath(new URL('../dist/index.js', import.meta.url))],
        stderr: 'pipe',
        env: { ...process.env, LEAFER_FLOW_MCP_PORT: String(port), LEAFER_FLOW_MCP_TOKEN_FILE: tokenFile, LEAFER_FLOW_MCP_ORIGINS: origin },
    });
    const client = new Client({ name: 'stdio-test', version: '1.0.0' });
    context.after(async () => { await client.close(); await rm(directory, { recursive: true, force: true }); });
    let diagnostics = '';
    transport.stderr?.on('data', data => { diagnostics += data.toString(); });
    await client.connect(transport);
    assert.deepEqual((await client.listTools()).tools.map(tool => tool.name), ['list_sessions']);
    assert.equal(diagnostics.includes(token), false);
    const socket = await connect(port, 'stdio-browser');
    assert.equal(JSON.parse((await client.callTool({ name: 'list_sessions' })).content[0].text).sessions[0].id, 'stdio-browser');
    const disconnected = once(socket, 'close');
    await client.close();
    await disconnected;
});
