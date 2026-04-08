"use client";

/*
 * HowItWorksSection — ContextDrop "Design B Simplified"
 * 3 steps with orange sweep on hover
 * Step 1: Send the link (Telegram + WhatsApp emoji, 60 seconds)
 * Step 2: AI analyzes it (platform icons: Instagram, TikTok, LinkedIn, X)
 * Step 3: You decide (Learn / Apply / Skip)
 */

import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import { useState } from "react";

function PlatformPills() {
  const platforms = [
    {
      label: "Instagram",
      bg: "linear-gradient(135deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)",
      color: "#fff",
    },
    { label: "TikTok", bg: "#000", color: "#fff" },
    { label: "LinkedIn", bg: "#0A66C2", color: "#fff" },
    { label: "X", bg: "#000", color: "#fff" },
  ];
  return (
    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 10 }}>
      {platforms.map((p) => (
        <span
          key={p.label}
          style={{
            fontSize: 10,
            fontWeight: 700,
            padding: "3px 10px",
            borderRadius: 100,
            background: p.bg,
            color: p.color,
            fontFamily: "'DM Sans', sans-serif",
            letterSpacing: "0.02em",
          }}
        >
          {p.label}
        </span>
      ))}
    </div>
  );
}

const STEPS = [
  {
    number: "1",
    emoji: "⚡",
    title: "Send a link",
    body: "Drop any video URL into ContextDrop on Telegram or WhatsApp. That's literally it.",
    extra: <PlatformPills />,
    chip: "📱 Telegram · 💬 WhatsApp",
  },
  {
    number: "2",
    emoji: "🧠",
    title: "AI analyzes it",
    body: "ContextDrop watches the video, transcribes the audio, and identifies every tool, framework, and idea mentioned.",
    extra: null,
    chip: "⏱ ~60 seconds avg",
  },
  {
    number: "3",
    emoji: "✅",
    title: "You decide",
    body: "Get a structured verdict. Tap Learn to study it, Apply to act on it, or Skip to move on. Your feed stays clean.",
    extra: null,
    chip: "📚 Learn · 🚀 Apply · ⏭ Skip",
  },
];

function StepCard({ step }: { step: (typeof STEPS)[0] }) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid #e7e2d9",
        borderRadius: 18,
        padding: "1.5rem",
        boxShadow: hovered
          ? "0 4px 20px rgba(0,0,0,0.08)"
          : "0 1px 3px rgba(0,0,0,0.05)",
        transition: "all 0.22s ease",
        transform: hovered ? "translateY(-3px)" : "translateY(0)",
        position: "relative",
        overflow: "hidden",
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Orange sweep top border */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 3,
          background: "linear-gradient(90deg, #f97316, #fb923c)",
          transform: hovered ? "scaleX(1)" : "scaleX(0)",
          transformOrigin: "left",
          transition: "transform 0.3s ease",
          borderRadius: "18px 18px 0 0",
        }}
      />

      {/* Step number badge */}
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: 30,
          height: 30,
          background: "#f97316",
          color: "#fff",
          fontWeight: 800,
          fontSize: 13,
          borderRadius: 8,
          marginBottom: "1rem",
          fontFamily: "'Plus Jakarta Sans', 'DM Sans', sans-serif",
        }}
      >
        {step.number}
      </div>

      <div style={{ fontSize: 26, marginBottom: "0.6rem" }}>{step.emoji}</div>

      <h3
        style={{
          fontFamily: "'Plus Jakarta Sans', 'DM Sans', sans-serif",
          fontWeight: 700,
          fontSize: 15,
          color: "#1c1917",
          marginBottom: 6,
        }}
      >
        {step.title}
      </h3>

      <p
        style={{
          fontSize: 13,
          color: "#78716c",
          lineHeight: 1.65,
          marginBottom: step.extra ? 0 : 12,
        }}
      >
        {step.body}
      </p>

      {step.extra}

      {/* Chip */}
      <div
        style={{
          background: "#faf8f5",
          border: "1px solid #e7e2d9",
          borderRadius: 8,
          padding: "8px 12px",
          fontFamily: "'JetBrains Mono', 'DM Mono', monospace",
          fontSize: 11,
          color: "#f97316",
          marginTop: 12,
        }}
      >
        {step.chip}
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
          maxWidth: 900,
          margin: "0 auto",
          padding: "clamp(4rem, 8vh, 6rem) clamp(1.5rem, 5vw, 5rem)",
        }}
      >
        {/* Headline */}
        <div
          ref={headlineRef}
          className="fade-up"
          style={{ textAlign: "center", marginBottom: "3rem" }}
        >
          <span
            style={{
              display: "inline-block",
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: "0.1em",
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
            <span style={{ color: "#f97316" }}>60 seconds.</span>
          </h2>
          <p
            style={{
              fontSize: 15,
              color: "#78716c",
              maxWidth: 460,
              margin: "0 auto",
              lineHeight: 1.7,
              fontFamily: "'DM Sans', sans-serif",
            }}
          >
            From link to actionable insight, faster than you can scroll past the
            next video.
          </p>
        </div>

        {/* Step cards */}
        <div
          ref={stepsRef}
          className="stagger-children"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
            gap: "1.25rem",
          }}
        >
          {STEPS.map((step) => (
            <StepCard key={step.number} step={step} />
          ))}
        </div>

        {/* CTA */}
        <div style={{ textAlign: "center", marginTop: "3rem" }}>
          <a
            href="https://t.me/contextdrop2027bot"
            target="_blank"
            rel="noopener noreferrer"
            className="btn-primary inline-flex"
          >
            <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12l-6.871 4.326-2.962-.924c-.643-.204-.657-.643.136-.953l11.57-4.461c.537-.194 1.006.131.833.941z" />
            </svg>
            Try it now — it's free
          </a>
        </div>
      </div>
    </section>
  );
}
