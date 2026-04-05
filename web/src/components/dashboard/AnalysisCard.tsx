"use client";

import type { Analysis } from "@/lib/types";
import { parseVerdict } from "@/lib/verdict-parser";
import { formatDistanceToNow } from "date-fns";
import { Camera, AtSign, Globe, Video } from "lucide-react";

const platformIcons: Record<string, typeof Camera> = {
  instagram: Camera,
  tiktok: Video,
  x: AtSign,
  article: Globe,
};

interface Props {
  analysis: Analysis;
  onClick: () => void;
}

export default function AnalysisCard({ analysis, onClick }: Props) {
  const parsed = analysis.verdict ? parseVerdict(analysis.verdict) : null;
  const PlatformIcon = platformIcons[analysis.platform] || Globe;
  const timeAgo = formatDistanceToNow(new Date(analysis.created_at), {
    addSuffix: true,
  });

  return (
    <button
      onClick={onClick}
      className="w-full text-left bg-zinc-900 hover:bg-zinc-800/80 border border-zinc-800 rounded-xl p-4 transition-colors"
    >
      {/* Top row */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 text-xs text-zinc-500">
          <PlatformIcon className="w-3.5 h-3.5" />
          <span className="capitalize">{analysis.platform}</span>
        </div>
        <span className="text-xs text-zinc-600">{timeAgo}</span>
      </div>

      {/* Title */}
      <h3 className="font-semibold text-sm text-white mb-1">
        {parsed?.title || "Untitled"}
      </h3>

      {/* Summary */}
      {parsed?.subtitle && (
        <p className="text-xs text-zinc-400 line-clamp-2">{parsed.subtitle}</p>
      )}
      {!parsed?.subtitle && parsed?.explanation && (
        <p className="text-xs text-zinc-400 line-clamp-2">
          {parsed.explanation}
        </p>
      )}

      {/* Intent badge */}
      {analysis.verdict_intent && analysis.verdict_intent !== "ignore" && (
        <div className="mt-3">
          <span
            className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${
              analysis.verdict_intent === "learn"
                ? "bg-blue-500/20 text-blue-300"
                : "bg-emerald-500/20 text-emerald-300"
            }`}
          >
            {analysis.verdict_intent === "learn" ? "Learn" : "Apply"}
          </span>
        </div>
      )}
    </button>
  );
}
