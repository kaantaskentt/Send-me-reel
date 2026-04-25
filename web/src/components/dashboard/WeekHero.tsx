"use client";

/**
 * Phase 3 — "this week's one thing" hero card.
 *
 * The dominant element on the dashboard. The user lands and sees ONE thing.
 * Strategy.md §6 + transformation-plan §8: "If a feed is making you feel
 * behind instead of informed, it's not serving you." The hero replaces the
 * scrollable feed pattern at the top with a single calm decision moment.
 *
 * Renders:
 *   📍 What this is (the description)
 *   🌱 Try this once (prominent, Instrument Serif)   OR   🍵 Just a watch
 *   from <source> · <time> ago
 *   [ I tried it ]   [ Just watched it ]
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

  const setState = async (target: AnalysisState) => {
    if (busy || target === localState) return;
    setBusy(true);
    const previous = localState;
    setLocalState(target);
    try {
      const res = await fetch(`/api/analyses/${analysis.id}/state`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ state: target }),
      });
      if (!res.ok) throw new Error();
      onStateChanged(analysis.id, target);
    } catch {
      setLocalState(previous);
    }
    setBusy(false);
  };

  // Phase 5+: one-click "Add as task" on the 🌱 line
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

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      style={{
        background: "#fff",
        border: "1px solid #e7e2d9",
        borderRadius: 22,
        padding: "28px 28px 22px",
        boxShadow: "0 4px 28px rgba(28,25,23,0.06)",
        fontFamily: "'DM Sans', sans-serif",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 18 }}>
        <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.6, textTransform: "uppercase", color: "#6B8E6F" }}>
          This week's one thing
        </span>
      </div>

      {description && (
        <p style={{
          fontSize: 14,
          color: "#44403c",
          lineHeight: 1.65,
          margin: "0 0 18px 0",
          whiteSpace: "pre-wrap",
        }}>
          📍 {description}
        </p>
      )}

      {action && !noHomework && (
        <div style={{
          background: "#f0fdf4",
          border: "1px solid #bbf7d0",
          borderRadius: 14,
          padding: "16px 18px",
          marginBottom: 18,
        }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 6 }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.4, textTransform: "uppercase", color: "#15803d" }}>
              🌱 Try this once
            </div>
            <button
              onClick={addActionAsTask}
              disabled={addingTask || taskAdded}
              style={{
                padding: "5px 12px",
                fontSize: 11,
                fontWeight: 600,
                color: taskAdded ? "#15803d" : "#15803d",
                background: taskAdded ? "#fff" : "#fff",
                border: `1px solid ${taskAdded ? "#bbf7d0" : "#bbf7d0"}`,
                borderRadius: 100,
                cursor: addingTask || taskAdded ? "default" : "pointer",
                fontFamily: "'DM Sans', sans-serif",
                whiteSpace: "nowrap",
              }}
            >
              {taskAdded ? "✓ Added" : addingTask ? "Adding…" : "+ Add as task"}
            </button>
          </div>
          <p style={{
            fontSize: 16,
            color: "#1c1917",
            lineHeight: 1.55,
            margin: 0,
            fontFamily: "'Instrument Serif', Georgia, serif",
            fontWeight: 400,
          }}>
            {action}
          </p>
          {taskAdded && (
            <a
              href="/tasks"
              style={{
                display: "inline-block",
                marginTop: 10,
                fontSize: 12,
                color: "#15803d",
                textDecoration: "none",
                fontWeight: 600,
              }}
            >
              View all tasks →
            </a>
          )}
        </div>
      )}

      {/* No-homework verdicts: no inline box. The absence of a green action
          box says "nothing to try" — the state buttons below handle the rest. */}

      <div style={{
        fontSize: 12,
        color: "#a8a29e",
        marginBottom: 16,
      }}>
        from{" "}
        <a
          href={analysis.source_url}
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: "#78716c", textDecoration: "none" }}
        >
          {domain || "source"}
        </a>
        {" · "}{timeAgo}
      </div>

      <div style={{ display: "flex", gap: 10 }}>
        <button
          onClick={() => setState(localState === "tried" ? "saved" : "tried")}
          disabled={busy}
          style={{
            flex: 1,
            padding: "12px 16px",
            fontSize: 14,
            fontWeight: 600,
            fontFamily: "'DM Sans', sans-serif",
            color: localState === "tried" ? "#15803d" : "#fff",
            background: localState === "tried" ? "#f0fdf4" : "#6B8E6F",
            border: `1px solid ${localState === "tried" ? "#bbf7d0" : "#6B8E6F"}`,
            borderRadius: 100,
            cursor: busy ? "wait" : "pointer",
            transition: "all 0.15s",
          }}
        >
          {localState === "tried" ? "✓ Tried it" : "I tried it"}
        </button>
        <button
          onClick={() => setState(localState === "set_aside" ? "saved" : "set_aside")}
          disabled={busy}
          style={{
            flex: 1,
            padding: "12px 16px",
            fontSize: 14,
            fontWeight: 600,
            fontFamily: "'DM Sans', sans-serif",
            color: "#57534e",
            background: localState === "set_aside" ? "#faf8f5" : "#fff",
            border: `1px solid ${localState === "set_aside" ? "#d4cec4" : "#e7e2d9"}`,
            borderRadius: 100,
            cursor: busy ? "wait" : "pointer",
            transition: "all 0.15s",
          }}
        >
          {localState === "set_aside" ? "✓ Set aside" : "Just watched it"}
        </button>
      </div>
    </motion.div>
  );
}
