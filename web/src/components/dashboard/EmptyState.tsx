import { ArrowRight } from "lucide-react";

export default function EmptyState() {
  return (
    <div className="text-center py-16 space-y-4">
      <div className="w-16 h-16 rounded-2xl bg-zinc-800 border border-zinc-700 flex items-center justify-center mx-auto">
        <span className="text-2xl">📭</span>
      </div>
      <h3 className="text-lg font-semibold">Your dashboard is waiting</h3>
      <p className="text-sm text-zinc-400 max-w-sm mx-auto">
        Send your first video link in Telegram and it&apos;ll show up here.
      </p>
      <a
        href="https://t.me/contextdrop2027bot"
        className="inline-flex items-center gap-2 bg-blue-500 hover:bg-blue-400 text-white font-medium px-5 py-2.5 rounded-full text-sm transition-colors"
      >
        Open Telegram
        <ArrowRight className="w-4 h-4" />
      </a>
    </div>
  );
}
