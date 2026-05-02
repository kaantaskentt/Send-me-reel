import "dotenv/config";

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function optional(name: string): string | undefined {
  return process.env[name] || undefined;
}

export const config = {
  telegramBotToken: required("TELEGRAM_BOT_TOKEN"),
  openaiApiKey: required("OPENAI_API_KEY"),
  supabaseUrl: required("SUPABASE_URL"),
  supabaseServiceKey: required("SUPABASE_SERVICE_KEY"),
  jwtSecret: optional("JWT_SECRET"),
  appUrl: optional("APP_URL") || "https://contextdrop.app",
  // Per-user LLM Wiki sidecar. When false, source enqueue helpers are no-ops
  // and no rows land in user_wiki_*. Default off until PR3+ ships the worker.
  wikiCompilerEnabled: optional("WIKI_COMPILER_ENABLED") === "true",
} as const;
