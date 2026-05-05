"use client";

import { useState, useEffect } from "react";

export type PremiumModalSource =
  | "sidebar_credits"
  | "sidebar_upgrade_card"
  | "sidebar_notion"
  | "sidebar_gcal"
  | "pricing_page";

interface Props {
  open: boolean;
  onClose: () => void;
  source: PremiumModalSource;
}

const FREE_PERKS = [
  "50 analyses to start",
  "All platforms (Instagram, TikTok, X, YouTube, LinkedIn, articles)",
  "Summary + action item per link",
  "Personal dashboard",
  "Telegram bot",
];

const PRO_PERKS = [
  "Everything in Free",
  "Unlimited analyses",
  "Unlimited AI chat",
  "Connectors — Notion (Google Calendar coming soon)",
  "Early access to new channels — WhatsApp, Instagram DM",
];

type Step = "perks" | "requesting" | "done" | "already";

const MAX_REASON = 1500;

export default function PremiumModal({ open, onClose, source }: Props) {
  const [step, setStep] = useState<Step>("perks");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) { setStep("perks"); setReason(""); }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  const handleSubmit = async () => {
    if (submitting || !reason.trim()) return;
    setSubmitting(true);
    const res = await fetch("/api/premium/request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason: reason.trim(), source }),
    });
    setSubmitting(false);
    setStep(res.status === 409 ? "already" : "done");
  };

  if (!open) return null;

  const nearLimit = reason.length >= MAX_REASON - 100;

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "fixed", inset: 0, zIndex: 80,
          background: "rgba(0,0,0,0.35)",
          backdropFilter: "blur(4px)",
          WebkitBackdropFilter: "blur(4px)",
        }}
      />

      {/* Modal */}
      <div style={{
        position: "fixed", top: "50%", left: "50%",
        transform: "translate(-50%, -50%)",
        zIndex: 81,
        width: "min(440px, calc(100vw - 32px))",
        background: "#fff",
        borderRadius: 20,
        padding: "28px 28px 24px",
        boxShadow: "0 24px 64px rgba(0,0,0,0.14)",
        fontFamily: "'DM Sans', sans-serif",
        maxHeight: "90vh",
        overflowY: "auto",
      }}>
        {/* Close */}
        <button
          onClick={onClose}
          style={{
            position: "absolute", top: 16, right: 16,
            width: 28, height: 28,
            background: "#f5f1eb", border: "none", borderRadius: "50%",
            cursor: "pointer", display: "flex", alignItems: "center",
            justifyContent: "center", fontSize: 13, color: "#78716c",
            flexShrink: 0,
          }}
        >✕</button>

        {/* ── Perks ── */}
        {step === "perks" && (
          <>
            <span style={{
              display: "inline-block", fontSize: 10, fontWeight: 700,
              letterSpacing: "0.1em", textTransform: "uppercase",
              color: "#f97316", background: "#fff7ed",
              border: "1px solid #fed7aa",
              padding: "3px 10px", borderRadius: 100, marginBottom: 14,
            }}>Early access</span>

            <h2 style={{ fontSize: 20, fontWeight: 800, color: "#1c1917", margin: "0 0 4px" }}>
              Premium
            </h2>
            <p style={{ fontSize: 13, color: "#a8a29e", margin: "0 0 20px", lineHeight: 1.5 }}>
              Request early access while we finish setting up payments.
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: 9, marginBottom: 24 }}>
              {PRO_PERKS.map((perk) => (
                <div key={perk} style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                  <span style={{ color: "#f97316", fontSize: 13, marginTop: 1, flexShrink: 0 }}>✓</span>
                  <span style={{ fontSize: 13, color: "#44403c", lineHeight: 1.4 }}>{perk}</span>
                </div>
              ))}
            </div>

            <button
              onClick={() => setStep("requesting")}
              style={{
                width: "100%", padding: "13px 0",
                background: "#f97316", color: "#fff",
                fontWeight: 700, fontSize: 14,
                borderRadius: 100, border: "none", cursor: "pointer",
                fontFamily: "'DM Sans', sans-serif",
              }}
            >
              Request access →
            </button>
            <p style={{ fontSize: 11, color: "#c4bdb5", textAlign: "center", margin: "10px 0 0", lineHeight: 1.5 }}>
              We&apos;re reviewing requests personally — no card needed.
            </p>
          </>
        )}

        {/* ── Requesting ── */}
        {step === "requesting" && (
          <>
            <button
              onClick={() => setStep("perks")}
              style={{
                background: "none", border: "none", fontSize: 12,
                color: "#a8a29e", cursor: "pointer", padding: 0,
                marginBottom: 18, fontFamily: "'DM Sans', sans-serif",
              }}
            >
              ← back
            </button>
            <h2 style={{ fontSize: 18, fontWeight: 800, color: "#1c1917", margin: "0 0 6px" }}>
              One quick question
            </h2>
            <p style={{ fontSize: 13, color: "#a8a29e", margin: "0 0 14px" }}>
              What would you use Premium for?
            </p>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value.slice(0, MAX_REASON))}
              rows={3}
              style={{
                width: "100%", fontSize: 16,
                border: "1.5px solid #e7e2d9", borderRadius: 12,
                padding: "10px 14px", outline: "none",
                fontFamily: "'DM Sans', sans-serif", color: "#1c1917",
                resize: "none", boxSizing: "border-box", lineHeight: 1.5,
              }}
              onFocus={(e) => { e.target.style.borderColor = "#f97316"; }}
              onBlur={(e) => { e.target.style.borderColor = "#e7e2d9"; }}
            />
            <p style={{
              fontSize: 11, margin: "4px 0 14px",
              color: nearLimit ? "#f97316" : "#c4bdb5",
              textAlign: "right",
            }}>
              {reason.length} / {MAX_REASON}
            </p>
            <button
              onClick={handleSubmit}
              disabled={submitting || !reason.trim()}
              style={{
                width: "100%", padding: "13px 0",
                background: submitting || !reason.trim() ? "#e7e2d9" : "#f97316",
                color: submitting || !reason.trim() ? "#a8a29e" : "#fff",
                fontWeight: 700, fontSize: 14,
                borderRadius: 100, border: "none",
                cursor: submitting || !reason.trim() ? "not-allowed" : "pointer",
                fontFamily: "'DM Sans', sans-serif",
                transition: "background 0.15s",
              }}
            >
              {submitting ? "Sending…" : "Send request"}
            </button>
          </>
        )}

        {/* ── Done / Already ── */}
        {(step === "done" || step === "already") && (
          <div style={{ textAlign: "center", padding: "8px 0" }}>
            <div style={{
              width: 52, height: 52, borderRadius: "50%",
              background: "#fff7ed", border: "2px solid #fed7aa",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 22, margin: "0 auto 18px",
            }}>✓</div>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: "#1c1917", margin: "0 0 8px" }}>
              {step === "already" ? "Already on the list" : "You're on the list."}
            </h2>
            <p style={{ fontSize: 13, color: "#a8a29e", margin: "0 0 22px", lineHeight: 1.6 }}>
              {step === "already"
                ? "You've already requested access — we'll be in touch soon."
                : "We'll reach out personally within a couple of days."}
            </p>
            <button
              onClick={onClose}
              style={{
                padding: "10px 28px",
                background: "#f5f1eb", color: "#78716c",
                fontWeight: 600, fontSize: 13,
                borderRadius: 100, border: "none", cursor: "pointer",
                fontFamily: "'DM Sans', sans-serif",
              }}
            >
              Close
            </button>
          </div>
        )}
      </div>
    </>
  );
}
