import { randomBytes } from "node:crypto";
import { constants } from "node:fs";
import { mkdir, open, readFile, lstat } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { BrowserBridge } from "./bridge.js";
import { createMcpServer } from "./server.js";

async function loadToken(filename: string): Promise<string> {
  await mkdir(dirname(filename), { recursive: true, mode: 0o700 });
  try {
    const handle = await open(filename, constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL, 0o600);
    try { await handle.writeFile(randomBytes(32).toString("base64url"), "utf8"); }
    finally { await handle.close(); }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
  }
  const stat = await lstat(filename);
  if (!stat.isFile() || stat.isSymbolicLink()) throw new Error("MCP 令牌路径必须为普通文件");
  if (process.platform !== "win32" && (stat.mode & 0o077)) throw new Error("MCP 令牌权限过宽，请设置为 600");
  return (await readFile(filename, "utf8")).trim();
}

async function main() {
  const port = Number(process.env.LEAFER_FLOW_MCP_PORT ?? 4318);
  if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error("LEAFER_FLOW_MCP_PORT 必须为 1024-65535 的整数");
  const origins = (process.env.LEAFER_FLOW_MCP_ORIGINS ?? "http://127.0.0.1:5175,http://localhost:5175,http://127.0.0.1:5173,http://localhost:5173")
    .split(",").map((origin) => origin.trim());
  if (origins.some((origin) => {
    try { const url = new URL(origin); return !["http:", "https:"].includes(url.protocol) || url.origin !== origin; }
    catch { return true; }
  })) throw new Error("LEAFER_FLOW_MCP_ORIGINS 必须为完整的 HTTP(S) Origin 列表，不能包含通配符或路径");
  const tokenFile = resolve(process.env.LEAFER_FLOW_MCP_TOKEN_FILE ?? join(homedir(), ".leafer-flow", "mcp-token"));
  const token = await loadToken(tokenFile);
  const bridge = new BrowserBridge({ token, port, origins });
  const server = createMcpServer(bridge);
  let stopping = false;
  const shutdown = async () => {
    if (stopping) return;
    stopping = true;
    await bridge.close();
    await server.close();
  };
  server.onclose = () => { void shutdown(); };
  process.once("SIGINT", () => { void shutdown(); });
  process.once("SIGTERM", () => { void shutdown(); });
  process.stdin.once("end", () => { void shutdown(); });
  try {
    await bridge.listen();
    console.error(`Leafer Flow MCP bridge: ws://127.0.0.1:${port}/mcp`);
    console.error(`Local token file: ${tokenFile} (do not share its contents in chat)`);
    await server.connect(new StdioServerTransport());
  } catch (error) {
    await shutdown();
    throw error;
  }
}

main().catch(() => {
  console.error("Leafer Flow MCP 启动失败，请检查端口、允许来源及本机令牌文件。令牌不会打印到日志。");
  process.exitCode = 1;
});
