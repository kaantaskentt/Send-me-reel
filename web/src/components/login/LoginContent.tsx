"use client";

import { useState } from "react";

export default function LoginContent({ botDashboardLink }: { botDashboardLink: string }) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setStatus("sending");
    const res = await fetch("/api/auth/email/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.trim() }),
    });
    setStatus(res.ok ? "sent" : "error");
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#faf8f5",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
        fontFamily: "'DM Sans', sans-serif",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 420,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 0,
        }}
      >
        {/* Logo */}
        <div
          style={{
            width: 52,
            height: 52,
            borderRadius: 14,
            background: "#f97316",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 24,
          }}
        >
          <svg width="22" height="22" viewBox="0 0 14 14" fill="none">
            <path d="M2.5 7L6 10.5L11.5 3.5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>

        {/* Heading */}
        <h1 style={{ fontSize: 26, fontWeight: 800, color: "#1c1917", textAlign: "center", marginBottom: 10, marginTop: 0, lineHeight: 1.2 }}>
          Sign in to ContextDrop
        </h1>
        <p style={{ fontSize: 15, color: "#78716c", textAlign: "center", marginBottom: 32, marginTop: 0, lineHeight: 1.6, maxWidth: 340 }}>
          No passwords. Enter your email and we&apos;ll send you a magic link.
        </p>

        {/* Email form */}
        {status === "sent" ? (
          <div style={{ width: "100%", background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 18, padding: "28px", marginBottom: 24, textAlign: "center" }}>
            <p style={{ fontSize: 20, marginBottom: 8, marginTop: 0 }}>✉️</p>
            <p style={{ fontSize: 16, fontWeight: 700, color: "#166534", margin: "0 0 8px 0" }}>Check your email</p>
            <p style={{ fontSize: 13, color: "#4ade80", margin: 0, lineHeight: 1.5 }}>
              We sent a magic link to <strong style={{ color: "#166534" }}>{email}</strong>. Click it to sign in.
            </p>
          </div>
        ) : (
          <form onSubmit={handleEmailSubmit} style={{ width: "100%", marginBottom: 24 }}>
            <div style={{ width: "100%", background: "#fff", border: "1px solid #f0ede8", borderRadius: 18, padding: "24px", boxShadow: "0 2px 12px rgba(0,0,0,0.04)" }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: "#44403c", display: "block", marginBottom: 8 }}>
                Email address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                style={{
                  width: "100%",
                  padding: "12px 16px",
                  fontSize: 15,
                  border: "1px solid #e7e2d9",
                  borderRadius: 12,
                  outline: "none",
                  color: "#1c1917",
                  fontFamily: "'DM Sans', sans-serif",
                  boxSizing: "border-box",
                  marginBottom: 16,
                }}
                onFocus={(e) => { e.target.style.borderColor = "#f97316"; e.target.style.boxShadow = "0 0 0 3px rgba(249,115,22,0.1)"; }}
                onBlur={(e) => { e.target.style.borderColor = "#e7e2d9"; e.target.style.boxShadow = "none"; }}
              />
              <button
                type="submit"
                disabled={status === "sending"}
                style={{
                  width: "100%",
                  padding: "13px 24px",
                  background: status === "sending" ? "#fb923c" : "#f97316",
                  color: "#fff",
                  fontWeight: 700,
                  fontSize: 15,
                  borderRadius: 100,
                  border: "none",
                  cursor: status === "sending" ? "wait" : "pointer",
                  fontFamily: "'DM Sans', sans-serif",
                  transition: "background 0.15s",
                }}
              >
                {status === "sending" ? "Sending..." : "Send magic link"}
              </button>
              {status === "error" && (
                <p style={{ fontSize: 13, color: "#ef4444", textAlign: "center", marginTop: 12, marginBottom: 0 }}>
                  Something went wrong. Please try again.
                </p>
              )}
            </div>
          </form>
        )}

        {/* Divider */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, width: "100%", margin: "4px 0 20px 0" }}>
          <div style={{ flex: 1, height: 1, background: "#f0ede8" }} />
          <span style={{ fontSize: 12, color: "#c4bdb5", fontWeight: 500 }}>or use Telegram</span>
          <div style={{ flex: 1, height: 1, background: "#f0ede8" }} />
        </div>

        {/* Telegram CTA */}
        <a
          href={botDashboardLink}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 10,
            width: "100%",
            padding: "13px 24px",
            background: "#fff",
            color: "#44403c",
            fontWeight: 600,
            fontSize: 14,
            borderRadius: 100,
            textDecoration: "none",
            boxSizing: "border-box",
            border: "1px solid #e7e2d9",
            transition: "all 0.15s",
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="#229ED9">
            <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12l-6.871 4.326-2.962-.924c-.643-.204-.657-.643.136-.953l11.57-4.461c.537-.194 1.006.131.833.941z" />
          </svg>
          Sign in via Telegram bot
        </a>

        {/* Back to home */}
        <a href="/" style={{ marginTop: 28, fontSize: 13, color: "#c4bdb5", textDecoration: "none", display: "flex", alignItems: "center", gap: 6 }}>
          ← Back to home
        </a>
      </div>
    </div>
  );
}
