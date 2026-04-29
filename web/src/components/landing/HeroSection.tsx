"use client";

/*
 * HeroSection — Manus "Dark Signal" port (Apr 26)
 * Dark #0a0a0a + dot grid + orange radial glow.
 * Rotating word headline, two floating analysis cards.
 */

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const ROTATING_WORDS = ["actioned.", "summarised.", "tried.", "understood."];

const HERO_CARDS = [
  {
    platform: "Instagram",
    platformColor: "#E1306C",
    title: "Kimi K2.6 — Moonshot AI's coding model",
    summary: "SWE-Bench Pro 58.6. Top-ranked on agentic coding benchmarks. Free tier available.",
    action: "Try it at kimi.com — drop a bug and see if it catches what Cursor misses.",
    tags: ["AI Tools", "Coding"],
    time: "2h ago",
  },
  {
    platform: "X",
    platformColor: "#FAFAFA",
    title: "Caveman — open-source AI output compressor",
    summary: "Rewrites verbose AI coding agent outputs into terse English. ~75% token reduction.",
    action: "github.com/JuliusBrussee/caveman — add to your Claude Code setup.",
    tags: ["Open Source", "Dev Tools"],
    time: "5h ago",
  },
];

function PlatformIcon({ platform, color }: { platform: string; color: string }) {
  if (platform === "Instagram") {
    return (
      <svg width="13" height="13" viewBox="0 0 24 24" fill={color}>
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
      </svg>
    );
  }
  if (platform === "X") {
    return (
      <svg width="13" height="13" viewBox="0 0 24 24" fill={color}>
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.73-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
      </svg>
    );
  }
  return null;
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
            className="text-white"
            style={{
              fontFamily: "'Inter', sans-serif",
              fontWeight: 800,
              fontSize: "clamp(2.8rem, 7vw, 5rem)",
              letterSpacing: "-0.04em",
              lineHeight: 1.05,
            }}
          >
            Your feed.
            <br />
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
          </h1>
        </motion.div>

        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.18, ease: [0.16, 1, 0.3, 1] }}
          className="max-w-xl mb-10 leading-relaxed"
          style={{ fontSize: "clamp(1rem, 2.5vw, 1.15rem)", color: "#A1A1AA" }}
        >
          Send any link to Mr Context on Telegram. Get back the one thing worth doing — in 30 seconds.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.26, ease: [0.16, 1, 0.3, 1] }}
          className="flex flex-col sm:flex-row items-center gap-3 mb-10"
        >
          <a
            href="/signup"
            className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl font-semibold text-white text-base transition-all duration-150 hover:brightness-110 active:scale-95"
            style={{ background: "#F97316", boxShadow: "0 0 28px rgba(249,115,22,0.28)", textDecoration: "none" }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12l-6.871 4.326-2.962-.924c-.643-.204-.657-.643.136-.953l11.57-4.461c.537-.194 1.006.131.833.941z"/>
            </svg>
            Start free
          </a>
          <a
            href="/dashboard"
            className="text-sm font-medium transition-colors duration-150 hover:text-white"
            style={{ color: "#71717A", textDecoration: "none" }}
          >
            or see the dashboard →
          </a>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.38 }}
          className="flex items-center gap-3 mb-14"
        >
          <div className="flex -space-x-2">
            {[
              "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=32&h=32&fit=crop&crop=face",
              "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=32&h=32&fit=crop&crop=face",
              "https://images.unsplash.com/photo-1599566150163-29194dcaad36?w=32&h=32&fit=crop&crop=face",
              "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=32&h=32&fit=crop&crop=face",
            ].map((src, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={i} src={src} alt="" className="w-7 h-7 rounded-full border-2 object-cover" style={{ borderColor: "#0a0a0a" }} />
            ))}
          </div>
          <span className="text-sm" style={{ color: "#71717A" }}>
            <span className="text-white font-semibold">2,400+</span> creators &amp; founders
          </span>
        </motion.div>

        <div className="w-full max-w-2xl flex flex-col sm:flex-row gap-4">
          {HERO_CARDS.map((card, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 28 + i * 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.65, delay: 0.5 + i * 0.12, ease: [0.16, 1, 0.3, 1] }}
              className="flex-1 rounded-xl p-4 text-left"
              style={{
                background: "#111111",
                border: "1px solid rgba(255,255,255,0.08)",
                borderLeft: `3px solid ${card.platformColor}`,
              }}
            >
              <div className="flex items-center gap-1.5 mb-3">
                <PlatformIcon platform={card.platform} color={card.platformColor} />
                <span
                  className="text-[11px] font-medium uppercase tracking-wider"
                  style={{ color: "#71717A", fontFamily: "'JetBrains Mono', monospace" }}
                >
                  {card.platform}
                </span>
                <span
                  className="ml-auto text-[11px]"
                  style={{ color: "#52525B", fontFamily: "'JetBrains Mono', monospace" }}
                >
                  {card.time}
                </span>
              </div>
              <p className="text-white text-sm font-semibold mb-2 leading-snug">{card.title}</p>
              <p className="text-[13px] mb-3 leading-relaxed" style={{ color: "#A1A1AA" }}>{card.summary}</p>
              <div className="rounded-lg p-3" style={{ background: "rgba(249,115,22,0.06)", border: "1px solid rgba(249,115,22,0.2)" }}>
                <div
                  className="text-[10px] font-semibold uppercase tracking-widest mb-1"
                  style={{ color: "#F97316", fontFamily: "'JetBrains Mono', monospace" }}
                >
                  TRY THIS ONCE
                </div>
                <p className="text-[12px] leading-relaxed" style={{ color: "#D4D4D8" }}>{card.action}</p>
              </div>
              <div className="flex gap-1.5 mt-3">
                {card.tags.map((tag) => (
                  <span
                    key={tag}
                    className="text-[11px] px-2 py-0.5 rounded-md"
                    style={{ background: "rgba(255,255,255,0.06)", color: "#71717A", border: "1px solid rgba(255,255,255,0.08)" }}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2, duration: 0.5 }}
          className="mt-14 flex flex-col items-center gap-2"
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
