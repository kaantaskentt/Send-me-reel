import "dotenv/config";
import { randomBytes } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import os from "node:os";
import { createCompanionServer } from "../companion/server.js";
import { resolveInstalledHarnesses } from "../companion/harnesses.js";

const origin = process.env.LOCAL_STUDIO_ORIGIN || "http://127.0.0.1:3127";
const parsed = new URL(origin);
if (parsed.protocol !== "http:" || !["127.0.0.1", "localhost"].includes(parsed.hostname) || parsed.origin !== origin) throw new Error("Local studio requires an exact loopback HTTP origin");
const privateRoot = path.resolve(".contextdrop");
await fs.mkdir(privateRoot, { recursive: true, mode: 0o700 });
const token = randomBytes(32).toString("base64url");
const { codexBinary, claudeBinary } = await resolveInstalledHarnesses();
const terminalMode = process.env.CONTEXTDROP_TERMINAL_MODE === "exec" ? "exec" : "interactive";
const server = createCompanionServer({ token, allowedOrigins: [origin], rootDir: path.join(os.homedir(), "Developer", "contextdrop-runs"), codexBinary, claudeBinary, terminalMode, codexModel: process.env.CONTEXTDROP_CODEX_MODEL, browserApiKey: process.env.OPENAI_API_KEY });
const sessionFile = path.join(privateRoot, "companion-session.json");
server.on("error", () => { console.error("Local companion could not start. Check whether port43187 is already in use."); process.exitCode = 1; });
server.listen(43187, "127.0.0.1", async () => {
  await fs.writeFile(sessionFile, JSON.stringify({ token, origin, processId: process.pid }), { mode: 0o600 });
  console.log(`Local companion ready. Open ${origin}/replicate/local and click Connect this Mac.\nPairing credentials are stored privately for this local session; keep this process running.`);
});
async function close() {
  await fs.unlink(sessionFile).catch(() => {});
  server.close();
  setTimeout(() => process.exit(0), 2_000).unref();
}
process.on("SIGINT", close); process.on("SIGTERM", close);
