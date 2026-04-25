"use client";

/**
 * Phase 3 hero card — "this week's one thing".
 *
 * Apr 25 redesign — editorial-organic. Two-zone composition:
 *   1. The description (Instrument Serif, large, dominant) — this is the read.
 *   2. The action zone (sage gradient mesh + grain) — this is the moment.
 *
 * On a tried/set-aside click: the action zone transforms in place into a
 * "what you did" attestation for ~3 seconds, then the parent re-buckets the
 * card. Replaces the previous silent slide between piles.
 */

import { useState } from "react";
import { motion } from "framer-motion";
import { formatDistanceToNow } from "date-fns";
import type { Analysis, AnalysisState } from "@/lib/types";
import { getAnalysisState } from "@/lib/types";
import { parseVerdict } from "@/lib/verdict-parser";

interface Props {
  analysis: Analysis;
  onStateChanged: (id: string, state: AnalysisState) => void;
}

export default function WeekHero({ analysis, onStateChanged }: Props) {
  const parsed = analysis.verdict ? parseVerdict(analysis.verdict) : null;
  const [localState, setLocalState] = useState<AnalysisState>(getAnalysisState(analysis));
  const [busy, setBusy] = useState(false);
  const [transitionPhase, setTransitionPhase] = useState<"idle" | "transforming">("idle");

  // Apr 25: 3-phase commit. Optimistic state flip → transformation → re-bucket.
  // Reverting to "saved" skips the transformation.
  const setState = async (target: AnalysisState) => {
    if (busy || target === localState) return;
    setBusy(true);
    const previous = localState;
    const isCommit = target !== "saved";
    setLocalState(target);
    try {
      const res = await fetch(`/api/analyses/${analysis.id}/state`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ state: target }),
      });
      if (!res.ok) throw new Error();
      if (isCommit) {
        setTransitionPhase("transforming");
        setTimeout(() => {
          setTransitionPhase("idle");
          onStateChanged(analysis.id, target);
        }, 3000);
      } else {
        onStateChanged(analysis.id, target);
      }
    } catch {
      setLocalState(previous);
      setTransitionPhase("idle");
    }
    setBusy(false);
  };

  // "+ Add as task" on the action zone — same pattern as AnalysisCard.
  const [taskAdded, setTaskAdded] = useState(false);
  const [addingTask, setAddingTask] = useState(false);
  const addActionAsTask = async () => {
    if (addingTask || taskAdded || !action) return;
    setAddingTask(true);
    try {
      const res = await fetch(`/api/analyses/${analysis.id}/todos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: action.slice(0, 200) }),
      });
      if (res.ok) setTaskAdded(true);
    } catch {
      // ignore
    }
    setAddingTask(false);
  };

  let domain = "";
  try { domain = new URL(analysis.source_url).hostname.replace(/^www\./, ""); } catch { /* ignore */ }
  const timeAgo = formatDistanceToNow(new Date(analysis.created_at), { addSuffix: true });

  const description = parsed?.description ?? parsed?.body ?? "";
  const action = parsed?.action;
  const noHomework = parsed?.noHomework;

  // SVG paper-grain — inline, low-opacity overlay used to take the digital sheen
  // off the action zone surfaces. CSS-only, no asset request.
  const grainBackground = `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' /></filter><rect width='100%25' height='100%25' filter='url(%23n)'/></svg>")`;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
      style={{
        position: "relative",
        background: "#fff",
        border: "1px solid #e7e2d9",
        borderRadius: 24,
        padding: "32px 32px 28px",
        boxShadow: "0 6px 32px rgba(28,25,23,0.05), 0 1px 3px rgba(28,25,23,0.04)",
        fontFamily: "'DM Sans', sans-serif",
        overflow: "hidden",
      }}
    >
      {/* Paper grain on the card surface itself — anti-screen feel */}
      <div aria-hidden style={{
        position: "absolute", inset: 0, opacity: 0.025, pointerEvents: "none",
        backgroundImage: grainBackground,
      }} />

      <div style={{ position: "relative" }}>
        {/* Header chip — sage label */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 22 }}>
          <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.8, textTransform: "uppercase", color: "#6B8E6F" }}>
            This week&apos;s one thing
          </span>
          <span style={{ fontSize: 11, color: "#c4bdb5", fontWeight: 500 }}>
            from{" "}
            <a
              href={analysis.source_url}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: "#a8a29e", textDecoration: "none", borderBottom: "1px dotted #d6d3d1" }}
            >
              {domain || "source"}
            </a>
            {" · "}{timeAgo}
          </span>
        </div>

        {/* (1) Description — the read. Instrument Serif at 19px, generous breath */}
        {description && (
          <p style={{
            fontSize: 19,
            color: "#1c1917",
            lineHeight: 1.45,
            margin: "0 0 24px 0",
            fontFamily: "'Instrument Serif', Georgia, serif",
            fontWeight: 400,
            letterSpacing: -0.2,
            opacity: transitionPhase === "transforming" ? 0.55 : 1,
            transition: "opacity 0.6s ease",
          }}>
            {description}
          </p>
        )}

        {/* (2) Action zone — sage gradient mesh + grain. The moment. */}
        {action && !noHomework && transitionPhase === "idle" && (
          <div style={{
            position: "relative",
            background: "linear-gradient(135deg, #f0fdf4 0%, #dcfce7 50%, #bbf7d0 100%)",
            border: "1px solid #86efac",
            borderRadius: 18,
            padding: "22px 26px",
            marginBottom: 22,
            overflow: "hidden",
          }}>
            <div aria-hidden style={{
              position: "absolute", inset: 0, opacity: 0.06, pointerEvents: "none",
              backgroundImage: grainBackground,
            }} />
            <div style={{ position: "relative" }}>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.8, textTransform: "uppercase", color: "#15803d", display: "flex", alignItems: "center", gap: 7, marginBottom: 10 }}>
                <span style={{ fontSize: 14 }}>🌱</span>
                <span>Try this once</span>
              </div>
              <p style={{
                fontSize: 21,
                color: "#052e16",
                lineHeight: 1.4,
                margin: 0,
                fontFamily: "'Instrument Serif', Georgia, serif",
                fontWeight: 400,
                letterSpacing: -0.2,
              }}>
                {action}
              </p>
              <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 18, flexWrap: "wrap" }}>
                <button
                  onClick={addActionAsTask}
                  disabled={addingTask || taskAdded}
                  style={{
                    padding: "8px 16px",
                    fontSize: 13,
                    fontWeight: 600,
                    color: "#15803d",
                    background: "rgba(255,255,255,0.85)",
                    border: "1px solid #86efac",
                    borderRadius: 100,
                    cursor: addingTask || taskAdded ? "default" : "pointer",
                    fontFamily: "'DM Sans', sans-serif",
                    whiteSpace: "nowrap",
                  }}
                >
                  {taskAdded ? "✓ Added to tasks" : addingTask ? "Adding…" : "+ Add to tasks"}
                </button>
                {taskAdded && (
                  <a
                    href="/tasks"
                    style={{
                      fontSize: 13,
                      color: "#15803d",
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

        {/* (2-alt) No-action verdict — subtle muted callout */}
        {(noHomework || (!action && parsed)) && transitionPhase === "idle" && (
          <p style={{
            fontSize: 14,
            color: "#a8a29e",
            margin: "0 0 22px 0",
            fontFamily: "'Instrument Serif', Georgia, serif",
            fontStyle: "italic",
          }}>
            No homework here. Just a watch.
          </p>
        )}

        {/* (2-alt) Transformation attestation — replaces action zone for ~3 seconds
            after a commit click. Sage tint + Instrument Serif "what you did" voice. */}
        {transitionPhase === "transforming" && (
          <motion.div
            key="hero-attestation"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
            style={{
              position: "relative",
              background: localState === "tried"
                ? "linear-gradient(135deg, #ecfdf5 0%, #d1fae5 60%, #a7f3d0 100%)"
                : "linear-gradient(135deg, #faf8f5 0%, #f0ebe4 50%, #ddd6c8 100%)",
              border: localState === "tried" ? "1px solid #6ee7b7" : "1px solid #d4cec4",
              borderRadius: 18,
              padding: "26px 28px",
              marginBottom: 22,
              overflow: "hidden",
            }}
          >
            <div aria-hidden style={{
              position: "absolute", inset: 0, opacity: 0.06, pointerEvents: "none",
              backgroundImage: grainBackground,
            }} />
            <div style={{ position: "relative" }}>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.8, textTransform: "uppercase", color: localState === "tried" ? "#065f46" : "#57534e", marginBottom: 12 }}>
                {localState === "tried" ? "What you did" : "Set aside"}
              </div>
              {action && localState === "tried" && (
                <p style={{ fontSize: 21, color: "#064e3b", lineHeight: 1.4, margin: 0, fontFamily: "'Instrument Serif', Georgia, serif", fontWeight: 400, letterSpacing: -0.2 }}>
                  {action}
                </p>
              )}
              {localState === "set_aside" && (
                <p style={{ fontSize: 21, color: "#3f3f3f", lineHeight: 1.4, margin: 0, fontFamily: "'Instrument Serif', Georgia, serif", fontStyle: "italic", fontWeight: 400, letterSpacing: -0.2 }}>
                  No homework. Just a watch.
                </p>
              )}
              <p style={{
                fontSize: 13.5,
                color: localState === "tried" ? "#065f46" : "#78716c",
                lineHeight: 1.5,
                margin: "16px 0 0 0",
                fontFamily: "'Instrument Serif', Georgia, serif",
                fontStyle: "italic",
                opacity: 0.85,
              }}>
                {localState === "tried" ? (
                  <>
                    Saved to your archive.{" "}
                    <a
                      href="/tasks"
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

        {/* (3) State buttons — primary commit (sage) + secondary set-aside (ghost).
            Hidden during transformation phase. */}
        {transitionPhase === "idle" && (
          <div style={{ display: "flex", gap: 12 }}>
            <button
              onClick={() => setState(localState === "tried" ? "saved" : "tried")}
              disabled={busy}
              style={{
                flex: 1,
                padding: "14px 18px",
                fontSize: 15,
                fontWeight: 600,
                color: "#fff",
                background: localState === "tried" ? "#15803d" : "#6B8E6F",
                border: "none",
                borderRadius: 100,
                cursor: busy ? "wait" : "pointer",
                transition: "all 0.15s",
                boxShadow: "0 2px 4px rgba(28,25,23,0.08)",
                fontFamily: "'DM Sans', sans-serif",
              }}
            >
              {localState === "tried" ? "✓ Tried it" : "I tried it"}
            </button>
            <button
              onClick={() => setState(localState === "set_aside" ? "saved" : "set_aside")}
              disabled={busy}
              style={{
                flex: 1,
                padding: "14px 18px",
                fontSize: 15,
                fontWeight: 500,
                color: "#57534e",
                background: "transparent",
                border: `1px solid ${localState === "set_aside" ? "#d4cec4" : "#e7e2d9"}`,
                borderRadius: 100,
                cursor: busy ? "wait" : "pointer",
                transition: "all 0.15s",
                fontFamily: "'DM Sans', sans-serif",
              }}
            >
              {localState === "set_aside" ? "✓ Set aside" : "Just watched"}
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );
}
