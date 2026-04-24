"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

type Status = "idle" | "submitting" | "processing" | "done" | "failed";

const PROCESSING_LABELS: Record<string, string> = {
  pending: "Queuing…",
  scraping: "Finding the content…",
  transcribing: "Listening to audio…",
  analyzing: "Watching the visuals…",
  generating: "Writing your verdict…",
};

export default function PasteLinkInput({ onAnalyzed }: { onAnalyzed?: () => void }) {
  const [url, setUrl] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [statusText, setStatusText] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim() || status === "submitting" || status === "processing") return;

    setStatus("submitting");
    setError(null);

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: "Something went wrong" }));
        setError(data.error || "Couldn't start that analysis.");
        setStatus("failed");
        return;
      }

      const { analysisId } = await res.json();
      setStatus("processing");
      setStatusText(PROCESSING_LABELS.pending);

      // Clear the input so user knows it was received
      const submittedUrl = url.trim();
      setUrl("");

      // Poll status
      pollRef.current = setInterval(async () => {
        try {
          const statusRes = await fetch(`/api/analyze/${analysisId}/status`);
          if (!statusRes.ok) return;
          const data = await statusRes.json();

          if (data.status === "done") {
            setStatus("done");
            setStatusText("Verdict ready");
            if (pollRef.current) clearInterval(pollRef.current);
            onAnalyzed?.();
            // Auto-dismiss the success banner after 4s
            setTimeout(() => {
              setStatus("idle");
              setStatusText("");
            }, 4000);
          } else if (data.status === "failed") {
            setStatus("failed");
            setError(data.error_message || "Analysis failed — your credit has been refunded.");
            if (pollRef.current) clearInterval(pollRef.current);
          } else if (PROCESSING_LABELS[data.status]) {
            setStatusText(PROCESSING_LABELS[data.status]);
          }
        } catch {
          // Transient poll error — keep polling
        }
      }, 3000);
      // Silence unused var warning; keep for future inline preview
      void submittedUrl;
    } catch {
      setError("Network error. Try again.");
      setStatus("failed");
    }
  }

  const disabled = status === "submitting" || status === "processing";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <form onSubmit={handleSubmit} style={{ display: "flex", gap: 8, alignItems: "stretch" }}>
        <input
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="Paste any link — Instagram, TikTok, X, YouTube, or article"
          disabled={disabled}
          style={{
            flex: 1,
            minWidth: 0,
            padding: "11px 14px",
            fontSize: 14,
            color: "#1c1917",
            background: disabled ? "#f5f1eb" : "#fff",
            border: "1px solid #e7e2d9",
            borderRadius: 100,
            outline: "none",
            fontFamily: "'DM Sans', sans-serif",
            transition: "border-color 0.15s, box-shadow 0.15s",
          }}
          onFocus={(e) => {
            e.target.style.borderColor = "#f97316";
            e.target.style.boxShadow = "0 0 0 3px rgba(249,115,22,0.1)";
          }}
          onBlur={(e) => {
            e.target.style.borderColor = "#e7e2d9";
            e.target.style.boxShadow = "none";
          }}
        />
        <button
          type="submit"
          disabled={disabled || !url.trim()}
          style={{
            padding: "11px 20px",
            fontSize: 14,
            fontWeight: 700,
            color: "#fff",
            background: disabled || !url.trim() ? "#d4cec4" : "#f97316",
            border: "none",
            borderRadius: 100,
            cursor: disabled || !url.trim() ? "not-allowed" : "pointer",
            fontFamily: "'DM Sans', sans-serif",
            whiteSpace: "nowrap",
            transition: "background 0.15s",
          }}
        >
          {status === "submitting" ? "Sending…" : "Analyze"}
        </button>
      </form>

      <AnimatePresence mode="wait">
        {status === "processing" && (
          <motion.div
            key="processing"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "10px 14px",
              background: "#fff7ed",
              border: "1px solid #fed7aa",
              borderRadius: 14,
              fontSize: 13,
              color: "#9a3412",
            }}
          >
            <motion.div
              animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
              style={{ width: 8, height: 8, borderRadius: "50%", background: "#f97316", flexShrink: 0 }}
            />
            <span>{statusText || "Processing…"}</span>
          </motion.div>
        )}

        {status === "done" && (
          <motion.div
            key="done"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "10px 14px",
              background: "#f0fdf4",
              border: "1px solid #bbf7d0",
              borderRadius: 14,
              fontSize: 13,
              color: "#15803d",
            }}
          >
            <span style={{ fontSize: 14 }}>✓</span>
            <span>{statusText}</span>
          </motion.div>
        )}

        {status === "failed" && error && (
          <motion.div
            key="failed"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "10px 14px",
              background: "#fef2f2",
              border: "1px solid #fecaca",
              borderRadius: 14,
              fontSize: 13,
              color: "#dc2626",
            }}
          >
            <span>{error}</span>
            <button
              onClick={() => {
                setStatus("idle");
                setError(null);
              }}
              style={{
                marginLeft: "auto",
                background: "none",
                border: "none",
                color: "#dc2626",
                fontSize: 13,
                cursor: "pointer",
                fontWeight: 600,
              }}
            >
              Dismiss
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
