"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";

const ERROR_MESSAGES: Record<string, string> = {
  expired_token: "Your sign-in link has expired. Request a new one below.",
  auth_failed: "Sign-in failed. Please try again.",
  google_failed: "Google sign-in failed. Please try again.",
  google_no_token: "Google sign-in didn't complete. Please try again.",
  google_callback_failed: "Something went wrong with Google sign-in. Please try again.",
  missing_token: "Invalid sign-in link. Use the form below instead.",
  account_not_found: "Account not found. Sign in to create one.",
};

export default function LoginContent({ botDashboardLink }: { botDashboardLink: string }) {
  const searchParams = useSearchParams();
  const errorParam = searchParams.get("error");
  const errorMessage = errorParam ? ERROR_MESSAGES[errorParam] || "Something went wrong. Please try again." : null;

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
          No passwords. Sign in with Google or a magic link.
        </p>

        {/* Error message */}
        {errorMessage && (
          <div style={{ width: "100%", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 18, padding: "14px 20px", marginBottom: 24, textAlign: "center" }}>
            <p style={{ fontSize: 14, color: "#dc2626", margin: 0, lineHeight: 1.5 }}>{errorMessage}</p>
          </div>
        )}

        {/* Google Sign-In */}
        <a
          href="/api/auth/google"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 10,
            width: "100%",
            padding: "13px 24px",
            background: "#fff",
            color: "#1c1917",
            fontWeight: 600,
            fontSize: 15,
            borderRadius: 100,
            textDecoration: "none",
            boxSizing: "border-box",
            border: "1px solid #e7e2d9",
            marginBottom: 24,
            transition: "all 0.15s",
            cursor: "pointer",
            fontFamily: "'DM Sans', sans-serif",
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A11.96 11.96 0 0 0 0 12c0 1.94.46 3.77 1.28 5.4l3.56-2.77.01-.54z" fill="#FBBC05" />
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 1.09 14.97 0 12 0 7.7 0 3.99 2.47 2.18 6.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
          </svg>
          Continue with Google
        </a>

        {/* Divider */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, width: "100%", margin: "0 0 24px 0" }}>
          <div style={{ flex: 1, height: 1, background: "#f0ede8" }} />
          <span style={{ fontSize: 12, color: "#c4bdb5", fontWeight: 500 }}>or use email</span>
          <div style={{ flex: 1, height: 1, background: "#f0ede8" }} />
        </div>

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
