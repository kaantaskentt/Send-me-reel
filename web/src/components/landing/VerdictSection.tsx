"use client";

/*
 * VerdictSection — redesigned as a clean 4-step workflow
 * Watch → Copy → Send → Done. No fluff. Visual steps with connecting line.
 */

import { useScrollAnimation } from "@/hooks/useScrollAnimation";

const STEPS = [
  {
    num: "1",
    icon: "📱",
    title: "Watch something",
    sub: "Reel, TikTok, tweet, article — anything.",
  },
  {
    num: "2",
    icon: "🔗",
    title: "Copy the link",
    sub: "Share button → copy URL. That's it.",
  },
  {
    num: "3",
    icon: "✈️",
    title: "Send it to ContextDrop",
    sub: "Paste in Telegram. One message.",
  },
  {
    num: "4",
    icon: "⚡",
    title: "Get your verdict in 30s",
    sub: "What it is. What's inside. What to do next.",
  },
];

export default function VerdictSection() {
  const sectionRef = useScrollAnimation(0.15) as React.RefObject<HTMLDivElement>;
  const cardsRef = useScrollAnimation(0.1) as React.RefObject<HTMLDivElement>;

  return (
    <section id="how-it-works" className="py-20 lg:py-28" style={{ background: "white" }}>
      <div style={{ maxWidth: 800, margin: "0 auto", padding: "0 clamp(1rem, 4vw, 4rem)" }}>

        {/* Headline */}
        <div ref={sectionRef} className="fade-up" style={{ textAlign: "center", marginBottom: "3rem" }}>
          <span style={{ display: "inline-block", fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#f97316", marginBottom: "0.75rem", fontFamily: "'DM Sans', sans-serif" }}>
            How it works
          </span>
          <h2 style={{ fontFamily: "'Plus Jakarta Sans', 'DM Sans', sans-serif", fontWeight: 800, fontSize: "clamp(1.8rem, 4vw, 2.8rem)", letterSpacing: "-0.04em", color: "#1c1917", lineHeight: 1.1, marginBottom: "0.75rem" }}>
            Four steps.<br /><span style={{ color: "#f97316" }}>Thirty seconds.</span>
          </h2>
        </div>

        {/* Steps */}
        <div ref={cardsRef} className="stagger-children" style={{ display: "flex", flexDirection: "column", gap: 0, position: "relative" }}>

          {/* Connecting line */}
          <div style={{ position: "absolute", left: 27, top: 40, bottom: 40, width: 2, background: "linear-gradient(180deg, #fed7aa 0%, #f97316 50%, #fed7aa 100%)", borderRadius: 2, zIndex: 0 }} className="hidden sm:block" />

          {STEPS.map((step, i) => (
            <div
              key={step.num}
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 16,
                padding: "20px 0",
                position: "relative",
                zIndex: 1,
              }}
            >
              {/* Step number circle */}
              <div style={{
                width: 56,
                height: 56,
                borderRadius: 16,
                background: i === 3 ? "#f97316" : "white",
                border: i === 3 ? "none" : "2px solid #e7e2d9",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                fontSize: 22,
                boxShadow: i === 3 ? "0 4px 16px rgba(249,115,22,0.25)" : "0 2px 8px rgba(0,0,0,0.04)",
                transition: "all 0.2s",
              }}>
                {step.icon}
              </div>

              {/* Content */}
              <div style={{ flex: 1, paddingTop: 6 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: "#f97316", background: "#fff7ed", border: "1px solid #fed7aa", padding: "1px 8px", borderRadius: 20, fontFamily: "'JetBrains Mono', monospace" }}>
                    {step.num}
                  </span>
                  <h3 style={{ fontSize: 16, fontWeight: 700, color: "#1c1917", margin: 0, fontFamily: "'DM Sans', sans-serif" }}>
                    {step.title}
                  </h3>
                </div>
                <p style={{ fontSize: 14, color: "#78716c", margin: 0, lineHeight: 1.5, fontFamily: "'DM Sans', sans-serif" }}>
                  {step.sub}
                </p>
              </div>

              {/* Arrow connector (between steps, not after last) */}
              {i < STEPS.length - 1 && (
                <div className="hidden sm:block" style={{ position: "absolute", bottom: -4, left: 27, transform: "translateX(-50%)" }}>
                  <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                    <path d="M4 0L4 8M1 5L4 8L7 5" stroke="#fed7aa" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* What you get — compact cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12, marginTop: "2.5rem" }}>
          {[
            { icon: "🧠", label: "The Verdict", desc: "Sharp take on what's inside" },
            { icon: "✅", label: "Tasks", desc: "One-tap action items from content" },
            { icon: "⚡", label: "Deep Dive", desc: "Every tool, link, and insight" },
          ].map((f) => (
            <div key={f.label} style={{ background: "#faf8f5", border: "1px solid #f0ebe4", borderRadius: 14, padding: "14px 16px", display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ fontSize: 20 }}>{f.icon}</span>
              <div>
                <p style={{ fontSize: 13, fontWeight: 700, color: "#1c1917", margin: 0, fontFamily: "'DM Sans', sans-serif" }}>{f.label}</p>
                <p style={{ fontSize: 11, color: "#a8a29e", margin: 0, fontFamily: "'DM Sans', sans-serif" }}>{f.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div style={{ textAlign: "center", marginTop: "2rem" }}>
          <a
            href="https://t.me/contextdrop2027bot"
            target="_blank"
            rel="noopener noreferrer"
            style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "#f97316", color: "#fff", fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: 14, padding: "12px 24px", borderRadius: 100, textDecoration: "none", boxShadow: "0 4px 16px rgba(249,115,22,0.3)", transition: "all 0.15s" }}
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
