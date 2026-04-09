"use client";

/*
 * HowItWorksSection — ContextDrop "Warm Signal" Design
 * Full-width 3-column layout with connecting dashed line
 * Step 3 has animated verdict preview that cycles through cards
 * 30 seconds · Instagram/TikTok/LinkedIn/X · Claude agent example
 * Ported from Manus's landing/ prototype
 */

import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import { useEffect, useState } from "react";

const PLATFORMS = ["Instagram", "TikTok", "LinkedIn", "X", "YouTube"];

const VERDICT_CARDS = [
  {
    tag: "instagram reel",
    tagColor: "#ec4899",
    tagBg: "#fce7f3",
    title: "How to set up Claude agent managers",
    intent: "Apply",
    intentColor: "#16a34a",
    intentBg: "#f0fdf4",
  },
  {
    tag: "linkedin post",
    tagColor: "#0077b5",
    tagBg: "#e8f4fd",
    title: "Why most AI startups fail at distribution",
    intent: "Learn",
    intentColor: "#f97316",
    intentBg: "#fff5ee",
  },
  {
    tag: "youtube short",
    tagColor: "#dc2626",
    tagBg: "#fef2f2",
    title: "The Cursor AI workflow that 10x'd my output",
    intent: "Apply",
    intentColor: "#16a34a",
    intentBg: "#f0fdf4",
  },
];

function AnimatedVerdictPreview() {
  const [active, setActive] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setActive((prev) => (prev + 1) % VERDICT_CARDS.length);
        setVisible(true);
      }, 350);
    }, 2800);
    return () => clearInterval(interval);
  }, []);

  const card = VERDICT_CARDS[active];

  return (
    <div
      style={{
        background: "white",
        border: "1px solid #ede9e3",
        borderRadius: 14,
        padding: "14px 16px",
        boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
        transition: "opacity 0.35s ease, transform 0.35s ease",
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(6px)",
      }}
    >
      <div className="flex items-center gap-2 mb-2">
        <span
          className="text-[9px] font-bold px-2 py-0.5 rounded-full"
          style={{ background: card.tagBg, color: card.tagColor }}
        >
          {card.tag}
        </span>
      </div>
      <p
        className="text-[#1a1a1a] text-xs font-semibold mb-2.5 leading-snug"
        style={{ fontFamily: "'DM Sans', sans-serif" }}
      >
        {card.title}
      </p>
      <div className="flex gap-1.5">
        <span
          className="text-[10px] font-semibold px-2.5 py-1 rounded-full"
          style={{ background: card.intentBg, color: card.intentColor }}
        >
          {card.intent}
        </span>
        <span
          className="text-[10px] font-semibold px-2.5 py-1 rounded-full"
          style={{ background: "#faf8f5", color: "#78716c" }}
        >
          Skip
        </span>
      </div>
    </div>
  );
}

