"use client";

/*
 * HeroSection — Manus "Dark Signal" port (Apr 26)
 * Dark #0a0a0a + dot grid + orange radial glow.
 * Rotating word headline, paste-link input, demo animation.
 */

import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import HeroDemoAnimation from "./HeroDemoAnimation";

const ROTATING_WORDS = ["summarized.", "understood.", "clarified.", "actioned.", "finally useful."];

const PLATFORMS = [
  { name: "Instagram", color: "#E1306C" },
  { name: "LinkedIn", color: "#0A66C2" },
  { name: "X", color: "#FAFAFA" },
  { name: "TikTok", color: "#00F2EA" },
];

function HeroSubheadline() {
  const [platformIndex, setPlatformIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setPlatformIndex((i) => (i + 1) % PLATFORMS.length);
    }, 1200);
    return () => clearInterval(interval);
  }, []);

  const platform = PLATFORMS[platformIndex];

  return (
    <div className="flex flex-col items-center gap-3">
      <p className="text-center" style={{ color: "#A1A1AA", lineHeight: 1.5 }}>
        Admit it — you saved something on{" "}
        <span className="inline-block text-center" style={{ minWidth: "5.8em" }}>
          <AnimatePresence mode="wait">
            <motion.span
              key={platformIndex}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.12, ease: [0.16, 1, 0.3, 1] }}
              className="inline-block font-bold"
              style={{ color: platform.color }}
            >
              {platform.name}
            </motion.span>
          </AnimatePresence>
        </span>
        {" "}last week.<br />
        You never went back to it.
      </p>
      <p className="text-sm mt-1" style={{ color: "#52525B" }}>
        For the first time, you can chat with your saved content and set tasks from it.
      </p>
    </div>
  );
}

function isValidUrl(s: string) {
  try {
    const url = new URL(s.startsWith("http") ? s : `https://${s}`);
    return url.hostname.includes(".");
  } catch {
    return false;
  }
}

