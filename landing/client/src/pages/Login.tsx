/*
 * Login — ContextDrop
 * Design: Warm cream (#FAFAF8), orange accent, DM Sans
 * Simple centered card with Telegram OAuth CTA + email fallback
 */

import { useState } from "react";
import { Link, useLocation } from "wouter";

export default function Login() {
  const [, navigate] = useLocation();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  function handleTelegram() {
    // In production: redirect to Telegram OAuth or bot deep-link
    window.open("https://t.me/contextdrop2027bot", "_blank");
  }

  function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    // Simulate auth — in production wire to real backend
    setTimeout(() => {
      setLoading(false);
      navigate("/dashboard");
    }, 1200);
  }

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4"
      style={{ background: "#FAFAF8" }}
    >
      {/* Back to home */}
      <Link href="/">
        <a className="absolute top-6 left-6 flex items-center gap-2 text-slate-400 hover:text-slate-700 transition-colors text-sm"
          style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 500 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 5l-7 7 7 7"/>
          </svg>
          Back to site
        </a>
      </Link>

      {/* Card */}
      <div
        className="w-full max-w-sm rounded-3xl px-8 py-10"
        style={{
          background: "#fff",
          border: "1.5px solid #f0ede8",
          boxShadow: "0 8px 40px rgba(0,0,0,0.06)",
        }}
      >
        {/* Logo */}
        <div className="flex items-center gap-2 mb-8">
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center"
            style={{ background: "#F97316" }}
          >
            <svg width="15" height="15" viewBox="0 0 14 14" fill="none">
              <path d="M2.5 7L6 10.5L11.5 3.5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <span
            className="text-[#1a1a1a] text-base tracking-tight"
            style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 700 }}
          >
            ContextDrop
          </span>
        </div>

        <h1
          className="text-2xl text-[#1a1a1a] mb-1"
          style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 800, letterSpacing: "-0.025em" }}
        >
          Welcome back
        </h1>
        <p
          className="text-slate-400 text-sm mb-8"
          style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 400 }}
        >
          Sign in to see your verdicts
        </p>

        {/* Telegram primary CTA */}
        <button
          onClick={handleTelegram}
          className="w-full flex items-center justify-center gap-3 rounded-xl py-3 text-white text-sm font-600 transition-all duration-200 hover:opacity-90 active:scale-[0.98] mb-4"
          style={{
            background: "#F97316",
            fontFamily: "'DM Sans', sans-serif",
            fontWeight: 600,
            boxShadow: "0 4px 16px rgba(249,115,22,0.25)",
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12l-6.871 4.326-2.962-.924c-.643-.204-.657-.643.136-.953l11.57-4.461c.537-.194 1.006.131.833.941z"/>
          </svg>
          Continue with Telegram
        </button>

        {/* Divider */}
        <div className="flex items-center gap-3 mb-4">
          <div className="flex-1 h-px" style={{ background: "#f0ede8" }} />
          <span className="text-xs text-slate-300" style={{ fontFamily: "'DM Sans', sans-serif" }}>or</span>
          <div className="flex-1 h-px" style={{ background: "#f0ede8" }} />
        </div>

        {/* Email form */}
        <form onSubmit={handleEmailSubmit} className="flex flex-col gap-3">
          <input
            type="email"
            placeholder="your@email.com"
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
          <button
            type="submit"
            disabled={loading || !email}
            className="w-full rounded-xl py-3 text-sm transition-all duration-200 disabled:opacity-40"
            style={{
              background: "#1a1a1a",
              color: "#fff",
              fontFamily: "'DM Sans', sans-serif",
              fontWeight: 600,
            }}
          >
            {loading ? "Signing in…" : "Continue with email"}
          </button>
        </form>

        {/* Footer note */}
        <p
          className="text-center text-xs text-slate-300 mt-6"
          style={{ fontFamily: "'DM Sans', sans-serif" }}
        >
          No account? Just start the bot on Telegram — it creates one automatically.
        </p>
      </div>
    </div>
  );
}
