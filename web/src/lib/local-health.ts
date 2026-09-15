import { isLocalStudioRequest, readLocalCompanionToken } from "./local-studio";

export interface LocalHealth {
  version: 1;
  status: "ready" | "needs_setup";
  readers: { gemini: boolean; frames: boolean; pages: true };
  chat: { configured: boolean };
  companion: {
    connected: boolean;
    terminal: boolean;
    browser: boolean;
    browserConnection: 'not_connected' | 'awaiting_selection' | 'selected';
    harnesses: { codex: boolean; claude: boolean };
    execution: "streaming-terminal" | "interactive-terminal" | null;
  };
  issues: string[];
}

type HealthDependencies = {
  env?: NodeJS.ProcessEnv;
  readToken?: (host: string) => Promise<string | undefined>;
  fetcher?: typeof fetch;
};

/** Readiness is configuration and a live companion handshake, never a model call. */
export async function readLocalHealth(headers: Pick<Headers, "get">, dependencies: HealthDependencies = {}): Promise<LocalHealth | null> {
  const env = dependencies.env ?? process.env;
  if (!isLocalStudioRequest(headers, false, env)) return null;
  const openai = Boolean(env.OPENAI_API_KEY?.trim());
  const health: LocalHealth = {
    version: 1,
    status: "needs_setup",
    readers: { gemini: Boolean((env.GEMINI_API_KEY || env.GOOGLE_API_KEY)?.trim()), frames: openai, pages: true },
    chat: { configured: openai },
    companion: { connected: false, terminal: false, browser: false, browserConnection: 'not_connected', harnesses: { codex: false, claude: false }, execution: null },
    issues: [],
  };
  const host = headers.get("host")!;
  try {
    const token = await (dependencies.readToken ?? readLocalCompanionToken)(host);
    if (token) {
      const response = await (dependencies.fetcher ?? fetch)("http://127.0.0.1:43187/health", {
        headers: { Authorization: `Bearer ${token}`, Origin: `http://${host}` },
        cache: "no-store", redirect: "error", signal: AbortSignal.timeout(2_000),
      });
      if (response.ok && response.body) {
        const reader = response.body.getReader();
        const chunks: Uint8Array[] = [];
        let bytes = 0;
        try {
          for (;;) {
            const { done, value } = await reader.read();
            if (done) break;
            bytes += value.byteLength;
            if (bytes > 16_384) throw new Error("Unexpected companion response");
            chunks.push(value);
          }
        } finally { await reader.cancel().catch(() => {}); reader.releaseLock(); }
        const result = JSON.parse(Buffer.concat(chunks).toString("utf8"));
        const caps = result?.capabilities;
        if ((result?.status === "ready" || (result?.status === "unavailable" && result?.companion === "reachable")) && result?.version === 1 && result?.platform === "darwin" && typeof caps?.terminal === "boolean" && typeof caps?.browser?.configured === "boolean" && typeof caps?.harnesses?.codex === "boolean" && typeof caps?.harnesses?.claude === "boolean" && ["streaming-terminal", "interactive-terminal", null].includes(result.execution)) {
          health.companion = { connected: true, terminal: caps.terminal, browser: caps.browser.configured, browserConnection: caps.browser.mode === 'existing-chrome' && ['awaiting_selection', 'selected'].includes(caps.browser.connection) ? caps.browser.connection : 'not_connected', harnesses: { codex: caps.harnesses.codex, claude: caps.harnesses.claude }, execution: result.execution };
        }
      } else await response.body?.cancel().catch(() => {});
    }
  } catch { /* A failed handshake is availability information; do not expose token, path, or upstream text. */ }
  if (!openai) health.issues.push("Add your OpenAI key to enable source conversations.");
  if (!health.readers.gemini) health.issues.push("Add your Gemini key to enable native video reading and focused reinspection.");
  if (!health.companion.connected) health.issues.push("Start ContextDrop on this Mac to connect its browser and coding tools.");
  else if (!health.companion.terminal) health.issues.push("Install and sign in to Codex or Claude Code to run coding tasks.");
  health.status = openai && health.companion.connected ? "ready" : "needs_setup";
  return health;
}
