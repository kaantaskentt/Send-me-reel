"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

type AnalysisStatus =
  | "starting"
  | "pending"
  | "scraping"
  | "transcribing"
  | "analyzing"
  | "generating"
  | "done"
  | "failed";

const STATUS_MESSAGES: Record<string, string> = {
  starting: "Queuing your link...",
  pending: "Finding your content...",
  scraping: "Finding your content...",
  transcribing: "Listening to the audio...",
  analyzing: "Watching the visuals...",
  generating: "Writing your verdict...",
};

export default function ShareClient({ url }: { url: string }) {
  const router = useRouter();
  const [status, setStatus] = useState<AnalysisStatus>("starting");
  const [error, setError] = useState<string | null>(null);
  const [verdict, setVerdict] = useState<string | null>(null);
  const analysisIdRef = useRef<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function start() {
      try {
        const res = await fetch("/api/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url }),
        });

        if (!res.ok) {
          const data = await res.json();
          setError(data.error || "Failed to start analysis");
          setStatus("failed");
          return;
        }

        const { analysisId } = await res.json();
        analysisIdRef.current = analysisId;
        setStatus("pending");

        // Start polling
        pollRef.current = setInterval(async () => {
          if (cancelled) return;
          try {
            const statusRes = await fetch(`/api/analyze/${analysisId}/status`);
            if (!statusRes.ok) return;
            const data = await statusRes.json();

            if (cancelled) return;

            if (data.status === "done") {
              setStatus("done");
              setVerdict(data.verdict);
              if (pollRef.current) clearInterval(pollRef.current);
            } else if (data.status === "failed") {
              setStatus("failed");
              setError(data.error || "Analysis failed. Your credit has been refunded.");
              if (pollRef.current) clearInterval(pollRef.current);
            } else {
              setStatus(data.status);
            }
          } catch {
            // Ignore transient polling errors
          }
        }, 3000);
      } catch {
        if (!cancelled) {
          setError("Network error. Please try again.");
          setStatus("failed");
        }
      }
    }

    start();

    return () => {
      cancelled = true;
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [url]);

  const isProcessing = !["done", "failed"].includes(status);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#faf8f5",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        fontFamily: "'DM Sans', sans-serif",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 440,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        {/* Logo */}
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: 14,
            background: "#f97316",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 24,
          }}
        >
          <svg width="20" height="20" viewBox="0 0 14 14" fill="none">
            <path
              d="M2.5 7L6 10.5L11.5 3.5"
              stroke="white"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        <AnimatePresence mode="wait">
          {isProcessing && (
            <motion.div
              key="processing"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 20,
              }}
            >
              {/* Pulsing ring */}
              <motion.div
                animate={{ scale: [1, 1.15, 1], opacity: [0.6, 1, 0.6] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: "50%",
                  border: "3px solid #f97316",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <div
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: "50%",
                    background: "#f97316",
                  }}
                />
              </motion.div>

              <motion.p
                key={status}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                style={{
                  fontSize: 17,
                  fontWeight: 600,
                  color: "#1c1917",
                  textAlign: "center",
                  margin: 0,
                }}
              >
                {STATUS_MESSAGES[status] || "Processing..."}
              </motion.p>

              <p
                style={{
                  fontSize: 13,
                  color: "#a8a29e",
                  textAlign: "center",
                  margin: 0,
                  maxWidth: 300,
                  lineHeight: 1.5,
                  wordBreak: "break-all",
                }}
              >
                {url.length > 60 ? url.slice(0, 60) + "..." : url}
              </p>
            </motion.div>
          )}

          {status === "done" && verdict && (
            <motion.div
              key="done"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              style={{
                width: "100%",
                display: "flex",
                flexDirection: "column",
                gap: 16,
              }}
            >
              <div
                style={{
                  background: "#fff",
                  border: "1px solid #e7e2d9",
                  borderRadius: 18,
                  padding: 24,
                  boxShadow: "0 2px 12px rgba(0,0,0,0.04)",
                }}
              >
                <p
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: "#a8a29e",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    margin: "0 0 12px 0",
                  }}
                >
                  Your verdict
                </p>
                <p
                  style={{
                    fontSize: 15,
                    color: "#44403c",
                    lineHeight: 1.65,
                    margin: 0,
                    whiteSpace: "pre-wrap",
                  }}
                >
                  {verdict}
                </p>
              </div>

              <button
                onClick={() => router.push("/dashboard")}
                style={{
                  width: "100%",
                  padding: "14px 24px",
                  background: "#f97316",
                  color: "#fff",
                  fontWeight: 700,
                  fontSize: 15,
                  borderRadius: 100,
                  border: "none",
                  cursor: "pointer",
                  fontFamily: "'DM Sans', sans-serif",
                }}
              >
                View in Dashboard
              </button>
            </motion.div>
          )}

          {status === "failed" && (
            <motion.div
              key="failed"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              style={{
                width: "100%",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 16,
              }}
            >
              <div
                style={{
                  width: "100%",
                  background: "#fef2f2",
                  border: "1px solid #fecaca",
                  borderRadius: 14,
                  padding: "16px 20px",
                  textAlign: "center",
                }}
              >
                <p style={{ fontSize: 14, color: "#dc2626", margin: 0 }}>
                  {error || "Something went wrong."}
                </p>
              </div>

              <button
                onClick={() => router.push("/dashboard")}
                style={{
                  padding: "12px 28px",
                  background: "#fff",
                  color: "#44403c",
                  fontWeight: 600,
                  fontSize: 14,
                  borderRadius: 100,
                  border: "1px solid #e7e2d9",
                  cursor: "pointer",
                  fontFamily: "'DM Sans', sans-serif",
                }}
              >
                Go to Dashboard
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
