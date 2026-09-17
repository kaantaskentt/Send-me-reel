"use client";

/*
 * HeroSection — Manus "Dark Signal" port (Apr 26)
 * Dark #0a0a0a + dot grid + orange radial glow.
 * Fixed headline, paste-link input, demo animation.
 */

import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import HeroDemoAnimation from "./HeroDemoAnimation";
import { useRouter } from "next/navigation";
import { contentLink, linkLoginDestination, localLinkDestination } from "@/lib/link-handoff";

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

function HeroAnalysePanel({ localStudio }: { localStudio: boolean }) {
  const router = useRouter();
  const [link, setLink] = useState("");
  const [focused, setFocused] = useState(false);
  const [checking, setChecking] = useState(false);
  const [urlError, setUrlError] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigating = useRef(false);

  const handleSubmit = async (value = link) => {
    if (!value.trim() || navigating.current) return;
    const target = contentLink(value);
    if (!target) {
      setUrlError(true);
      return;
    }
    setUrlError(false);
    navigating.current = true;
    setChecking(true);
    if (localStudio) {
      let storage: Storage | null = null;
      try { storage = window.sessionStorage; } catch { /* The workspace can still prefill the link. */ }
      router.push(localLinkDestination(target, storage, crypto.randomUUID()));
      return;
    }
    let signedOut = false;
    try {
      const res = await fetch("/api/user", { signal: AbortSignal.timeout(5_000), cache: "no-store" });
      signedOut = res.status === 401;
      if (res.ok) {
        const data = await res.json();
        if (data?.user) {
          try { sessionStorage.setItem("pendingLink", target); router.push("/dashboard"); }
          catch { router.push(`/share?url=${encodeURIComponent(target)}`); }
          return;
        }
      }
    } catch {}
    // If the session check is unavailable, let the server's existing share flow
    // resolve auth while keeping the link. A signed-in /login redirect drops query data.
    router.push(signedOut ? linkLoginDestination(target) : `/share?url=${encodeURIComponent(target)}`);
  };

  return (
    <motion.div
      id="start"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.26, ease: [0.16, 1, 0.3, 1] }}
      className="w-full max-w-xl mb-10"
    >
      <AnimatePresence mode="wait">
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
                id="content-link-input"
                ref={inputRef}
                type="text"
                aria-label="Link to read"
                placeholder="Paste any link — YouTube, TikTok, X, Instagram, article..."
                value={link}
                onChange={(e) => { setLink(e.target.value); setUrlError(false); }}
                onPaste={(event) => {
                  const pasted = event.clipboardData.getData("text").trim();
                  if (!contentLink(pasted)) return;
                  event.preventDefault();
                  setLink(pasted);
                  void handleSubmit(pasted);
                }}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                onKeyDown={(e) => { if (e.key === "Enter") handleSubmit(); }}
                className="flex-1 bg-transparent text-sm outline-none"
                style={{ color: "#FAFAFA", fontFamily: "'Inter', sans-serif" }}
              />
              <button
                aria-label="Read this link"
                onClick={() => void handleSubmit()}
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
                That doesn&apos;t look like a link — paste a URL (e.g. https://...)
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
      </AnimatePresence>
    </motion.div>
  );
}

export default function HeroSection({ localStudio = false }: { localStudio?: boolean }) {
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
            Beta · 20 free analyses · No card needed
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
              <span className="inline-block" style={{ color: "#F97316" }}>finally useful.</span>
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

        <HeroAnalysePanel localStudio={localStudio} />

        <motion.div
          className="w-full mt-4"
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
