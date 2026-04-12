"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Analysis } from "@/lib/types";
import { parseVerdict } from "@/lib/verdict-parser";
import { formatDistanceToNow } from "date-fns";
import { ChevronDown, ExternalLink, Share2, BookOpen, Trash2, Check, Loader2, X } from "lucide-react";
import TodoList from "./TodoList";

// ── Platform icons ────────────────────────────────────────────────────────────
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
function LinkedInIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect width="24" height="24" rx="5" fill="#0A66C2" />
      <path d="M7.5 9.5h-2v7h2v-7zm-1-1.5a1.25 1.25 0 1 0 0-2.5 1.25 1.25 0 0 0 0 2.5zm3 1.5v7h2v-3.5c0-1.1.9-2 2-2s2 .9 2 2v3.5h2v-4c0-2.2-1.8-4-4-4-1.1 0-2 .4-2.7 1.1V9.5h-1.3z" fill="white" />
    </svg>
  );
}
function PlatformIcon({ platform }: { platform: string }) {
  switch (platform) {
    case "instagram": return <InstagramIcon />;
    case "tiktok": return <TikTokIcon />;
    case "x": return <XIcon />;
    case "linkedin": return <LinkedInIcon />;
    default: return <ArticleIcon />;
  }
}

// ── Intent badge ──────────────────────────────────────────────────────────────
function IntentBadge({ intent }: { intent: string | null }) {
  if (!intent || intent === "ignore") return null;
  const map: Record<string, { bg: string; color: string; border: string; label: string }> = {
    learn: { bg: "#eff6ff", color: "#3b82f6", border: "#bfdbfe", label: "📚 Learn" },
    apply: { bg: "#fff7ed", color: "#f97316", border: "#fed7aa", label: "🚀 Apply" },
    skip:  { bg: "#f5f5f4", color: "#a8a29e", border: "#e7e5e4", label: "⏭ Skip" },
  };
  const s = map[intent] ?? map.skip;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center",
      fontSize: 10, fontWeight: 700, letterSpacing: "0.04em",
      padding: "2px 8px", borderRadius: 100,
      background: s.bg, color: s.color, border: `1px solid ${s.border}`,
      fontFamily: "'DM Sans', sans-serif",
    }}>
      {s.label}
    </span>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────
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

