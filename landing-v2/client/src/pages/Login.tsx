/*
 * Login — ContextDrop "Warm Signal"
 * Design: Warm cream (#FAFAF8), orange accent, DM Sans
 * Primary: Google + Magic link. Telegram as secondary option.
 * No nested anchor tags.
 */

import { useState } from "react";
import { Link, useLocation } from "wouter";

export default function Login() {
  const [, navigate] = useLocation();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setSent(true);
    }, 1200);
  }

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4 relative"
      style={{ background: "#FAFAF8" }}
    >
      {/* Subtle background pattern */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage: "radial-gradient(circle at 30% 20%, rgba(249,115,22,0.04) 0%, transparent 50%), radial-gradient(circle at 70% 80%, rgba(249,115,22,0.03) 0%, transparent 50%)",
          pointerEvents: "none",
        }}
      />

      {/* Back to home — using Link directly, no nested <a> */}
      <Link
        href="/"
        className="absolute top-6 left-6 flex items-center gap-1.5 text-slate-400 hover:text-slate-700 transition-colors text-sm"
        style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 500, textDecoration: "none" }}
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M19 12H5M12 5l-7 7 7 7"/>
        </svg>
        Back
      </Link>

      {/* Card */}
      <div
        className="w-full max-w-sm rounded-3xl px-8 py-10 relative"
        style={{
          background: "#fff",
          border: "1.5px solid #f0ede8",
          boxShadow: "0 8px 48px rgba(0,0,0,0.07), 0 1px 2px rgba(0,0,0,0.04)",
        }}
      >
        {/* Logo */}
        <div className="flex flex-col items-center mb-7">
          <div
            className="w-10 h-10 rounded-2xl flex items-center justify-center mb-4"
            style={{ background: "#F97316", boxShadow: "0 4px 14px rgba(249,115,22,0.3)" }}
          >
            <svg width="17" height="17" viewBox="0 0 14 14" fill="none">
              <path d="M2.5 7L6 10.5L11.5 3.5" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <h1
            className="text-[#1a1a1a] text-xl text-center"
            style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 800, letterSpacing: "-0.025em" }}
          >
            Sign in to ContextDrop
          </h1>
          <p
            className="text-slate-400 text-sm text-center mt-1"
            style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 400 }}
          >
            No passwords. Sign in with Google or a magic link.
          </p>
        </div>

        {!sent ? (
          <>
            {/* Google CTA */}
            <a
              href="/api/auth/google"
              className="w-full flex items-center justify-center gap-3 rounded-xl py-3 text-sm transition-all duration-200 hover:bg-slate-50 active:scale-[0.98] mb-3"
              style={{
                background: "#fff",
                border: "1.5px solid #e7e2d9",
                fontFamily: "'DM Sans', sans-serif",
                fontWeight: 600,
                color: "#1a1a1a",
                textDecoration: "none",
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Continue with Google
            </a>

            {/* Divider */}
            <div className="flex items-center gap-3 mb-3">
              <div className="flex-1 h-px" style={{ background: "#f0ede8" }} />
              <span className="text-xs text-slate-300" style={{ fontFamily: "'DM Sans', sans-serif" }}>or use email</span>
              <div className="flex-1 h-px" style={{ background: "#f0ede8" }} />
            </div>

            {/* Email form */}
            <form onSubmit={handleEmailSubmit} className="flex flex-col gap-2.5">
              <div>
                <label
                  className="block text-xs text-slate-500 mb-1.5"
                  style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 500 }}
                >
                  Email address
                </label>
                <input
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-xl px-4 py-3 text-sm text-[#1a1a1a] outline-none transition-all duration-200"
                  style={{
                    background: "#FAFAF8",
                    border: "1.5px solid #f0ede8",
                    fontFamily: "'DM Sans', sans-serif",
                    fontWeight: 400,
                  }}
                  onFocus={(e) => { e.target.style.borderColor = "#F97316"; e.target.style.boxShadow = "0 0 0 3px rgba(249,115,22,0.1)"; }}
                  onBlur={(e) => { e.target.style.borderColor = "#f0ede8"; e.target.style.boxShadow = "none"; }}
                />
              </div>
              <button
                type="submit"
                disabled={loading || !email}
                className="w-full rounded-xl py-3 text-sm transition-all duration-200 disabled:opacity-40 active:scale-[0.98]"
                style={{
                  background: "#F97316",
                  color: "#fff",
                  fontFamily: "'DM Sans', sans-serif",
                  fontWeight: 600,
                  boxShadow: email ? "0 4px 16px rgba(249,115,22,0.25)" : "none",
                }}
              >
                {loading ? "Sending…" : "Send magic link"}
              </button>
            </form>

            {/* Telegram option */}
            <div className="flex items-center gap-3 my-3">
              <div className="flex-1 h-px" style={{ background: "#f0ede8" }} />
              <span className="text-xs text-slate-300" style={{ fontFamily: "'DM Sans', sans-serif" }}>or use Telegram</span>
              <div className="flex-1 h-px" style={{ background: "#f0ede8" }} />
            </div>

            <a
              href="https://t.me/contextdrop2027bot?start=login"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center justify-center gap-2.5 rounded-xl py-3 text-sm transition-all duration-200 hover:opacity-90 active:scale-[0.98]"
              style={{
                background: "#e8f4fd",
                color: "#0088cc",
                fontFamily: "'DM Sans', sans-serif",
                fontWeight: 600,
                textDecoration: "none",
                border: "1.5px solid #c8e4f8",
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12l-6.871 4.326-2.962-.924c-.643-.204-.657-.643.136-.953l11.57-4.461c.537-.194 1.006.131.833.941z"/>
              </svg>
              Sign in via Telegram bot
            </a>
          </>
        ) : (
          /* Magic link sent state */
          <div className="text-center py-4">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4"
              style={{ background: "#fff5ee", border: "1.5px solid #fde8d4" }}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#F97316" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                <polyline points="22,6 12,13 2,6"/>
              </svg>
            </div>
            <h2
              className="text-[#1a1a1a] text-lg mb-2"
              style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 700 }}
            >
              Check your inbox
            </h2>
            <p
              className="text-slate-400 text-sm leading-relaxed mb-5"
              style={{ fontFamily: "'DM Sans', sans-serif" }}
            >
              We sent a magic link to <strong style={{ color: "#1a1a1a" }}>{email}</strong>. Click it to sign in — no password needed.
            </p>
            <button
              onClick={() => { setSent(false); setEmail(""); }}
              className="text-xs text-slate-400 hover:text-slate-600 transition-colors underline"
              style={{ fontFamily: "'DM Sans', sans-serif" }}
            >
              Use a different email
            </button>
          </div>
        )}

        {/* Footer note */}
        {!sent && (
          <p
            className="text-center text-xs text-slate-300 mt-5"
            style={{ fontFamily: "'DM Sans', sans-serif" }}
          >
            No account yet? The bot creates one automatically when you send your first link.
          </p>
        )}
      </div>
    </div>
  );
}
