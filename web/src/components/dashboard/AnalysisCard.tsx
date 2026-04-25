"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Analysis, AnalysisState } from "@/lib/types";
import { getAnalysisState } from "@/lib/types";
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

// ── State badge — Phase 2 user-action axis ────────────────────────────────
// Replaces the old WorthBadge (⭐ Worth your time / Skim it / Skip).
// Saved is the default — no badge so the unmarked state is visually quiet.
// Tried and Set aside are both terminal-good states.
function StateBadge({ state }: { state: AnalysisState }) {
  if (state === "saved") return null;
  const map: Record<Exclude<AnalysisState, "saved">, { bg: string; color: string; border: string; label: string }> = {
    tried: { bg: "#f0fdf4", color: "#15803d", border: "#bbf7d0", label: "Tried" },
    set_aside: { bg: "#faf8f5", color: "#78716c", border: "#e7e2d9", label: "Set aside" },
  };
  const s = map[state];
  return (
    <span style={{
      display: "inline-flex", alignItems: "center",
      fontSize: 10, fontWeight: 600,
      padding: "2px 9px", borderRadius: 100,
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
  /** Phase 5: Deep Dive / Ask / Chat tabs only show when user has earned them
   *  (>= 3 tries lifetime OR has previously used a premium feature). */
  premiumTabsUnlocked?: boolean;
  onDeleted: (id: string) => void;
  /** Phase 2: parent informs the feed to re-bucket this analysis after a state change. */
  onStateChanged?: (id: string, state: AnalysisState) => void;
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function AnalysisCard({ analysis, isOpen, onToggle, notionConnected, isPremium, premiumTabsUnlocked, onDeleted, onStateChanged }: Props) {
  const [activeTab, setActiveTab] = useState<"act" | "chat" | "sync">("act");
  const [notionStatus, setNotionStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [shareStatus, setShareStatus] = useState<"idle" | "copied">("idle");
  const [deleteState, setDeleteState] = useState<"idle" | "confirm" | "deleting">("idle");
  const [actionItems, setActionItems] = useState<Record<string, unknown> | null>(analysis.action_items || null);
  const [actionItemsLoading, setActionItemsLoading] = useState(false);
  const [askQuestion, setAskQuestion] = useState("");
  const [askAnswer, setAskAnswer] = useState<string | null>(null);
  const [askLoading, setAskLoading] = useState(false);

  // Phase 2 state machine. Optimistic local state — parent re-bucket fires on
  // confirmed server response.
  const [localState, setLocalState] = useState<AnalysisState>(getAnalysisState(analysis));
  const [stateBusy, setStateBusy] = useState(false);

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

  // Phase 5: one-time inline message after the first auto-push to Notion.
  // localStorage so we don't need a server-side flag — purely cosmetic.
  const [showNotionAck, setShowNotionAck] = useState(false);

  // Phase 5+: "+ Add as task" affordance on the 🌱 action line.
  // Closes the biggest UX gap — the user reads an action and now has a
  // one-click path to capture it into their tracked task list.
  const [taskAdded, setTaskAdded] = useState(false);
  const [addingTask, setAddingTask] = useState(false);

  // Apr 25 redesign — three-phase transition for tried/set_aside clicks.
  // 'idle': normal card. 'transforming': show in-place attestation (sage tint,
  // description fades, action box becomes a "what you did" message). After
  // ~3 seconds we notify the parent (which re-buckets the card to its new
  // pile). This gives the user a clear felt moment of completion instead of
  // the previous silent slide.
  const [transitionPhase, setTransitionPhase] = useState<"idle" | "transforming">("idle");
  const [showOverflow, setShowOverflow] = useState(false);

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

  // Apr 25 redesign — three-phase setState. Optimistic state flip → server
  // confirms → in-place transformation runs for 3 seconds → THEN we notify
  // the parent (triggering the pile re-bucket). The 3-second window gives
  // the user a clear felt completion before the card visually leaves.
  // Reverting (e.g. tried → saved) skips the transformation and bucket-moves
  // immediately.
  const setState = async (target: AnalysisState) => {
    if (stateBusy || target === localState) return;
    setStateBusy(true);
    const previous = localState;
    const isCommit = target !== "saved"; // tried OR set_aside is a "commit"
    setLocalState(target);
    try {
      const res = await fetch(`/api/analyses/${analysis.id}/state`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ state: target }),
      });
      if (!res.ok) throw new Error("state update failed");
      const data = await res.json().catch(() => ({}));

      if (isCommit) {
        // Show the transformation in place, then re-bucket after 3 seconds.
        setTransitionPhase("transforming");
        setTimeout(() => {
          setTransitionPhase("idle");
          onStateChanged?.(analysis.id, target);
        }, 3000);
      } else {
        // Reverting to "saved" — just re-bucket immediately.
        onStateChanged?.(analysis.id, target);
      }

      if (data.notion_auto_pushed) {
        try {
          const acked = typeof window !== "undefined" && localStorage.getItem("cd_notion_autopush_acked");
          if (!acked) {
            setShowNotionAck(true);
            if (typeof window !== "undefined") {
              localStorage.setItem("cd_notion_autopush_acked", "1");
            }
          }
        } catch {
          // ignore localStorage failures
        }
      }
    } catch {
      setLocalState(previous);
      setTransitionPhase("idle");
    }
    setStateBusy(false);
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
          <h3 style={{ fontSize: 15, fontWeight: 700, color: "#1c1917", lineHeight: 1.35, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", margin: "0 0 4px 0" }}>
            {parsed?.title || "Untitled"}
          </h3>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <StateBadge state={localState} />
            <span style={{ fontSize: 11, color: "#c4bdb5" }}>{timeAgo}</span>
          </div>
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

              {/* Apr 25 redesign — editorial three-zone composition:
                  (1) DESCRIPTION — the read. Instrument Serif, generous breath.
                  (2) ACTION ZONE — sage gradient mesh + grain, the thing-to-try.
                  (3) STATE BUTTONS — primary commit + secondary set-aside.

                  When transitioning, the action zone replaces itself with an
                  attestation block (sage-tinted, "what you did" voice) for ~3
                  seconds before the parent re-buckets the card. */}

              {parsed?.isNewFormat && parsed.description ? (
                <>
                  {/* (1) Description — Instrument Serif, magazine-feel */}
                  <div style={{
                    padding: "8px 4px 4px",
                    opacity: transitionPhase === "transforming" ? 0.55 : 1,
                    transition: "opacity 0.6s ease",
                  }}>
                    <p style={{
                      fontSize: 15.5,
                      color: "#1c1917",
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
                        <summary style={{ fontSize: 11, fontWeight: 500, color: "#a8a29e", cursor: "pointer", listStyle: "none" }}>
                          + a layer deeper
                        </summary>
                        <p style={{ fontSize: 13, color: "#57534e", lineHeight: 1.6, margin: "6px 0 0 0", fontFamily: "'Instrument Serif', Georgia, serif", fontStyle: "italic" }}>
                          {parsed.deeper}
                        </p>
                      </details>
                    )}
                  </div>

                  {/* (2) Action zone — sage gradient + grain. Transforms during the
                      3-second post-commit window into a "what you did" attestation. */}
                  {parsed.action && transitionPhase === "idle" && (
                    <div style={{
                      position: "relative",
                      background: "linear-gradient(135deg, #f7fcf8 0%, #f0fdf4 50%, #ecfdf5 100%)",
                      border: "1px solid #d6f0db",
                      borderRadius: 14,
                      padding: "16px 18px",
                      overflow: "hidden",
                    }}>
                      {/* paper-grain overlay — inline SVG noise at low opacity */}
                      <div aria-hidden style={{
                        position: "absolute", inset: 0, opacity: 0.04, pointerEvents: "none",
                        backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' /></filter><rect width='100%25' height='100%25' filter='url(%23n)'/></svg>")`,
                      }} />
                      <div style={{ position: "relative" }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: "#15803d", textTransform: "uppercase", letterSpacing: 0.6, display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                          <span style={{ fontSize: 13 }}>🌱</span><span>Try this once</span>
                        </div>
                        <p style={{ fontSize: 16, color: "#0f1d12", lineHeight: 1.55, margin: 0, fontFamily: "'Instrument Serif', Georgia, serif", fontWeight: 400, letterSpacing: -0.1 }}>
                          {parsed.action}
                        </p>
                        <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 14, flexWrap: "wrap" }}>
                          <button
                            onClick={addActionAsTask}
                            disabled={addingTask || taskAdded}
                            style={{
                              padding: "6px 14px",
                              fontSize: 12,
                              fontWeight: 600,
                              color: taskAdded ? "#15803d" : "#15803d",
                              background: taskAdded ? "#fff" : "rgba(255,255,255,0.8)",
                              border: `1px solid ${taskAdded ? "#bbf7d0" : "#bbf7d0"}`,
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
                              fontSize: 12,
                              fontWeight: 500,
                              color: "#15803d",
                              textDecoration: "none",
                              opacity: 0.75,
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
                                color: "#6B8E6F",
                                textDecoration: "none",
                                fontWeight: 600,
                              }}
                            >
                              View all tasks →
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* (2-alt) Transformation attestation — replaces action zone for
                      ~3 seconds after a commit click. The user sees a felt moment
                      of completion before the card re-buckets. */}
                  {transitionPhase === "transforming" && (
                    <motion.div
                      key="attestation"
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
                      style={{
                        position: "relative",
                        background: localState === "tried"
                          ? "linear-gradient(135deg, #ecfdf5 0%, #d1fae5 60%, #a7f3d0 100%)"
                          : "linear-gradient(135deg, #faf8f5 0%, #f0ebe4 50%, #ddd6c8 100%)",
                        border: localState === "tried" ? "1px solid #6ee7b7" : "1px solid #d4cec4",
                        borderRadius: 14,
                        padding: "20px 22px",
                        overflow: "hidden",
                      }}
                    >
                      <div aria-hidden style={{
                        position: "absolute", inset: 0, opacity: 0.05, pointerEvents: "none",
                        backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' /></filter><rect width='100%25' height='100%25' filter='url(%23n)'/></svg>")`,
                      }} />
                      <div style={{ position: "relative" }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: localState === "tried" ? "#065f46" : "#57534e", textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 10 }}>
                          {localState === "tried" ? "What you did" : "Set aside"}
                        </div>
                        {parsed.action && localState === "tried" && (
                          <p style={{ fontSize: 16, color: "#064e3b", lineHeight: 1.55, margin: 0, fontFamily: "'Instrument Serif', Georgia, serif", fontWeight: 400 }}>
                            {parsed.action}
                          </p>
                        )}
                        {localState === "set_aside" && (
                          <p style={{ fontSize: 16, color: "#3f3f3f", lineHeight: 1.55, margin: 0, fontFamily: "'Instrument Serif', Georgia, serif", fontStyle: "italic", fontWeight: 400 }}>
                            No homework. Just a watch.
                          </p>
                        )}
                        <p style={{
                          fontSize: 12.5,
                          color: localState === "tried" ? "#065f46" : "#78716c",
                          lineHeight: 1.5,
                          margin: "12px 0 0 0",
                          fontFamily: "'Instrument Serif', Georgia, serif",
                          fontStyle: "italic",
                          opacity: 0.85,
                        }}>
                          {localState === "tried" ? (
                            <>
                              Saved to your archive.{" "}
                              <a
                                href="/tasks"
                                onClick={(e) => e.stopPropagation()}
                                style={{ color: "inherit", textDecoration: "underline", fontStyle: "normal", fontWeight: 500 }}
                              >
                                view
                              </a>
                            </>
                          ) : (
                            <>You&apos;re allowed to just have watched it.</>
                          )}
                        </p>
                      </div>
                    </motion.div>
                  )}
                </>
              ) : (
                parsed?.body && (
                  <div style={{ background: "#faf8f5", border: "1px solid #f0ebe4", borderRadius: 12, padding: "14px 16px" }}>
                    <p style={{ fontSize: 13, color: "#44403c", lineHeight: 1.65, margin: 0, whiteSpace: "pre-wrap" }}>{parsed.body}</p>
                  </div>
                )
              )}

              {/* (3) State buttons — primary "I tried it" sage; secondary "Just watched"
                  ghost. Hidden during transformation phase to avoid double-clicks
                  and to let the attestation breathe. */}
              {transitionPhase === "idle" && (
                <div onClick={(e) => e.stopPropagation()} style={{ display: "flex", gap: 10, paddingTop: 4 }}>
                  <button
                    onClick={() => setState(localState === "tried" ? "saved" : "tried")}
                    disabled={stateBusy}
                    style={{
                      flex: 1, padding: "12px 16px", fontSize: 14, fontWeight: 600,
                      fontFamily: "'DM Sans', sans-serif",
                      color: localState === "tried" ? "#fff" : "#fff",
                      background: localState === "tried" ? "#15803d" : "#6B8E6F",
                      border: "none",
                      borderRadius: 100,
                      cursor: stateBusy ? "wait" : "pointer",
                      transition: "all 0.15s",
                      boxShadow: "0 1px 2px rgba(28,25,23,0.06)",
                    }}
                  >
                    {localState === "tried" ? "✓ Tried it" : "I tried it"}
                  </button>
                  <button
                    onClick={() => setState(localState === "set_aside" ? "saved" : "set_aside")}
                    disabled={stateBusy}
                    style={{
                      flex: 1, padding: "12px 16px", fontSize: 14, fontWeight: 500,
                      fontFamily: "'DM Sans', sans-serif",
                      color: "#57534e",
                      background: "transparent",
                      border: `1px solid ${localState === "set_aside" ? "#d4cec4" : "#e7e2d9"}`,
                      borderRadius: 100,
                      cursor: stateBusy ? "wait" : "pointer",
                      transition: "all 0.15s",
                    }}
                  >
                    {localState === "set_aside" ? "✓ Set aside" : "Just watched"}
                  </button>
                </div>
              )}

              {/* Phase 5 — one-time inline ack after first Notion auto-push */}
              {showNotionAck && (
                <div style={{
                  background: "#f0fdf4",
                  border: "1px solid #bbf7d0",
                  borderRadius: 12,
                  padding: "10px 14px",
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 10,
                  fontSize: 12,
                  color: "#15803d",
                  lineHeight: 1.55,
                }}>
                  <span style={{ flexShrink: 0 }}>📒</span>
                  <span>
                    Saved to your Notion. From now on, anything you mark &quot;tried&quot; auto-saves there — your tried-it archive.
                  </span>
                  <button
                    onClick={(e) => { e.stopPropagation(); setShowNotionAck(false); }}
                    style={{
                      flexShrink: 0,
                      marginLeft: "auto",
                      background: "none",
                      border: "none",
                      color: "#15803d",
                      fontWeight: 600,
                      cursor: "pointer",
                      fontFamily: "'DM Sans', sans-serif",
                    }}
                  >
                    Got it
                  </button>
                </div>
              )}

              {/* Phase 5+ — the legacy 🎯 "for your work" box is retired UI-side too.
                  Pre-pivot verdicts in the DB still have this line in their text;
                  the parser still extracts it for backward parsing, but we no longer
                  render it. The profile-bias shame trigger should never be visible. */}

              {/* Apr 25 redesign — premium tabs + footer actions are gated behind
                  a "⋯ More" toggle so they don't compete with the primary read /
                  action / state-buttons hierarchy. Hidden during the transformation
                  phase too. */}
              {transitionPhase === "idle" && (premiumTabsUnlocked || true) && (
                <button
                  onClick={(e) => { e.stopPropagation(); setShowOverflow((v) => !v); }}
                  style={{
                    alignSelf: "center",
                    padding: "4px 12px",
                    fontSize: 11,
                    fontWeight: 500,
                    color: "#a8a29e",
                    background: "transparent",
                    border: "none",
                    cursor: "pointer",
                    fontFamily: "'DM Sans', sans-serif",
                    marginTop: 2,
                  }}
                >
                  {showOverflow ? "Hide options" : "⋯ More"}
                </button>
              )}

              {/* Phase 5 — Act / Chat / Sync tabs only show when the user has
                   earned them (>= 3 tries OR previously used Deep Dive). */}
              {premiumTabsUnlocked && showOverflow && (
                <div style={{ display: "flex", background: "#f5f1eb", borderRadius: 10, padding: 3 }}>
                  {([
                    { key: "act" as const, label: "✅ Act" },
                    { key: "chat" as const, label: "💬 Chat" },
                    { key: "sync" as const, label: "🔄 Sync" },
                  ]).map((tab) => (
                    <button
                      key={tab.key}
                      onClick={(e) => { e.stopPropagation(); setActiveTab(tab.key); }}
                      style={{
                        flex: 1, padding: "7px 0", fontSize: 12, fontWeight: 600, borderRadius: 8,
                        border: "none", cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
                        background: activeTab === tab.key ? "#fff" : "transparent",
                        color: activeTab === tab.key ? "#1c1917" : "#a8a29e",
                        boxShadow: activeTab === tab.key ? "0 1px 4px rgba(0,0,0,0.06)" : "none",
                        transition: "all 0.15s",
                      }}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              )}

              {/* ── Tab Content (only when premium tabs are unlocked + overflow open) ── */}
              {premiumTabsUnlocked && showOverflow && <div onClick={(e) => e.stopPropagation()} style={{ minHeight: 60 }}>

                {/* ACT tab — tasks */}
                {activeTab === "act" && (
                  <TodoList analysisId={analysis.id} />
                )}

                {/* CHAT tab — deep dive + ask */}
                {activeTab === "chat" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {/* Deep Dive */}
                    {actionItems ? (
                      <div style={{ background: "#faf8f5", border: "1px solid #f0ebe4", borderRadius: 12, padding: 14, display: "flex", flexDirection: "column", gap: 10 }}>
                        {(actionItems.insights as { text: string }[])?.length > 0 && (
                          <div>
                            <p style={{ fontSize: 10, color: "#a8a29e", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 700, margin: "0 0 6px 0" }}>💡 What stood out</p>
                            {(actionItems.insights as { text: string }[]).map((item, i) => (
                              <p key={i} style={{ fontSize: 13, color: "#44403c", lineHeight: 1.65, margin: i > 0 ? "4px 0 0 0" : 0 }}>{item.text}</p>
                            ))}
                          </div>
                        )}
                        {(actionItems.resources as { name: string; description: string; link?: string; price?: string }[])?.length > 0 && (
                          <div style={{ borderTop: "1px solid #e7e2d9", paddingTop: 10 }}>
                            <p style={{ fontSize: 10, color: "#a8a29e", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 700, margin: "0 0 6px 0" }}>🔧 Tools they named</p>
                            <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                              {(actionItems.resources as { name: string; description: string; link?: string; price?: string }[]).map((item, i) => (
                                item.link ? (
                                  <a key={i} href={item.link} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} title={item.description}
                                    style={{ fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 100, background: "#eff6ff", color: "#2563eb", border: "1px solid #bfdbfe", textDecoration: "none" }}>
                                    {item.name}
                                  </a>
                                ) : (
                                  <span key={i} title={item.description} style={{ fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 100, background: "#f5f1eb", color: "#44403c", border: "1px solid #e7e2d9" }}>{item.name}</span>
                                )
                              ))}
                            </div>
                          </div>
                        )}
                        {/* 🎯 For you section deleted in this round. The Deep Dive
                            prompt now always returns for_you: []. Legacy cached
                            action_items with populated for_you data are silently
                            dropped from render — same anti-bias treatment as the
                            verdict's 🎯 line. */}
                        {(actionItems.try_this as { title: string; description: string }[])?.length > 0 && (
                          <div style={{ borderTop: "1px solid #e7e2d9", paddingTop: 10 }}>
                            {(actionItems.try_this as { title: string; description: string }[]).map((item, i) => (
                              <div key={i} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                                <span style={{ fontSize: 13, marginTop: 1 }}>→</span>
                                <div>
                                  <p style={{ fontSize: 12, fontWeight: 700, color: "#f97316", margin: 0 }}>{item.title}</p>
                                  <p style={{ fontSize: 12, color: "#44403c", margin: "2px 0 0 0", lineHeight: 1.5 }}>{item.description}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : (
                      <button onClick={handleActionItems} disabled={actionItemsLoading}
                        style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, width: "100%", padding: "11px 16px", borderRadius: 10, background: actionItemsLoading ? "#fefce8" : "linear-gradient(135deg, #fef9c3, #fef08a)", border: "1px solid #fde047", color: "#a16207", fontSize: 13, fontWeight: 700, cursor: actionItemsLoading ? "wait" : "pointer", fontFamily: "'DM Sans', sans-serif" }}>
                        {actionItemsLoading ? <><Loader2 style={{ width: 14, height: 14 }} className="animate-spin" /> Generating...</> : <>⚡ Look closer</>}
                      </button>
                    )}

                    {/* Chat link (premium) / upsell (free) */}
                    {isPremium ? (
                      <a href={`/chat?analysis=${analysis.id}`} onClick={(e) => e.stopPropagation()} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, textDecoration: "none", padding: "11px 14px", background: "#faf8f5", border: "1px solid #e7e2d9", borderRadius: 10, transition: "all 0.15s" }}
                        onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#f97316"; e.currentTarget.style.background = "#fff7ed"; }}
                        onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#e7e2d9"; e.currentTarget.style.background = "#faf8f5"; }}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f97316" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
                        <span style={{ fontSize: 13, fontWeight: 600, color: "#f97316" }}>Chat about this →</span>
                      </a>
                    ) : (
                      <a href="/pricing" onClick={(e) => e.stopPropagation()} style={{ display: "block", textDecoration: "none" }}>
                        <div style={{ background: "#faf8f5", border: "1px dashed #e7e2d9", borderRadius: 10, padding: "11px 14px", textAlign: "center" }}>
                          <p style={{ fontSize: 12, color: "#a8a29e", margin: 0 }}>
                            💬 <span style={{ color: "#f97316", fontWeight: 600 }}>Upgrade to Premium</span> to chat about this content
                          </p>
                        </div>
                      </a>
                    )}
                  </div>
                )}

                {/* SYNC tab — connectors */}
                {activeTab === "sync" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    <button onClick={handleNotion} disabled={notionStatus === "sending" || notionStatus === "sent"}
                      style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "10px 14px", background: notionStatus === "sent" ? "#f0fdf4" : "#faf8f5", border: `1px solid ${notionStatus === "sent" ? "#bbf7d0" : "#e7e2d9"}`, borderRadius: 12, cursor: "pointer", fontFamily: "'DM Sans', sans-serif", textAlign: "left" }}>
                      <div style={{ width: 28, height: 28, borderRadius: 8, background: "#1c1917", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        <span style={{ color: "white", fontSize: 14, fontWeight: 700 }}>N</span>
                      </div>
                      <div style={{ flex: 1 }}>
                        <p style={{ fontSize: 13, fontWeight: 600, color: "#1c1917", margin: 0 }}>Notion</p>
                        <p style={{ fontSize: 11, color: "#a8a29e", margin: 0 }}>{notionConnected ? "Save this analysis" : "Connect Notion first"}</p>
                      </div>
                      <span style={{ fontSize: 11, fontWeight: 600, color: notionStatus === "sent" ? "#16a34a" : notionStatus === "sending" ? "#f97316" : "#78716c" }}>
                        {notionStatus === "sending" ? "Saving..." : notionStatus === "sent" ? "✓ Saved" : notionStatus === "error" ? "Failed" : "Save"}
                      </span>
                    </button>
                    {[
                      { name: "Todoist", color: "#e44332", icon: "✓" },
                      { name: "Google Calendar", color: "#4285f4", icon: "📅" },
                    ].map((c) => (
                      <div key={c.name} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", background: "#faf8f5", border: "1px solid #f0ebe4", borderRadius: 12, opacity: 0.6 }}>
                        <div style={{ width: 28, height: 28, borderRadius: 8, background: c.color, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                          <span style={{ color: "white", fontSize: 12 }}>{c.icon}</span>
                        </div>
                        <div style={{ flex: 1 }}>
                          <p style={{ fontSize: 13, fontWeight: 600, color: "#1c1917", margin: 0 }}>{c.name}</p>
                        </div>
                        <span style={{ fontSize: 11, fontWeight: 600, color: "#a8a29e" }}>Soon</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>}

              {/* ── Compact action links — only visible when overflow is open ── */}
              {showOverflow && transitionPhase === "idle" && (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 16, paddingTop: 4 }}>
                  <a href={analysis.source_url} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}
                    style={{ fontSize: 12, color: "#a8a29e", textDecoration: "none", display: "flex", alignItems: "center", gap: 4, transition: "color 0.15s" }}
                    onMouseEnter={(e) => { e.currentTarget.style.color = "#78716c"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.color = "#a8a29e"; }}>
                    <ExternalLink style={{ width: 12, height: 12 }} /> View source
                  </a>
                  <button onClick={handleShare}
                    style={{ fontSize: 12, color: shareStatus === "copied" ? "#10b981" : "#a8a29e", background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 4, fontFamily: "'DM Sans', sans-serif", transition: "color 0.15s" }}>
                    {shareStatus === "copied" ? <><Check style={{ width: 12, height: 12 }} /> Copied</> : <><Share2 style={{ width: 12, height: 12 }} /> Share</>}
                  </button>
                  <AnimatePresence mode="wait">
                    {deleteState === "confirm" ? (
                      <motion.div key="del-confirm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <button onClick={handleDeleteConfirm} style={{ fontSize: 11, color: "#ef4444", background: "none", border: "none", cursor: "pointer", fontFamily: "'DM Sans', sans-serif", fontWeight: 600 }}>Confirm</button>
                        <button onClick={cancelDelete} style={{ fontSize: 11, color: "#a8a29e", background: "none", border: "none", cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>Cancel</button>
                      </motion.div>
                    ) : (
                      <motion.button key="del-btn" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        onClick={handleDeleteClick}
                        style={{ fontSize: 12, color: "#d6d3d1", background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 4, fontFamily: "'DM Sans', sans-serif", transition: "color 0.15s" }}
                        onMouseEnter={(e) => { e.currentTarget.style.color = "#ef4444"; }}
                        onMouseLeave={(e) => { e.currentTarget.style.color = "#d6d3d1"; }}>
                        <Trash2 style={{ width: 12, height: 12 }} />
                      </motion.button>
                    )}
                  </AnimatePresence>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