// ── Props ─────────────────────────────────────────────────────────────────────
interface Props {
  analysis: Analysis;
  isOpen: boolean;
  onToggle: () => void;
  notionConnected: boolean;
  isPremium: boolean;
  onDeleted: (id: string) => void;
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function AnalysisCard({ analysis, isOpen, onToggle, notionConnected, isPremium, onDeleted }: Props) {
  const [notionStatus, setNotionStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [shareStatus, setShareStatus] = useState<"idle" | "copied">("idle");
  const [deleteState, setDeleteState] = useState<"idle" | "confirm" | "deleting">("idle");
  const [actionItems, setActionItems] = useState<Record<string, unknown> | null>(analysis.action_items || null);
  const [actionItemsLoading, setActionItemsLoading] = useState(false);
  const [askQuestion, setAskQuestion] = useState("");
  const [askAnswer, setAskAnswer] = useState<string | null>(null);
  const [askLoading, setAskLoading] = useState(false);

  const parsed = analysis.verdict ? parseVerdict(analysis.verdict) : null;
  const timeAgo = formatDistanceToNow(new Date(analysis.created_at), { addSuffix: true });
  const meta = analysis.metadata as Record<string, unknown> | null;
  const authorUsername = meta?.authorUsername as string | undefined;
  const views = meta?.views as number | undefined;
  const likes = meta?.likes as number | undefined;
  const comments = meta?.comments as number | undefined;
  const duration = meta?.duration as number | undefined;
  const hasVideoMeta = views || likes || comments || duration;

  // ── Handlers — all logic preserved exactly ───────────────────────────────
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

  const handleActionItems = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (actionItems) return;
    setActionItemsLoading(true);
    try {
      const res = await fetch(`/api/analyses/${analysis.id}/action-items`, { method: "POST" });
      const data = await res.json();
      if (data.action_items) setActionItems(data.action_items);
    } catch {
      // Silently fail — button stays available to retry
    }
    setActionItemsLoading(false);
  };

  const handleAsk = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!askQuestion.trim() || askLoading) return;
    setAskLoading(true);
    setAskAnswer(null);
    try {
      const res = await fetch(`/api/analyses/${analysis.id}/ask`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: askQuestion.trim() }),
      });
      const data = await res.json();
      if (data.answer) {
        setAskAnswer(data.answer);
        setAskQuestion("");
      }
    } catch {
      // Silently fail
    }
    setAskLoading(false);
  };

  // ── Shared button style ───────────────────────────────────────────────────
  const btnBase: React.CSSProperties = {
    display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
    fontSize: 12, fontWeight: 600, padding: "8px 14px", borderRadius: 10,
    border: "1px solid #e7e2d9", background: "#fafaf9", color: "#78716c",
    cursor: "pointer", transition: "all 0.15s", fontFamily: "'DM Sans', sans-serif",
    flex: 1,
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12, scale: 0.98 }}
      transition={{ duration: 0.2 }}
      style={{
        background: "#fff",
        border: isOpen ? "1.5px solid #f97316" : "1px solid #e7e2d9",
        borderRadius: 16,
        overflow: "hidden",
        transition: "border-color 0.2s, box-shadow 0.2s",
        boxShadow: isOpen ? "0 4px 24px rgba(249,115,22,0.08)" : "0 1px 4px rgba(0,0,0,0.04)",
        fontFamily: "'DM Sans', sans-serif",
      }}
    >
      {/* ── Collapsed header ── */}
      <button
        onClick={onToggle}
        style={{
          width: "100%", textAlign: "left", padding: "14px 16px",
          display: "flex", alignItems: "flex-start", gap: 12,
          cursor: "pointer", background: "none", border: "none",
          fontFamily: "'DM Sans', sans-serif",
        }}
      >
        <div style={{ marginTop: 2, flexShrink: 0 }}>
          <PlatformIcon platform={analysis.platform} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
            <IntentBadge intent={analysis.verdict_intent} />
            <span style={{ fontSize: 11, color: "#c4bdb5", marginLeft: "auto", flexShrink: 0 }}>{timeAgo}</span>
          </div>
          <h3 style={{ fontSize: 13, fontWeight: 600, color: "#1c1917", lineHeight: 1.35, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {parsed?.title || "Untitled"}
          </h3>
          {(parsed?.subtitle || parsed?.explanation) && (
            <p style={{ fontSize: 12, color: "#a8a29e", marginTop: 3, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 1, WebkitBoxOrient: "vertical", fontStyle: "italic" }}>
              {parsed?.subtitle || parsed?.explanation}
            </p>
          )}
          {authorUsername && <p style={{ fontSize: 11, color: "#c4bdb5", marginTop: 4 }}>@{authorUsername}</p>}
          {!isOpen && (
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 5 }}>
              <span style={{ fontSize: 10, color: "#d6d3d1", display: "flex", alignItems: "center", gap: 3 }}>⚡ Deep Dive</span>
              <span style={{ fontSize: 10, color: "#e7e2d9" }}>·</span>
              <span style={{ fontSize: 10, color: "#d6d3d1", display: "flex", alignItems: "center", gap: 3 }}>💬 Ask</span>
            </div>
          )}
        </div>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          style={{ flexShrink: 0, marginTop: 4, color: "#c4bdb5" }}
        >
          <ChevronDown style={{ width: 16, height: 16 }} />
        </motion.div>
      </button>

      {/* ── Expanded content ── */}
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            key="expanded"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ height: { duration: 0.28, ease: [0.4, 0, 0.2, 1] }, opacity: { duration: 0.2, delay: 0.08 } }}
            style={{ overflow: "hidden" }}
          >
            <div style={{ padding: "0 16px 16px", display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ height: 1, background: "#f0ebe4" }} />

              {parsed && (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {parsed.explanation && (
                    <div style={{ background: "#faf8f5", border: "1px solid #f0ebe4", borderRadius: 12, padding: "12px 14px" }}>
                      <p style={{ fontSize: 10, color: "#a8a29e", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 700, marginBottom: 6 }}>🧠 What It Is</p>
                      <p style={{ fontSize: 13, color: "#44403c", lineHeight: 1.65, margin: 0 }}>{parsed.explanation}</p>
                    </div>
                  )}
                  {parsed.howTo && (
                    <div style={{ background: "#faf8f5", border: "1px solid #f0ebe4", borderRadius: 12, padding: "12px 14px" }}>
                      <p style={{ fontSize: 10, color: "#a8a29e", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 700, marginBottom: 6 }}>🔧 What&apos;s Inside</p>
                      <p style={{ fontSize: 13, color: "#44403c", lineHeight: 1.65, margin: 0 }}>{parsed.howTo}</p>
                    </div>
                  )}
                  {parsed.realWorldUse && (
                    <div style={{ background: "#faf8f5", border: "1px solid #f0ebe4", borderRadius: 12, padding: "12px 14px" }}>
                      <p style={{ fontSize: 10, color: "#a8a29e", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 700, marginBottom: 6 }}>💡 Real-World Context</p>
                      <p style={{ fontSize: 13, color: "#44403c", lineHeight: 1.65, margin: 0 }}>{parsed.realWorldUse}</p>
                    </div>
                  )}
                  {parsed.link && (
                    <a href={parsed.link} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}
                      style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, color: "#f97316", textDecoration: "none", fontWeight: 600 }}>
                      <ExternalLink style={{ width: 12, height: 12 }} />
                      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 280 }}>{parsed.link}</span>
                    </a>
                  )}
                  {parsed.tags && parsed.tags.length > 0 && (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                      {parsed.tags.map((tag: string, i: number) => (
                        <span key={i} style={{ fontSize: 11, background: "#f5f1eb", color: "#78716c", border: "1px solid #e7e2d9", padding: "2px 10px", borderRadius: 100 }}>{tag}</span>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ── Deep Dive ── */}
              {actionItems ? (
                <div style={{ background: "#fff", border: "1px solid #e7e2d9", borderRadius: 14, padding: 16, display: "flex", flexDirection: "column", gap: 0 }}>

                  {/* Key Insights */}
                  {(actionItems.insights as { text: string }[])?.length > 0 && (
                    <div style={{ paddingBottom: 12 }}>
                      <p style={{ fontSize: 10, color: "#a8a29e", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 700, margin: "0 0 8px 0" }}>💡 Insights</p>
                      {(actionItems.insights as { text: string }[]).map((item, i) => (
                        <p key={i} style={{ fontSize: 13, color: "#44403c", lineHeight: 1.65, margin: i > 0 ? "6px 0 0 0" : 0 }}>{item.text}</p>
                      ))}
                    </div>
                  )}

                  {/* Tools & Resources */}
                  {(actionItems.resources as { name: string; description: string; link?: string; price?: string }[])?.length > 0 && (
                    <div style={{ borderTop: "1px solid #f0ebe4", paddingTop: 12, paddingBottom: 12 }}>
                      <p style={{ fontSize: 10, color: "#a8a29e", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 700, margin: "0 0 8px 0" }}>🔧 Mentioned</p>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                        {(actionItems.resources as { name: string; description: string; link?: string; price?: string }[]).map((item, i) => (
                          item.link ? (
                            <a key={i} href={item.link} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}
                              title={item.description}
                              style={{ fontSize: 12, fontWeight: 600, padding: "4px 12px", borderRadius: 100, background: "#eff6ff", color: "#2563eb", border: "1px solid #bfdbfe", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 4 }}>
                              {item.name} {item.price && <span style={{ fontSize: 10, color: "#64748b" }}>· {item.price}</span>}
                            </a>
                          ) : (
                            <span key={i} title={item.description}
                              style={{ fontSize: 12, fontWeight: 600, padding: "4px 12px", borderRadius: 100, background: "#f5f1eb", color: "#44403c", border: "1px solid #e7e2d9", display: "inline-flex", alignItems: "center", gap: 4 }}>
                              {item.name} {item.price && <span style={{ fontSize: 10, color: "#a8a29e" }}>· {item.price}</span>}
                            </span>
                          )
                        ))}
                      </div>
                    </div>
                  )}

                  {/* For You */}
                  {(actionItems.for_you as { text: string }[])?.length > 0 && (
                    <div style={{ borderTop: "1px solid #f0ebe4", paddingTop: 12, paddingBottom: 12 }}>
                      <p style={{ fontSize: 10, color: "#a8a29e", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 700, margin: "0 0 6px 0" }}>🎯 For you</p>
                      {(actionItems.for_you as { text: string }[]).map((item, i) => (
                        <p key={i} style={{ fontSize: 13, color: "#78716c", lineHeight: 1.65, margin: i > 0 ? "4px 0 0 0" : 0, fontStyle: "italic" }}>{item.text}</p>
                      ))}
                    </div>
                  )}

                  {/* Try This Week */}
                  {(actionItems.try_this as { title: string; description: string }[])?.length > 0 && (
                    <div style={{ borderTop: "1px solid #f0ebe4", paddingTop: 12 }}>
                      {(actionItems.try_this as { title: string; description: string }[]).map((item, i) => (
                        <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                          <span style={{ fontSize: 14, marginTop: 1 }}>→</span>
                          <div>
                            <p style={{ fontSize: 13, fontWeight: 700, color: "#f97316", margin: 0 }}>{item.title}</p>
                            <p style={{ fontSize: 12, color: "#44403c", margin: "2px 0 0 0", lineHeight: 1.6 }}>{item.description}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <button
                  onClick={handleActionItems}
                  disabled={actionItemsLoading}
                  style={{
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                    width: "100%", padding: "12px 16px", borderRadius: 12,
                    background: actionItemsLoading ? "#fefce8" : "linear-gradient(135deg, #fef9c3, #fef08a)",
                    border: "1px solid #fde047",
                    color: "#a16207", fontSize: 13, fontWeight: 700,
                    cursor: actionItemsLoading ? "wait" : "pointer",
                    fontFamily: "'DM Sans', sans-serif",
                    transition: "all 0.15s",
                  }}
                >
                  {actionItemsLoading ? (
                    <><Loader2 style={{ width: 14, height: 14 }} className="animate-spin" /> Generating deep dive...</>
                  ) : (
                    <>⚡ Deep Dive</>
                  )}
                </button>
              )}

              {/* ── Tasks ── */}
              <TodoList analysisId={analysis.id} />

              {/* ── Ask about this (Premium) ── */}
              {isPremium ? (
                <div style={{ background: "#faf8f5", border: "1px solid #e7e2d9", borderRadius: 14, padding: 14 }}>
                  {askAnswer && (
                    <div style={{ marginBottom: 12, background: "#fff", border: "1px solid #e7e2d9", borderRadius: 10, padding: 12 }}>
                      <p style={{ fontSize: 10, color: "#f97316", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 700, margin: "0 0 6px 0" }}>Answer</p>
                      <p style={{ fontSize: 13, color: "#44403c", lineHeight: 1.65, margin: 0, whiteSpace: "pre-wrap" }}>{askAnswer}</p>
                    </div>
                  )}
                  <form onSubmit={handleAsk} onClick={(e) => e.stopPropagation()} style={{ display: "flex", gap: 8 }}>
                    <input
                      type="text"
                      value={askQuestion}
                      onChange={(e) => setAskQuestion(e.target.value)}
                      placeholder="Ask about this content..."
                      style={{ flex: 1, padding: "9px 12px", fontSize: 13, border: "1px solid #e7e2d9", borderRadius: 10, outline: "none", color: "#1c1917", fontFamily: "'DM Sans', sans-serif", background: "#fff" }}
                      onFocus={(e) => { e.target.style.borderColor = "#f97316"; }}
                      onBlur={(e) => { e.target.style.borderColor = "#e7e2d9"; }}
                    />
                    <button
                      type="submit"
                      disabled={askLoading || !askQuestion.trim()}
                      style={{ padding: "9px 16px", background: askLoading ? "#fb923c" : "#f97316", color: "#fff", fontWeight: 600, fontSize: 12, borderRadius: 10, border: "none", cursor: askLoading ? "wait" : "pointer", fontFamily: "'DM Sans', sans-serif", flexShrink: 0 }}
                    >
                      {askLoading ? "..." : "Ask"}
                    </button>
                  </form>
                </div>
              ) : (
                <a href="/pricing" onClick={(e) => e.stopPropagation()} style={{ display: "block", textDecoration: "none" }}>
                  <div style={{ background: "#faf8f5", border: "1px dashed #e7e2d9", borderRadius: 14, padding: "12px 14px", textAlign: "center" }}>
                    <p style={{ fontSize: 12, color: "#a8a29e", margin: 0 }}>
                      💬 <span style={{ color: "#f97316", fontWeight: 600 }}>Upgrade to Premium</span> to ask follow-up questions about this content
                    </p>
                  </div>
                </a>
              )}

              {hasVideoMeta && (
                <>
                  <div style={{ height: 1, background: "#f0ebe4" }} />
                  <div style={{ display: "flex", alignItems: "center", gap: 16, fontSize: 12, color: "#a8a29e" }}>
                    {views && <span>{fmtCount(views)} views</span>}
                    {likes && <span>{fmtCount(likes)} likes</span>}
                    {comments && <span>{fmtCount(comments)} comments</span>}
                    {duration && <span>{fmtDuration(duration)}</span>}
                  </div>
                </>
              )}

              <div style={{ height: 1, background: "#f0ebe4" }} />

              {/* ── Action buttons ── */}
              <AnimatePresence mode="wait" initial={false}>
                {deleteState === "confirm" ? (
                  <motion.div key="confirm" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.15 }}
                    style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontSize: 13, color: "#44403c", flex: 1 }}>Delete this analysis?</span>
                    <button onClick={cancelDelete} style={{ ...btnBase, flex: "none", color: "#78716c" }}>Cancel</button>
                    <button onClick={handleDeleteConfirm} style={{ ...btnBase, flex: "none", color: "#ef4444", borderColor: "#fecaca", background: "#fef2f2" }}>Delete</button>
                  </motion.div>
                ) : (
                  <motion.div key="actions" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.15 }}
                    style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <a href={analysis.source_url} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}
                      style={{ ...btnBase, textDecoration: "none" }}>
                      <ExternalLink style={{ width: 13, height: 13 }} /> View
                    </a>
                    <button onClick={handleShare}
                      style={{ ...btnBase, ...(shareStatus === "copied" ? { color: "#10b981", borderColor: "#a7f3d0", background: "#f0fdf4" } : {}) }}>
                      {shareStatus === "copied" ? <><Check style={{ width: 13, height: 13 }} /> Copied!</> : <><Share2 style={{ width: 13, height: 13 }} /> Share</>}
                    </button>
                    <button onClick={handleNotion} disabled={notionStatus === "sending" || notionStatus === "sent"}
                      style={{ ...btnBase, ...(notionStatus === "sent" ? { color: "#10b981", borderColor: "#a7f3d0", background: "#f0fdf4" } : notionStatus === "error" ? { color: "#ef4444", borderColor: "#fecaca", background: "#fef2f2" } : {}) }}>
                      {notionStatus === "sending" ? <><Loader2 style={{ width: 13, height: 13 }} className="animate-spin" /> Saving…</>
                        : notionStatus === "sent" ? <><Check style={{ width: 13, height: 13 }} /> Saved!</>
                        : notionStatus === "error" ? <><X style={{ width: 13, height: 13 }} /> Failed</>
                        : notionConnected ? <><BookOpen style={{ width: 13, height: 13 }} /> Notion</>
                        : <><BookOpen style={{ width: 13, height: 13 }} /> Connect</>}
                    </button>
                    <button onClick={handleDeleteClick} disabled={deleteState === "deleting"}
                      style={{ ...btnBase, color: "#a8a29e" }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "#ef4444"; (e.currentTarget as HTMLButtonElement).style.borderColor = "#fecaca"; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "#a8a29e"; (e.currentTarget as HTMLButtonElement).style.borderColor = "#e7e2d9"; }}>
                      {deleteState === "deleting" ? <Loader2 style={{ width: 13, height: 13 }} className="animate-spin" /> : <><Trash2 style={{ width: 13, height: 13 }} /> Delete</>}
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