export default function HowItWorksSection() {
  const headlineRef = useScrollAnimation(0.2) as React.RefObject<HTMLDivElement>;
  const stepsRef = useScrollAnimation(0.15) as React.RefObject<HTMLDivElement>;

  return (
    <section
      id="how-it-works"
      style={{
        background: "#f5f1eb",
        borderTop: "1px solid #e7e2d9",
        borderBottom: "1px solid #e7e2d9",
      }}
    >
      <div
        style={{
          maxWidth: 1040,
          margin: "0 auto",
          padding: "clamp(4rem, 8vh, 6rem) clamp(1.5rem, 5vw, 4rem)",
        }}
      >
        {/* Headline */}
        <div
          ref={headlineRef}
          className="fade-up"
          style={{ textAlign: "center", marginBottom: "3.5rem" }}
        >
          <span
            style={{
              display: "inline-block",
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: "#f97316",
              marginBottom: "1rem",
              fontFamily: "'DM Sans', sans-serif",
            }}
          >
            How It Works
          </span>
          <h2
            style={{
              fontFamily: "'Plus Jakarta Sans', 'DM Sans', sans-serif",
              fontWeight: 800,
              fontSize: "clamp(2rem, 3.5vw, 3rem)",
              letterSpacing: "-0.04em",
              color: "#1c1917",
              lineHeight: 1.1,
              marginBottom: "1rem",
            }}
          >
            Three steps.{" "}
            <span style={{ color: "#f97316" }}>30 seconds.</span>
          </h2>
          <p
            style={{
              fontSize: 15,
              color: "#78716c",
              maxWidth: 400,
              margin: "0 auto",
              lineHeight: 1.7,
              fontFamily: "'DM Sans', sans-serif",
            }}
          >
            From link to actionable insight — faster than you can scroll past the next video.
          </p>
        </div>

        {/* Steps — 3-column grid with connecting line */}
        <div
          ref={stepsRef}
          className="stagger-children"
          style={{ position: "relative" }}
        >
          {/* Connecting dashed line (desktop only) */}
          <div
            style={{
              position: "absolute",
              top: 36,
              left: "calc(33.33% - 8px)",
              right: "calc(33.33% - 8px)",
              height: 1,
              borderTop: "2px dashed #e7e2d9",
              pointerEvents: "none",
              zIndex: 0,
            }}
            className="hidden lg:block"
          />

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: "1.25rem",
            }}
          >
            {/* Step 1 */}
            <div
              style={{
                background: "#fff",
                border: "1px solid #e7e2d9",
                borderRadius: 18,
                padding: "1.75rem",
                boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
                position: "relative",
                zIndex: 1,
              }}
            >
              <div
                style={{
                  width: 32, height: 32, borderRadius: 10,
                  background: "#f97316", color: "white",
                  fontFamily: "'Plus Jakarta Sans', 'DM Sans', sans-serif",
                  fontWeight: 800, fontSize: 14,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  marginBottom: "1.25rem",
                }}
              >
                1
              </div>
              <h3 style={{ fontFamily: "'Plus Jakarta Sans', 'DM Sans', sans-serif", fontWeight: 700, fontSize: 17, color: "#1c1917", marginBottom: 8, letterSpacing: "-0.02em" }}>
                Send a link
              </h3>
              <p style={{ fontSize: 13.5, color: "#78716c", lineHeight: 1.7, fontFamily: "'DM Sans', sans-serif", marginBottom: 16 }}>
                Drop any video or post URL into ContextDrop on Telegram or WhatsApp. No app to download. No account needed to start.
              </p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 14 }}>
                {PLATFORMS.map((p) => (
                  <span key={p} style={{ fontSize: 10, fontWeight: 600, padding: "3px 9px", borderRadius: 100, background: "#faf8f5", color: "#78716c", border: "1px solid #e7e2d9", fontFamily: "'DM Sans', sans-serif" }}>
                    {p}
                  </span>
                ))}
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <span style={{ fontSize: 10, fontWeight: 700, padding: "3px 10px", borderRadius: 100, background: "#0088cc", color: "#fff", fontFamily: "'DM Sans', sans-serif" }}>Telegram</span>
                <span style={{ fontSize: 10, fontWeight: 700, padding: "3px 10px", borderRadius: 100, background: "#25D366", color: "#fff", fontFamily: "'DM Sans', sans-serif" }}>WhatsApp</span>
              </div>
            </div>

            {/* Step 2 */}
            <div style={{ background: "#fff", border: "1px solid #e7e2d9", borderRadius: 18, padding: "1.75rem", boxShadow: "0 1px 4px rgba(0,0,0,0.05)", position: "relative", zIndex: 1 }}>
              <div style={{ width: 32, height: 32, borderRadius: 10, background: "#f97316", color: "white", fontFamily: "'Plus Jakarta Sans', 'DM Sans', sans-serif", fontWeight: 800, fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "1.25rem" }}>
                2
              </div>
              <h3 style={{ fontFamily: "'Plus Jakarta Sans', 'DM Sans', sans-serif", fontWeight: 700, fontSize: 17, color: "#1c1917", marginBottom: 8, letterSpacing: "-0.02em" }}>
                AI analyses it
              </h3>
              <p style={{ fontSize: 13.5, color: "#78716c", lineHeight: 1.7, fontFamily: "'DM Sans', sans-serif", marginBottom: 20 }}>
                ContextDrop watches the video, transcribes the audio, and surfaces every tool, framework, and idea mentioned — structured into a clean verdict.
              </p>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 7, background: "#faf8f5", border: "1px solid #e7e2d9", borderRadius: 8, padding: "7px 12px", fontFamily: "'JetBrains Mono', 'DM Mono', monospace", fontSize: 11, color: "#a8a29e" }}>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" />
                </svg>
                ~30 seconds avg
              </div>
            </div>

            {/* Step 3 — animated verdict preview */}
            <div style={{ background: "#fff", border: "1px solid #e7e2d9", borderRadius: 18, padding: "1.75rem", boxShadow: "0 1px 4px rgba(0,0,0,0.05)", position: "relative", zIndex: 1 }}>
              <div style={{ width: 32, height: 32, borderRadius: 10, background: "#f97316", color: "white", fontFamily: "'Plus Jakarta Sans', 'DM Sans', sans-serif", fontWeight: 800, fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "1.25rem" }}>
                3
              </div>
              <h3 style={{ fontFamily: "'Plus Jakarta Sans', 'DM Sans', sans-serif", fontWeight: 700, fontSize: 17, color: "#1c1917", marginBottom: 8, letterSpacing: "-0.02em" }}>
                You get a verdict
              </h3>
              <p style={{ fontSize: 13.5, color: "#78716c", lineHeight: 1.7, fontFamily: "'DM Sans', sans-serif", marginBottom: 14 }}>
                A structured breakdown — what it is, what&apos;s inside, why it matters to you. Tap <strong style={{ color: "#f97316" }}>Learn</strong>, <strong style={{ color: "#16a34a" }}>Apply</strong>, or <strong style={{ color: "#78716c" }}>Skip</strong>. Your feed stays clean.
              </p>
              <AnimatedVerdictPreview />
            </div>
          </div>
        </div>

        {/* CTA */}
        <div style={{ textAlign: "center", marginTop: "3rem" }}>
          <a
            href="https://t.me/contextdrop2027bot"
            target="_blank"
            rel="noopener noreferrer"
            className="btn-primary inline-flex"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12l-6.871 4.326-2.962-.924c-.643-.204-.657-.643.136-.953l11.57-4.461c.537-.194 1.006.131.833.941z" />
            </svg>
            Try it now — it&apos;s free
          </a>
        </div>
      </div>
    </section>
  );
}
