"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { formatDistanceToNow } from "date-fns";
import type { Analysis, AnalysisState } from "@/lib/types";
import { parseVerdict } from "@/lib/verdict-parser";
import { useTheme } from "@/lib/theme";

interface Props {
  analysis: Analysis;
  onStateChanged: (id: string, state: AnalysisState) => void;
}

export default function WeekHero({ analysis }: Props) {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const parsed = analysis.verdict ? parseVerdict(analysis.verdict) : null;
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

  const cardBg = isDark ? "#111111" : "#fff";
  const cardBorder = isDark ? "rgba(255,255,255,0.08)" : "#e7e2d9";
  const descColor = isDark ? "#d4d4d8" : "#1c1917";
  const metaColor = isDark ? "#52525b" : "#c4bdb5";
  const metaLinkColor = isDark ? "#71717A" : "#a8a29e";

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
      style={{
        position: "relative",
        background: cardBg,
        border: `1px solid ${cardBorder}`,
        borderLeft: "3px solid #f97316",
        borderRadius: 16,
        padding: "24px 24px 20px",
        boxShadow: isDark ? "none" : "0 4px 24px rgba(28,25,23,0.05)",
        fontFamily: "'DM Sans', sans-serif",
        overflow: "hidden",
      }}
    >
      <div>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 8 }}>
          <span style={{
            fontSize: 10, fontWeight: 700,
            letterSpacing: "0.08em", textTransform: "uppercase",
            color: "#f97316",
            fontFamily: "'JetBrains Mono', monospace",
          }}>
            This week&apos;s one thing
          </span>
          <span style={{ fontSize: 11, color: metaColor, fontWeight: 500 }}>
            from{" "}
            <a
              href={analysis.source_url}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: metaLinkColor, textDecoration: "none", borderBottom: `1px dotted ${metaColor}` }}
            >
              {domain || "source"}
            </a>
            {" · "}{timeAgo}
          </span>
        </div>

        {/* Description */}
        {description && (
          <p style={{
            fontSize: 17,
            color: descColor,
            lineHeight: 1.5,
            margin: "0 0 18px 0",
            fontFamily: "'Instrument Serif', Georgia, serif",
            fontWeight: 400,
            letterSpacing: -0.15,
          }}>
            {description}
          </p>
        )}

        {/* Action zone — orange brand */}
        {action && !noHomework && (
          <div style={{
            background: isDark ? "rgba(249,115,22,0.06)" : "rgba(249,115,22,0.05)",
            border: "1px solid rgba(249,115,22,0.2)",
            borderRadius: 14,
            padding: "18px 20px",
            marginBottom: 0,
          }}>
            <div style={{
              fontSize: 10, fontWeight: 700,
              letterSpacing: "0.08em", textTransform: "uppercase",
              color: "#f97316",
              fontFamily: "'JetBrains Mono', monospace",
              marginBottom: 10,
            }}>
              TRY THIS ONCE
            </div>
            <p style={{
              fontSize: 18,
              color: isDark ? "#d4d4d8" : "#0f1d12",
              lineHeight: 1.45,
              margin: 0,
              fontFamily: "'Instrument Serif', Georgia, serif",
              fontWeight: 400,
              letterSpacing: -0.15,
            }}>
              {action}
            </p>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 16, flexWrap: "wrap" }}>
              <button
                onClick={addActionAsTask}
                disabled={addingTask || taskAdded}
                style={{
                  padding: "7px 16px",
                  fontSize: 12, fontWeight: 600,
                  color: "#15803d",
                  background: "rgba(255,255,255,0.85)",
                  border: "1px solid #bbf7d0",
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
                  style={{ fontSize: 12, color: "#f97316", textDecoration: "none", fontWeight: 600, opacity: 0.8 }}
                >
                  View all tasks →
                </a>
              )}
            </div>
          </div>
        )}

        {/* No-homework fallback */}
        {(noHomework || (!action && parsed)) && (
          <p style={{
            fontSize: 14,
            color: isDark ? "#71717A" : "#a8a29e",
            margin: 0,
            fontFamily: "'Instrument Serif', Georgia, serif",
            fontStyle: "italic",
          }}>
            No homework here. Just a watch.
          </p>
        )}
      </div>
    </motion.div>
  );
}
