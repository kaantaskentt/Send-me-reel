"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Analysis, AnalysisState } from "@/lib/types";
import { getAnalysisState } from "@/lib/types";
import { parseVerdict } from "@/lib/verdict-parser";
import { formatDistanceToNow } from "date-fns";
import { ChevronDown, ExternalLink, Share2, Trash2, Check } from "lucide-react";
import { useTheme } from "@/lib/theme";

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

// ── State badge ───────────────────────────────────────────────────────────────
function StateBadge({ state }: { state: AnalysisState }) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  if (state === "saved") return null;
  const map: Record<Exclude<AnalysisState, "saved">, { light: { bg: string; color: string; border: string }; dark: { bg: string; color: string; border: string }; label: string }> = {
    tried: {
      light: { bg: "#f0fdf4", color: "#15803d", border: "#bbf7d0" },
      dark:  { bg: "rgba(21,128,61,0.12)", color: "#4ade80", border: "rgba(74,222,128,0.2)" },
      label: "Done",
    },
    set_aside: {
      light: { bg: "#faf8f5", color: "#78716c", border: "#e7e2d9" },
      dark:  { bg: "rgba(255,255,255,0.06)", color: "#a1a1aa", border: "rgba(255,255,255,0.1)" },
      label: "Skipped",
    },
  };
  const s = isDark ? map[state].dark : map[state].light;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center",
      fontSize: 10, fontWeight: 600,
      padding: "2px 9px", borderRadius: 100,
      background: s.bg, color: s.color, border: `1px solid ${s.border}`,
      fontFamily: "'DM Sans', sans-serif",
    }}>
      {map[state].label}
    </span>
  );
}

// ── Props ─────────────────────────────────────────────────────────────────────
interface Props {
  analysis: Analysis;
  isOpen: boolean;
  onToggle: () => void;
  notionConnected: boolean;
  isPremium: boolean;
  premiumTabsUnlocked?: boolean;
  onDeleted: (id: string) => void;
  onStateChanged?: (id: string, state: AnalysisState) => void;
  onStarChanged?: (id: string, starred: boolean, starredAt: string | null) => void;
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function AnalysisCard({ analysis, isOpen, onToggle, onDeleted, onStateChanged, onStarChanged }: Props) {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const [shareStatus, setShareStatus] = useState<"idle" | "copied">("idle");
  const [deleteState, setDeleteState] = useState<"idle" | "confirm" | "deleting">("idle");
  const [taskAdded, setTaskAdded] = useState(false);
  const [addingTask, setAddingTask] = useState(false);
  const [localState, setLocalState] = useState<AnalysisState>(getAnalysisState(analysis));
  const [stateBusy, setStateBusy] = useState(false);
  const [starred, setStarred] = useState(!!analysis.starred_at);

  const parsed = analysis.verdict ? parseVerdict(analysis.verdict) : null;
  const timeAgo = formatDistanceToNow(new Date(analysis.created_at), { addSuffix: true });

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleShare = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await navigator.clipboard.writeText(`${window.location.origin}/a/${analysis.id}`).catch(() => {});
    setShareStatus("copied");
    setTimeout(() => setShareStatus("idle"), 2000);
  };

