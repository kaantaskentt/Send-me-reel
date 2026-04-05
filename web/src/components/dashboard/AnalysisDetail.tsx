"use client";

import type { Analysis } from "@/lib/types";
import { parseVerdict } from "@/lib/verdict-parser";
import { format } from "date-fns";
import { ArrowLeft, ExternalLink, ChevronDown, ChevronRight } from "lucide-react";
import { useState } from "react";

interface Props {
  analysis: Analysis;
  onBack: () => void;
}

export default function AnalysisDetail({ analysis, onBack }: Props) {
  const parsed = analysis.verdict ? parseVerdict(analysis.verdict) : null;
  const [showTranscript, setShowTranscript] = useState(false);
  const [showVisual, setShowVisual] = useState(false);

  const meta = analysis.metadata as Record<string, unknown> | null;
  const duration = meta?.duration as number | undefined;
  const likes = meta?.like_count as number | undefined;
  const comments = meta?.comment_count as number | undefined;

  return (
    <div className="p-4 max-w-2xl">
      {/* Back button */}
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-sm text-zinc-400 hover:text-white mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back
      </button>

      {/* Verdict */}
      {parsed && (
        <div className="space-y-4 mb-8">
          <div>
            <h1 className="text-xl font-bold text-blue-400">
              {parsed.title}
            </h1>
            {parsed.subtitle && (
              <p className="text-sm text-zinc-500 mt-1">{parsed.subtitle}</p>
            )}
          </div>

          {parsed.explanation && (
            <p className="text-sm text-zinc-300 leading-relaxed">
              {parsed.explanation}
            </p>
          )}

          {parsed.howTo && (
            <p className="text-sm text-zinc-400 leading-relaxed">
              {parsed.howTo}
            </p>
          )}

          {parsed.realWorldUse && (
            <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-3">
              <p className="text-xs text-zinc-400">
                <span className="text-zinc-300 font-medium">Real-world use:</span>{" "}
                {parsed.realWorldUse}
              </p>
            </div>
          )}

          {parsed.link && (
            <a
              href={parsed.link}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm text-blue-400 hover:text-blue-300"
            >
              {parsed.link}
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}

          {parsed.tags && parsed.tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {parsed.tags.map((tag, i) => (
                <span
                  key={i}
                  className="text-xs bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded-full"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Divider */}
      <div className="border-t border-zinc-800 my-6" />

      {/* Toggles */}
      {analysis.transcript && (
        <button
          onClick={() => setShowTranscript(!showTranscript)}
          className="flex items-center gap-2 w-full text-left py-3 text-sm font-medium text-zinc-300 hover:text-white transition-colors"
        >
          {showTranscript ? (
            <ChevronDown className="w-4 h-4" />
          ) : (
            <ChevronRight className="w-4 h-4" />
          )}
          Full Transcript
        </button>
      )}
      {showTranscript && analysis.transcript && (
        <div className="mb-4 pl-6">
          <p className="text-xs text-zinc-400 leading-relaxed whitespace-pre-wrap">
            {analysis.transcript}
          </p>
        </div>
      )}

      {analysis.visual_summary && (
        <button
          onClick={() => setShowVisual(!showVisual)}
          className="flex items-center gap-2 w-full text-left py-3 text-sm font-medium text-zinc-300 hover:text-white transition-colors"
        >
          {showVisual ? (
            <ChevronDown className="w-4 h-4" />
          ) : (
            <ChevronRight className="w-4 h-4" />
          )}
          Visual Analysis
        </button>
      )}
      {showVisual && analysis.visual_summary && (
        <div className="mb-4 pl-6">
          <p className="text-xs text-zinc-400 leading-relaxed">
            {analysis.visual_summary}
          </p>
        </div>
      )}

      {/* Divider */}
      <div className="border-t border-zinc-800 my-6" />

      {/* Metadata */}
      <div className="space-y-2 text-xs text-zinc-500">
        <div className="flex items-center gap-4">
          <span className="capitalize">{analysis.platform}</span>
          {duration && <span>{Math.round(duration)}s</span>}
          {likes && <span>{likes.toLocaleString()} likes</span>}
          {comments && <span>{comments.toLocaleString()} comments</span>}
        </div>
        <div>
          Analyzed{" "}
          {format(new Date(analysis.created_at), "MMM d, yyyy 'at' h:mm a")}
        </div>
        <a
          href={analysis.source_url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-blue-400 hover:text-blue-300"
        >
          View original
          <ExternalLink className="w-3 h-3" />
        </a>
      </div>
    </div>
  );
}
