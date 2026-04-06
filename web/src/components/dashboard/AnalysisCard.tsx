"use client";

import { useState } from "react";
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
  notionConnected?: boolean;
}

export default function AnalysisCard({ analysis, onClick, notionConnected }: Props) {
  const [notionStatus, setNotionStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");

  const sendToNotion = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setNotionStatus("sending");
    const res = await fetch("/api/notion/push", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ analysisId: analysis.id }),
    });
    setNotionStatus(res.ok ? "sent" : "error");
  };
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

      {/* Bottom row: intent badge + Notion button */}
      <div className="mt-3 flex items-center gap-2">
        {analysis.verdict_intent && analysis.verdict_intent !== "ignore" && (
          <span
            className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${
              analysis.verdict_intent === "learn"
                ? "bg-blue-500/20 text-blue-300"
                : "bg-emerald-500/20 text-emerald-300"
            }`}
          >
            {analysis.verdict_intent === "learn" ? "Learn" : "Apply"}
          </span>
        )}
        {notionConnected && analysis.verdict && notionStatus === "idle" && (
          <button
            onClick={sendToNotion}
            className="text-xs px-2.5 py-0.5 rounded-full font-medium bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700 transition-colors ml-auto"
          >
            Send to Notion
          </button>
        )}
        {notionStatus === "sending" && (
          <span className="text-xs text-zinc-500 ml-auto">Sending...</span>
        )}
        {notionStatus === "sent" && (
          <span className="text-xs text-emerald-400 ml-auto">Sent to Notion</span>
        )}
        {notionStatus === "error" && (
          <span className="text-xs text-red-400 ml-auto">Failed</span>
        )}
      </div>
    </button>
  );
}
