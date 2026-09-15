"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AnalysisPollError, watchAnalysis } from "@/lib/analysis-progress";
import Link from "next/link";

type Status = "idle" | "submitting" | "processing" | "paused" | "done" | "failed";

export default function PasteLinkInput({ onAnalyzed, autoSubmitUrl }: { onAnalyzed?: (id: string) => void; autoSubmitUrl?: string }) {
  const [url, setUrl] = useState("");
  const [note, setNote] = useState("");
  const [noteOpen, setNoteOpen] = useState(false);
  const [status, setStatus] = useState<Status>("idle");
  const [statusText, setStatusText] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [analysisId, setAnalysisId] = useState<string | null>(null);
  const [needsSignIn, setNeedsSignIn] = useState(false);
  const requestRef = useRef<{ url: string; note: string; key: string } | null>(null);
  const submittingRef = useRef(false);
  const completedRef = useRef(onAnalyzed);
  const autoSubmittedRef = useRef(false);

  useEffect(() => { completedRef.current = onAnalyzed; }, [onAnalyzed]);
  useEffect(() => {
    if (!analysisId || status !== "processing") return;
    const controller = new AbortController();
    void watchAnalysis(analysisId, {
      signal: controller.signal,
      onProgress: progress => setStatusText(progress.message),
    }).then(progress => {
      if (controller.signal.aborted) return;
      setStatus(progress.status === "done" ? "done" : "failed");
      if (progress.status === "done") { setUrl(""); completedRef.current?.(analysisId); }
      else setError(progress.message);
    }).catch(failure => {
      if (controller.signal.aborted) return;
      setStatus("paused");
      setNeedsSignIn(failure instanceof AnalysisPollError && failure.kind === "sign-in");
      setError(failure instanceof AnalysisPollError ? failure.message : "We couldn’t check your link. Try again.");
    });
    return () => controller.abort();
  }, [analysisId, status]);

  useEffect(() => {
    if (autoSubmitUrl && !autoSubmittedRef.current) {
      autoSubmittedRef.current = true;
      setUrl(autoSubmitUrl);
      submit(autoSubmitUrl, "");
    }
  }, [autoSubmitUrl]);

  async function submit(targetUrl: string, targetNote: string) {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setStatus("submitting");
    setError(null);
    setNeedsSignIn(false);
    if (requestRef.current?.url !== targetUrl || requestRef.current?.note !== targetNote) {
      requestRef.current = { url: targetUrl, note: targetNote, key: crypto.randomUUID() };
    }

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Idempotency-Key": requestRef.current.key },
        signal: AbortSignal.timeout(30_000),
        body: JSON.stringify({
          url: targetUrl,
          note: targetNote || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: "Something went wrong" }));
        setError(res.status === 401 ? "Sign in again to add your link." : data.error || "Couldn't start that analysis.");
        setNeedsSignIn(res.status === 401);
        setStatus("failed");
        return;
      }

      const { analysisId } = await res.json();
      if (typeof analysisId !== "string" || !/^[0-9a-f-]{36}$/i.test(analysisId)) throw new Error("Invalid saved link");
      requestRef.current = null;
      setAnalysisId(analysisId);
      setStatus("processing");
      setStatusText("Your link is saved. Waiting to start…");
      setNote("");
      setNoteOpen(false);
    } catch {
      setError("We couldn’t confirm your save. Try the same link again; it won’t use another credit.");
      setStatus("failed");
    } finally { submittingRef.current = false; }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim() || status === "submitting" || status === "processing") return;
    await submit(url.trim(), note.trim());
  }

  const disabled = status === "submitting" || status === "processing";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <form onSubmit={handleSubmit} style={{ display: "flex", gap: 8, alignItems: "stretch" }}>
        <input
          type="text"
          aria-label="Link to analyze"
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
            border: `1px solid ${status === "processing" || status === "submitting" ? "#fed7aa" : "#e7e2d9"}`,
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

      {!disabled && (
        <button
          type="button"
          onClick={() => setNoteOpen((v) => !v)}
          style={{
            alignSelf: "flex-start",
            padding: "4px 10px",
            fontSize: 12,
            color: "#78716c",
            background: "none",
            border: "none",
            cursor: "pointer",
            fontFamily: "'DM Sans', sans-serif",
          }}
        >
          {noteOpen ? "− Hide note" : "+ Add a note (optional)"}
        </button>
      )}

      {noteOpen && !disabled && (
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Why are you saving this? Or ask a question about it — e.g. 'is this useful for my launch?'"
          rows={2}
          style={{
            width: "100%",
            padding: "10px 14px",
            fontSize: 13,
            color: "#1c1917",
            background: "#fff",
            border: "1px solid #e7e2d9",
            borderRadius: 14,
            outline: "none",
            fontFamily: "'DM Sans', sans-serif",
            resize: "vertical",
            boxSizing: "border-box",
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
      )}

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
            <span role="status">{statusText || "Reading your content…"}</span>
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

        {(status === "failed" || status === "paused") && error && (
          <motion.div
            key="failed"
            role="alert"
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
            {needsSignIn ? <Link href="/login" style={{ color: "inherit", whiteSpace: "nowrap" }}>Sign in</Link> : <button
              onClick={() => {
                setStatus(status === "paused" && analysisId ? "processing" : "idle");
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
              {status === "paused" && analysisId ? "Check again" : "Dismiss"}
            </button>}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