function HeroAnalysePanel() {
  const [link, setLink] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [focused, setFocused] = useState(false);
  const [checking, setChecking] = useState(false);
  const [urlError, setUrlError] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async () => {
    if (!link.trim() || checking) return;
    if (!isValidUrl(link.trim())) {
      setUrlError(true);
      return;
    }
    setUrlError(false);
    setChecking(true);
    try {
      const res = await fetch("/api/user");
      if (res.ok) {
        const data = await res.json();
        if (data?.user) {
          sessionStorage.setItem("pendingLink", link.trim());
          window.location.href = "/dashboard";
          return;
        }
      }
    } catch {}
    sessionStorage.setItem("pendingLink", link.trim());
    setChecking(false);
    setSubmitted(true);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.26, ease: [0.16, 1, 0.3, 1] }}
      className="w-full max-w-xl mb-10"
    >
      <AnimatePresence mode="wait">
        {!submitted ? (
          <motion.div key="input" initial={{ opacity: 1 }} exit={{ opacity: 0, y: -6 }}>
            <div
              className="flex items-center gap-2 px-4 py-3 rounded-2xl transition-all duration-200"
              style={{
                background: "#111111",
                border: focused ? "1px solid rgba(249,115,22,0.5)" : "1px solid rgba(255,255,255,0.1)",
                boxShadow: focused
                  ? "0 0 0 3px rgba(249,115,22,0.08), 0 8px 32px rgba(0,0,0,0.5)"
                  : "0 4px 24px rgba(0,0,0,0.4)",
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0">
                <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" />
                <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" />
              </svg>
              <input
                ref={inputRef}
                type="text"
                placeholder="Paste any link — YouTube, TikTok, X, Instagram, article..."
                value={link}
                onChange={(e) => { setLink(e.target.value); setUrlError(false); }}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                onKeyDown={(e) => { if (e.key === "Enter") handleSubmit(); }}
                className="flex-1 bg-transparent text-sm outline-none"
                style={{ color: "#FAFAFA", fontFamily: "'Inter', sans-serif" }}
              />
              <button
                onClick={handleSubmit}
                disabled={!link.trim() || checking}
                className="flex-shrink-0 w-8 h-8 rounded-xl flex items-center justify-center transition-all duration-150 hover:brightness-110 disabled:opacity-30"
                style={{ background: link.trim() ? "#F97316" : "rgba(249,115,22,0.3)" }}
              >
                {checking ? (
                  <div className="w-3 h-3 rounded-full border border-white/40 border-t-white animate-spin" />
                ) : (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                )}
              </button>
            </div>
            {urlError && (
              <p className="mt-2 text-center text-xs" style={{ color: "#F97316" }}>
                That doesn't look like a link — paste a URL (e.g. https://...)
              </p>
            )}
            <p className="mt-3 text-center text-xs" style={{ color: "#52525B" }}>
              Prefer Telegram?{" "}
              <a
                href="https://t.me/contextdrop2027bot"
                target="_blank"
                rel="noopener noreferrer"
                className="transition-colors duration-150 hover:text-white"
                style={{ color: "#71717A", textDecoration: "underline", textUnderlineOffset: "3px" }}
              >
                Send to @ContextDropBot →
              </a>
            </p>
          </motion.div>
        ) : (
          <motion.div
            key="submitted"
            initial={{ opacity: 0, scale: 0.97, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ type: "spring", damping: 24, stiffness: 300 }}
            className="rounded-2xl px-5 py-4 flex items-start gap-4"
            style={{
              background: "rgba(249,115,22,0.08)",
              border: "1px solid rgba(249,115,22,0.2)",
              boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
            }}
          >
            <div className="mt-0.5 w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center" style={{ background: "#F97316" }}>
              <svg width="9" height="9" viewBox="0 0 10 10" fill="none">
                <path d="M1.5 5L4 7.5L8.5 2.5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold" style={{ color: "#FAFAFA" }}>Got it — analysing your link…</p>
              <p className="text-xs mt-1" style={{ color: "#A1A1AA" }}>Sign in to see your card. Takes about 30 seconds.</p>
              <div className="flex flex-wrap items-center gap-3 mt-3">
                <a
                  href="/api/auth/google"
                  className="text-xs font-semibold px-4 py-1.5 rounded-lg text-white hover:brightness-110 transition-all"
                  style={{ background: "#F97316" }}
                >
                  Sign in with Google →
                </a>
                <button
                  onClick={() => { setSubmitted(false); setLink(""); }}
                  className="text-xs transition-colors hover:text-white"
                  style={{ color: "#52525B" }}
                >
                  Try another link
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function HeroSection() {
  const [wordIndex, setWordIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setWordIndex((i) => (i + 1) % ROTATING_WORDS.length);
    }, 2200);
    return () => clearInterval(interval);
  }, []);

  return (
    <section
      className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden pt-24 pb-16"
      style={{ background: "#0a0a0a" }}
    >
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.055) 1px, transparent 1px)",
          backgroundSize: "28px 28px",
        }}
      />
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 70% 45% at 50% -5%, rgba(249,115,22,0.14) 0%, transparent 70%)",
        }}
      />

      <div className="cd-container relative z-10 flex flex-col items-center text-center">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-8"
          style={{ border: "1px solid rgba(249,115,22,0.3)", background: "rgba(249,115,22,0.06)" }}
        >
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: "#F97316" }} />
          <span className="text-[13px] font-medium" style={{ color: "#F97316" }}>
            50 free analyses · No card needed
          </span>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
          className="mb-6"
        >
          <h1
            style={{
              fontFamily: "'Inter', sans-serif",
              fontWeight: 800,
              fontSize: "clamp(2.8rem, 7vw, 5rem)",
              letterSpacing: "-0.04em",
              lineHeight: 1.05,
            }}
          >
            <span className="block text-white">Your feed</span>
            <span className="block" style={{ minHeight: "1.1em", overflow: "hidden" }}>
              <AnimatePresence mode="wait">
                <motion.span
                  key={wordIndex}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                  className="inline-block"
                  style={{ color: "#F97316" }}
                >
                  {ROTATING_WORDS[wordIndex]}
                </motion.span>
              </AnimatePresence>
            </span>
          </h1>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.18, ease: [0.16, 1, 0.3, 1] }}
          className="max-w-xl mb-10 leading-relaxed"
          style={{ fontSize: "clamp(1rem, 2.5vw, 1.15rem)" }}
        >
          <HeroSubheadline />
        </motion.div>

        <HeroAnalysePanel />

        <motion.div
          className="w-full mt-14"
          initial={{ opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
        >
          <HeroDemoAnimation />
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2, duration: 0.5 }}
          className="mt-6 flex flex-col items-center gap-2"
        >
          <span className="text-xs" style={{ color: "#52525B" }}>scroll to see how it works</span>
          <motion.div animate={{ y: [0, 6, 0] }} transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M8 3v10M4 9l4 4 4-4" stroke="#52525B" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
