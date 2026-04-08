import { ArrowRight } from "lucide-react";
import { BOT_LINK } from "@/lib/constants";

interface Props {
  isFiltered?: boolean;
  onClearFilters?: () => void;
}

export default function EmptyState({ isFiltered, onClearFilters }: Props) {
  if (isFiltered) {
    return (
      <div className="text-center py-16 space-y-3">
        <p className="text-zinc-400 text-sm">No results for your current filters.</p>
        <button onClick={onClearFilters} className="text-xs text-blue-400 hover:text-blue-300 transition-colors">
          Clear filters
        </button>
      </div>
    );
  }

  return (
    <div className="text-center py-20 space-y-5">
      <div className="w-16 h-16 rounded-2xl bg-zinc-800/80 border border-zinc-700/50 flex items-center justify-center mx-auto">
        <span className="text-2xl">📭</span>
      </div>
      <div className="space-y-2">
        <h3 className="text-base font-semibold text-zinc-200">No analyses yet</h3>
        <p className="text-sm text-zinc-500 max-w-xs mx-auto leading-relaxed">
          Send a video or article link to the bot and your analysis will appear here.
        </p>
      </div>
      <a
        href={BOT_LINK}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 bg-blue-500 hover:bg-blue-400 text-white font-medium px-5 py-2.5 rounded-full text-sm transition-colors"
      >
        Open Telegram Bot
        <ArrowRight className="w-4 h-4" />
      </a>
    </div>
  );
}
