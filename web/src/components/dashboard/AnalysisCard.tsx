"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Analysis } from "@/lib/types";
import { parseVerdict } from "@/lib/verdict-parser";
import { formatDistanceToNow } from "date-fns";
import { ChevronDown, ExternalLink, Share2, BookOpen, Trash2, Check, Loader2, X } from "lucide-react";

function InstagramIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <defs>
        <linearGradient id="ig-grad" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#f09433" />
          <stop offset="25%" stopColor="#e6683c" />
          <stop offset="50%" stopColor="#dc2743" />
          <stop offset="75%" stopColor="#cc2366" />
          <stop offset="100%" stopColor="#bc1888" />
        </linearGradient>
      </defs>
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" fill="url(#ig-grad)" />
      <circle cx="12" cy="12" r="4.5" fill="none" stroke="white" strokeWidth="1.5" />
      <circle cx="17.5" cy="6.5" r="1" fill="white" />
    </svg>
  );
}

function TikTokIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect width="24" height="24" rx="5" fill="#010101" />
      <path d="M16.6 5.82s.51.5 0 0A4.278 4.278 0 0 1 15.54 3h-3.09v12.4a2.592 2.592 0 0 1-2.59 2.5 2.592 2.592 0 0 1-2.59-2.5 2.592 2.592 0 0 1 2.59-2.5c.28 0 .54.04.79.1V9.84a5.63 5.63 0 0 0-.79-.05 5.64 5.64 0 0 0-5.64 5.64 5.64 5.64 0 0 0 5.64 5.64 5.64 5.64 0 0 0 5.64-5.64V9.15a7.33 7.33 0 0 0 4.29 1.38V7.44s-1.88.09-3.19-1.62z" fill="#69C9D0" />
      <path d="M15.54 3h-3.09v12.4a2.592 2.592 0 0 1-2.59 2.5 2.592 2.592 0 0 1-2.59-2.5 2.592 2.592 0 0 1 2.59-2.5c.28 0 .54.04.79.1V9.84a5.63 5.63 0 0 0-.79-.05 5.64 5.64 0 0 0-5.64 5.64 5.64 5.64 0 0 0 5.64 5.64 5.64 5.64 0 0 0 5.64-5.64V9.15a7.33 7.33 0 0 0 4.29 1.38V7.44A4.278 4.278 0 0 1 16.6 5.82s.51.5 0 0A4.278 4.278 0 0 1 15.54 3z" fill="#EE1D52" />
    </svg>
  );
}

function XIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect width="24" height="24" rx="5" fill="#000" />
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.253 5.622 5.91-5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z" fill="white" />
    </svg>
  );
}

function ArticleIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect width="24" height="24" rx="5" fill="#3B82F6" fillOpacity="0.15" />
      <rect x="6" y="7" width="12" height="1.5" rx="0.75" fill="#60A5FA" />
      <rect x="6" y="11" width="12" height="1.5" rx="0.75" fill="#60A5FA" opacity="0.7" />
      <rect x="6" y="15" width="8" height="1.5" rx="0.75" fill="#60A5FA" opacity="0.5" />
    </svg>
  );
}

function PlatformIcon({ platform }: { platform: string }) {
  switch (platform) {
    case "instagram": return <InstagramIcon />;
    case "tiktok": return <TikTokIcon />;
    case "x": return <XIcon />;
    default: return <ArticleIcon />;
  }
}

function IntentBadge({ intent }: { intent: string | null }) {
  if (!intent || intent === "ignore") return null;
  const styles = intent === "learn"
    ? "bg-blue-500/15 text-blue-300 border-blue-500/20"
    : "bg-emerald-500/15 text-emerald-300 border-emerald-500/20";
  return (
    <span className={`inline-flex items-center text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full border ${styles}`}>
      {intent === "learn" ? "Learn" : "Apply"}
    </span>
  );
}

function fmtCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function fmtDuration(secs: number): string {
  const m = Math.floor(secs / 60);
  const s = Math.round(secs % 60);
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

interface Props {
  analysis: Analysis;
  isOpen: boolean;
  onToggle: () => void;
  notionConnected: boolean;
  onDeleted: (id: string) => void;
}

export default function AnalysisCard({ analysis, isOpen, onToggle, notionConnected, onDeleted }: Props) {
  const [notionStatus, setNotionStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [shareStatus, setShareStatus] = useState<"idle" | "copied">("idle");
  const [deleteState, setDeleteState] = useState<"idle" | "confirm" | "deleting">("idle");

  const parsed = analysis.verdict ? parseVerdict(analysis.verdict) : null;
  const timeAgo = formatDistanceToNow(new Date(analysis.created_at), { addSuffix: true });
  const meta = analysis.metadata as Record<string, unknown> | null;
  const authorUsername = meta?.authorUsername as string | undefined;
  const views = meta?.views as number | undefined;
  const likes = meta?.likes as number | undefined;
  const comments = meta?.comments as number | undefined;
  const duration = meta?.duration as number | undefined;
  const hasVideoMeta = views || likes || comments || duration;

  const handleShare = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await navigator.clipboard.writeText(`${window.location.origin}/a/${analysis.id}`).catch(() => {});
    setShareStatus("copied");
    setTimeout(() => setShareStatus("idle"), 2000);
  };

  const handleNotion = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!notionConnected) { window.location.href = "/connect-notion"; return; }
    setNotionStatus("sending");
    const res = await fetch("/api/notion/push", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ analysisId: analysis.id }),
    });
    setNotionStatus(res.ok ? "sent" : "error");
    if (res.ok) setTimeout(() => setNotionStatus("idle"), 3000);
  };

  const handleDeleteClick = (e: React.MouseEvent) => { e.stopPropagation(); setDeleteState("confirm"); };
  const handleDeleteConfirm = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setDeleteState("deleting");
    await fetch(`/api/analyses/${analysis.id}`, { method: "DELETE" });
    onDeleted(analysis.id);
  };
  const cancelDelete = (e: React.MouseEvent) => { e.stopPropagation(); setDeleteState("idle"); };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12, scale: 0.98 }}
      transition={{ duration: 0.2 }}
      className={`rounded-xl border transition-colors duration-150 overflow-hidden ${
        isOpen
          ? "bg-zinc-900 border-blue-500/20 shadow-[0_0_0_1px_rgba(59,130,246,0.06),0_4px_24px_rgba(0,0,0,0.3)]"
          : "bg-zinc-900 border-zinc-800 hover:border-zinc-700"
      }`}
    >
      {/* Collapsed header */}
      <button onClick={onToggle} className="w-full text-left px-4 py-4 flex items-start gap-3 group">
        <div className="mt-0.5 shrink-0"><PlatformIcon platform={analysis.platform} /></div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <IntentBadge intent={analysis.verdict_intent} />
            <span className="text-[11px] text-zinc-600 ml-auto shrink-0">{timeAgo}</span>
          </div>
          <h3 className="text-sm font-semibold text-zinc-100 leading-snug truncate">
            {parsed?.title || "Untitled"}
          </h3>
          {(parsed?.subtitle || parsed?.explanation) && (
            <p className="text-xs text-zinc-500 mt-0.5 line-clamp-1 italic">
              {parsed?.subtitle || parsed?.explanation}
            </p>
          )}
          {authorUsername && <p className="text-[11px] text-zinc-600 mt-1">@{authorUsername}</p>}
        </div>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="shrink-0 mt-1 text-zinc-600 group-hover:text-zinc-400 transition-colors"
        >
          <ChevronDown className="w-4 h-4" />
        </motion.div>
      </button>

      {/* Expanded content */}
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            key="expanded"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ height: { duration: 0.28, ease: [0.4, 0, 0.2, 1] }, opacity: { duration: 0.2, delay: 0.08 } }}
          >
            <div className="px-4 pb-4 space-y-4">
              <div className="border-t border-zinc-800" />
              {parsed && (
                <div className="space-y-3.5">
                  {parsed.explanation && (
                    <div>
                      <p className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-1.5">🧠 What It Is</p>
                      <p className="text-sm text-zinc-300 leading-relaxed">{parsed.explanation}</p>
                    </div>
                  )}
                  {parsed.howTo && (
                    <div>
                      <p className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-1.5">🔧 What&apos;s Inside</p>
                      <p className="text-sm text-zinc-300 leading-relaxed">{parsed.howTo}</p>
                    </div>
                  )}
                  {parsed.realWorldUse && (
                    <div>
                      <p className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-1.5">💡 Real-World Context</p>
                      <p className="text-sm text-zinc-300 leading-relaxed">{parsed.realWorldUse}</p>
                    </div>
                  )}
                  {parsed.link && (
                    <a href={parsed.link} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}
                      className="inline-flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 bg-blue-500/[0.08] border border-blue-500/15 px-3 py-1.5 rounded-lg transition-colors max-w-full">
                      <ExternalLink className="w-3 h-3 shrink-0" />
                      <span className="truncate">{parsed.link}</span>
                    </a>
                  )}
                  {parsed.tags && parsed.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {parsed.tags.map((tag: string, i: number) => (
                        <span key={i} className="text-[11px] bg-zinc-800 text-zinc-400 border border-zinc-700/50 px-2 py-0.5 rounded-full">{tag}</span>
                      ))}
                    </div>
                  )}
                </div>
              )}
              {hasVideoMeta && (
                <>
                  <div className="border-t border-zinc-800/60" />
                  <div className="flex items-center gap-4 text-xs text-zinc-600">
                    {views && <span>{fmtCount(views)} views</span>}
                    {likes && <span>{fmtCount(likes)} likes</span>}
                    {comments && <span>{fmtCount(comments)} comments</span>}
                    {duration && <span>{fmtDuration(duration)}</span>}
                  </div>
                </>
              )}
              <div className="border-t border-zinc-800" />
              <AnimatePresence mode="wait" initial={false}>
                {deleteState === "confirm" ? (
                  <motion.div key="confirm" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.15 }} className="flex items-center gap-3">
                    <span className="text-sm text-zinc-300 flex-1">Delete this analysis?</span>
                    <button onClick={cancelDelete} className="text-xs text-zinc-400 hover:text-white border border-zinc-700 px-3 py-1.5 rounded-lg transition-colors">Cancel</button>
                    <button onClick={handleDeleteConfirm} className="text-xs text-red-400 hover:text-white hover:bg-red-500/20 border border-red-500/30 px-3 py-1.5 rounded-lg transition-colors">Delete</button>
                  </motion.div>
                ) : (
                  <motion.div key="actions" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.15 }} className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <a href={analysis.source_url} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}
                      className="flex items-center justify-center gap-1.5 text-xs text-zinc-400 hover:text-white border border-zinc-700/60 hover:border-zinc-600 bg-zinc-800/40 hover:bg-zinc-800 px-3 py-2 rounded-lg transition-all">
                      <ExternalLink className="w-3.5 h-3.5" /> View
                    </a>
                    <button onClick={handleShare}
                      className={`flex items-center justify-center gap-1.5 text-xs border px-3 py-2 rounded-lg transition-all ${shareStatus === "copied" ? "text-emerald-400 border-emerald-500/30 bg-emerald-500/10" : "text-zinc-400 hover:text-white border-zinc-700/60 hover:border-zinc-600 bg-zinc-800/40 hover:bg-zinc-800"}`}>
                      {shareStatus === "copied" ? <><Check className="w-3.5 h-3.5" /> Copied!</> : <><Share2 className="w-3.5 h-3.5" /> Share</>}
                    </button>
                    <button onClick={handleNotion} disabled={notionStatus === "sending" || notionStatus === "sent"}
                      className={`flex items-center justify-center gap-1.5 text-xs border px-3 py-2 rounded-lg transition-all disabled:cursor-default ${notionStatus === "sent" ? "text-emerald-400 border-emerald-500/30 bg-emerald-500/10" : notionStatus === "error" ? "text-red-400 border-red-500/30 bg-red-500/10" : "text-zinc-400 hover:text-white border-zinc-700/60 hover:border-zinc-600 bg-zinc-800/40 hover:bg-zinc-800"}`}>
                      {notionStatus === "sending" ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving…</>
                        : notionStatus === "sent" ? <><Check className="w-3.5 h-3.5" /> Saved!</>
                        : notionStatus === "error" ? <><X className="w-3.5 h-3.5" /> Failed</>
                        : notionConnected ? <><BookOpen className="w-3.5 h-3.5" /> Notion</>
                        : <><BookOpen className="w-3.5 h-3.5" /> Connect</>}
                    </button>
                    <button onClick={handleDeleteClick} disabled={deleteState === "deleting"}
                      className="flex items-center justify-center gap-1.5 text-xs text-zinc-500 hover:text-red-400 border border-zinc-700/60 hover:border-red-500/30 bg-zinc-800/40 px-3 py-2 rounded-lg transition-all disabled:cursor-default">
                      {deleteState === "deleting" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <><Trash2 className="w-3.5 h-3.5" /> Delete</>}
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