  const handleDeleteClick = (e: React.MouseEvent) => { e.stopPropagation(); setDeleteState("confirm"); };
  const handleDeleteConfirm = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setDeleteState("deleting");
    await fetch(`/api/analyses/${analysis.id}`, { method: "DELETE" });
    onDeleted(analysis.id);
  };
  const cancelDelete = (e: React.MouseEvent) => { e.stopPropagation(); setDeleteState("idle"); };

  const handleDone = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (stateBusy || localState === "tried") return;
    setStateBusy(true);
    const previous = localState;
    setLocalState("tried");
    try {
      const res = await fetch(`/api/analyses/${analysis.id}/state`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ state: "tried" }),
      });
      if (!res.ok) throw new Error();
      onStateChanged?.(analysis.id, "tried");
    } catch {
      setLocalState(previous);
    }
    setStateBusy(false);
  };

  const handleStar = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const prev = starred;
    setStarred(!prev);
    try {
      const res = await fetch(`/api/analyses/${analysis.id}/star`, { method: "POST" });
      if (!res.ok) throw new Error();
      const data = await res.json();
      onStarChanged?.(analysis.id, data.starred, data.starred_at);
    } catch {
      setStarred(prev);
    }
  };

  const addActionAsTask = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (addingTask || taskAdded || !parsed?.action) return;
    setAddingTask(true);
    try {
      const res = await fetch(`/api/analyses/${analysis.id}/todos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: parsed.action.slice(0, 200) }),
      });
      if (res.ok) setTaskAdded(true);
    } catch {
      // ignore
    }
    setAddingTask(false);
  };

  // ── Theme-aware colors ────────────────────────────────────────────────────
  const PLATFORM_ACCENT: Record<string, string> = {
    instagram: "#E1306C",
    tiktok: "#69C9D0",
    x: "#a1a1aa",
    linkedin: "#0A66C2",
    youtube: "#FF0000",
    article: "#60A5FA",
  };
  const platformAccent = PLATFORM_ACCENT[analysis.platform] ?? "#e7e2d9";

  const cardBg = isDark ? "#111111" : "#fff";
  const normalBorder = isDark ? "rgba(255,255,255,0.08)" : "#e7e2d9";
  const dividerColor = isDark ? "rgba(255,255,255,0.07)" : "#f0ebe4";
  const titleColor = isDark ? "#fafafa" : "#1c1917";
  const timeColor = isDark ? "#52525b" : "#c4bdb5";
  const descColor = isDark ? "#d4d4d8" : "#1c1917";
  const deeperColor = isDark ? "#a1a1aa" : "#57534e";
  const labelColor = "#f97316";
  const footerLinkColor = isDark ? "#71717A" : "#a8a29e";

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12, scale: 0.98 }}
      transition={{ duration: 0.2 }}
      style={{
        background: cardBg,
        ...(isOpen
          ? { border: "1.5px solid #f97316" }
          : {
              borderTop: `1px solid ${normalBorder}`,
              borderRight: `1px solid ${normalBorder}`,
              borderBottom: `1px solid ${normalBorder}`,
              borderLeft: `3px solid ${platformAccent}`,
            }
        ),
        borderRadius: 16,
        overflow: "hidden",
        transition: "border-color 0.2s, box-shadow 0.2s",
        boxShadow: isOpen
          ? "0 4px 24px rgba(249,115,22,0.08)"
          : isDark ? "none" : "0 1px 4px rgba(0,0,0,0.04)",
        fontFamily: "'DM Sans', sans-serif",
      }}
    >
      {/* ── Collapsed header ── */}
      <button
        onClick={onToggle}
        style={{
          width: "100%", textAlign: "left", padding: "14px 16px",
          display: "flex", flexDirection: "column", gap: 6,
          cursor: "pointer", background: "none", border: "none",
          fontFamily: "'DM Sans', sans-serif",
        }}
      >
        {/* Top row: icon + platform name · badge + time + chevron */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <PlatformIcon platform={analysis.platform} />
            <span style={{
              fontSize: 10, fontWeight: 700, color: timeColor,
              letterSpacing: "0.08em", textTransform: "uppercase",
            }}>
              {analysis.platform}
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <StateBadge state={localState} />
            <span style={{ fontSize: 11, color: timeColor }}>{timeAgo}</span>
            <button
              onClick={handleStar}
              style={{ background: "none", border: "none", cursor: "pointer", padding: 2, display: "flex", alignItems: "center", color: starred ? "#f97316" : timeColor, transition: "color 0.15s" }}
              title={starred ? "Unstar" : "Star this"}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill={starred ? "#f97316" : "none"} stroke={starred ? "#f97316" : "currentColor"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
              </svg>
            </button>
            <motion.div
              animate={{ rotate: isOpen ? 180 : 0 }}
              transition={{ duration: 0.2 }}
              style={{ color: timeColor, display: "flex" }}
            >
              <ChevronDown style={{ width: 14, height: 14 }} />
            </motion.div>
          </div>
        </div>
        {/* Title row */}
        <h3 style={{
          fontSize: 14, fontWeight: 700, color: titleColor, lineHeight: 1.4,
          display: "-webkit-box", WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical" as const,
          overflow: "hidden",
          margin: 0, textAlign: "left",
        }}>
          {parsed?.title || "Untitled"}
        </h3>
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
              <div style={{ height: 1, background: dividerColor }} />

              {parsed?.isNewFormat && parsed.description ? (
                <>
                  {/* WHAT IS IT — label above description */}
                  <div style={{ paddingTop: 4 }}>
                    <div style={{
                      fontSize: 10, fontWeight: 700, color: labelColor,
                      textTransform: "uppercase", letterSpacing: "0.08em",
                      fontFamily: "'JetBrains Mono', monospace",
                      marginBottom: 8,
                    }}>
                      WHAT IS IT?
                    </div>
                    <p style={{
                      fontSize: 15.5,
                      color: descColor,
                      lineHeight: 1.55,
                      margin: 0,
                      fontFamily: "'Instrument Serif', Georgia, serif",
                      letterSpacing: -0.1,
                      fontWeight: 400,
                    }}>
                      {parsed.description}
                    </p>
                    {parsed.deeper && (
                      <details style={{ marginTop: 10 }}>
                        <summary style={{ fontSize: 11, fontWeight: 500, color: isDark ? "#71717A" : "#a8a29e", cursor: "pointer", listStyle: "none" }}>
                          + a layer deeper
                        </summary>
                        <p style={{ fontSize: 13, color: deeperColor, lineHeight: 1.6, margin: "6px 0 0 0", fontFamily: "'Instrument Serif', Georgia, serif", fontStyle: "italic" }}>
                          {parsed.deeper}
                        </p>
                      </details>
                    )}
                  </div>

                  {/* TRY THIS ONCE — orange action zone */}
                  {parsed.action && (
                    <div style={{
                      background: isDark ? "rgba(249,115,22,0.06)" : "rgba(249,115,22,0.05)",
                      border: "1px solid rgba(249,115,22,0.2)",
                      borderRadius: 14,
                      padding: "16px 18px",
                    }}>
                      <div style={{
                        fontSize: 10, fontWeight: 700, color: labelColor,
                        textTransform: "uppercase", letterSpacing: "0.08em",
                        fontFamily: "'JetBrains Mono', monospace",
                        marginBottom: 8,
                      }}>
                        TRY THIS ONCE
                      </div>
                      <p style={{
                        fontSize: 16, color: isDark ? "#d4d4d8" : "#0f1d12",
                        lineHeight: 1.55, margin: 0,
                        fontFamily: "'Instrument Serif', Georgia, serif",
                        fontWeight: 400, letterSpacing: -0.1,
                      }}>
                        {parsed.action}
                      </p>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 14, flexWrap: "wrap" }}>
                        <button
                          onClick={addActionAsTask}
                          disabled={addingTask || taskAdded}
                          style={{
                            padding: "6px 14px",
                            fontSize: 12, fontWeight: 600,
                            color: "#15803d",
                            background: taskAdded ? "#fff" : "rgba(255,255,255,0.8)",
                            border: "1px solid #bbf7d0",
                            borderRadius: 100,
                            cursor: addingTask || taskAdded ? "default" : "pointer",
                            fontFamily: "'DM Sans', sans-serif",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {taskAdded ? "✓ Added to tasks" : addingTask ? "Adding…" : "+ Add to tasks"}
                        </button>
                        <a
                          href={analysis.source_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          style={{
                            fontSize: 12, fontWeight: 500,
                            color: "#f97316",
                            textDecoration: "none",
                            opacity: 0.8,
                          }}
                        >
                          View source ↗
                        </a>
                        {taskAdded && (
                          <a
                            href="/tasks"
                            onClick={(e) => e.stopPropagation()}
                            style={{
                              marginLeft: "auto",
                              fontSize: 12,
                              color: "#f97316",
                              textDecoration: "none",
                              fontWeight: 600,
                              opacity: 0.75,
                            }}
                          >
                            View all tasks →
                          </a>
                        )}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                parsed?.body && (
                  <div style={{
                    background: isDark ? "rgba(255,255,255,0.04)" : "#faf8f5",
                    border: `1px solid ${isDark ? "rgba(255,255,255,0.07)" : "#f0ebe4"}`,
                    borderRadius: 12, padding: "14px 16px",
                  }}>
                    <p style={{ fontSize: 13, color: isDark ? "#a1a1aa" : "#44403c", lineHeight: 1.65, margin: 0, whiteSpace: "pre-wrap" }}>{parsed.body}</p>
                  </div>
                )
              )}

              {/* ── Compact footer — always visible ── */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 16, paddingTop: 4 }}>
                <button
                  onClick={handleDone}
                  disabled={stateBusy}
                  style={{
                    fontSize: 12, fontWeight: 600,
                    color: localState === "tried" ? "#10b981" : footerLinkColor,
                    background: "none", border: "none", cursor: localState === "tried" ? "default" : "pointer",
                    display: "flex", alignItems: "center", gap: 4,
                    fontFamily: "'DM Sans', sans-serif", transition: "color 0.15s",
                  }}
                  onMouseEnter={(e) => { if (localState !== "tried") e.currentTarget.style.color = "#10b981"; }}
                  onMouseLeave={(e) => { if (localState !== "tried") e.currentTarget.style.color = footerLinkColor; }}
                >
                  <Check style={{ width: 12, height: 12 }} />
                  {localState === "tried" ? "Done" : "Mark done"}
                </button>
                <a
                  href={analysis.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  style={{ fontSize: 12, color: footerLinkColor, textDecoration: "none", display: "flex", alignItems: "center", gap: 4, transition: "color 0.15s" }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = isDark ? "#a1a1aa" : "#78716c"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = footerLinkColor; }}
                >
                  <ExternalLink style={{ width: 12, height: 12 }} /> View source
                </a>
                <button
                  onClick={handleShare}
                  style={{ fontSize: 12, color: shareStatus === "copied" ? "#10b981" : footerLinkColor, background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 4, fontFamily: "'DM Sans', sans-serif", transition: "color 0.15s" }}
                >
                  {shareStatus === "copied" ? <><Check style={{ width: 12, height: 12 }} /> Copied</> : <><Share2 style={{ width: 12, height: 12 }} /> Share</>}
                </button>
                <AnimatePresence mode="wait">
                  {deleteState === "confirm" ? (
                    <motion.div key="del-confirm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <button onClick={handleDeleteConfirm} style={{ fontSize: 11, color: "#ef4444", background: "none", border: "none", cursor: "pointer", fontFamily: "'DM Sans', sans-serif", fontWeight: 600 }}>Confirm</button>
                      <button onClick={cancelDelete} style={{ fontSize: 11, color: footerLinkColor, background: "none", border: "none", cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>Cancel</button>
                    </motion.div>
                  ) : (
                    <motion.button
                      key="del-btn"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      onClick={handleDeleteClick}
                      style={{ fontSize: 12, color: isDark ? "#3f3f46" : "#d6d3d1", background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 4, fontFamily: "'DM Sans', sans-serif", transition: "color 0.15s" }}
                      onMouseEnter={(e) => { e.currentTarget.style.color = "#ef4444"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.color = isDark ? "#3f3f46" : "#d6d3d1"; }}
                    >
                      <Trash2 style={{ width: 12, height: 12 }} />
                    </motion.button>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
