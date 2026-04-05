import { ArrowRight } from "lucide-react";

import { BOT_LINK } from "@/lib/constants";
const DASHBOARD_LINK = `${BOT_LINK}?start=dashboard`;

export default function ConnectPrompt() {
  return (
    <div className="dark min-h-screen bg-[#0a0a0b] text-white flex items-center justify-center px-6">
      <div className="text-center max-w-md space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-zinc-800 border border-zinc-700 flex items-center justify-center mx-auto">
          <span className="text-2xl">🔒</span>
        </div>
        <h1 className="text-2xl font-bold">Open your dashboard</h1>
        <p className="text-zinc-400">
          Send <code className="text-blue-400">/dashboard</code> in the
          ContextDrop Telegram bot to get your personal link.
        </p>
        <a
          href={BOT_LINK}
          className="inline-flex items-center gap-2 bg-blue-500 hover:bg-blue-400 text-white font-semibold px-6 py-3 rounded-full transition-colors"
        >
          Open Telegram
          <ArrowRight className="w-4 h-4" />
        </a>
      </div>
    </div>
  );
}
