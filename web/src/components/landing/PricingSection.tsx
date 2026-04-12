"use client";

import { useScrollAnimation } from "@/hooks/useScrollAnimation";

const FREE_FEATURES = [
  "10 analyses per month",
  "Full summary + sharp take",
  "Add to tasks (up to 10)",
  "Works on Telegram",
  "Feed dashboard",
];

const PRO_FEATURES = [
  { text: "Unlimited analyses", bold: true },
  { text: "Full summary + sharp take", bold: false },
  { text: "Unlimited tasks", bold: false },
  { text: "Works on Telegram & WhatsApp", bold: false },
  { text: "Feed dashboard + search", bold: false },
  { text: "Ask AI follow-ups", bold: false },
  { text: "Notion sync", bold: false },
  { text: "Priority processing", bold: false },
];

export default function PricingSection() {
  const headlineRef = useScrollAnimation(0.2) as React.RefObject<HTMLDivElement>;
  const cardsRef = useScrollAnimation(0.15) as React.RefObject<HTMLDivElement>;

  return (
    <section id="pricing" className="py-24 lg:py-32" style={{ background: "#faf8f5" }}>
      <div style={{ maxWidth: 800, margin: "0 auto", padding: "0 clamp(1rem, 4vw, 4rem)" }}>

        {/* Headline */}
        <div ref={headlineRef} className="fade-up" style={{ textAlign: "center", marginBottom: "3rem" }}>
          <span style={{ display: "inline-block", fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#f97316", marginBottom: "0.75rem", fontFamily: "'DM Sans', sans-serif" }}>
            Pricing
          </span>
          <h2 style={{ fontFamily: "'Plus Jakarta Sans', 'DM Sans', sans-serif", fontWeight: 800, fontSize: "clamp(2rem, 4vw, 3rem)", letterSpacing: "-0.04em", color: "#1c1917", lineHeight: 1.1, marginBottom: "0.75rem" }}>
            Simple pricing.<br /><span style={{ color: "#f97316" }}>No surprises.</span>
          </h2>
          <p style={{ fontSize: 15, color: "#78716c", maxWidth: 400, margin: "0 auto", lineHeight: 1.7, fontFamily: "'DM Sans', sans-serif" }}>
            Start free. Upgrade when you&apos;re getting value.<br />Cancel anytime — no dark patterns.
          </p>
        </div>

        {/* Cards */}
        <div ref={cardsRef} className="stagger-children" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 20, marginBottom: "2rem" }}>

          {/* Free */}
          <div style={{ background: "white", borderRadius: 20, border: "1px solid #e7e2d9", padding: "32px 28px", display: "flex", flexDirection: "column" }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: "#a8a29e", textTransform: "uppercase", letterSpacing: "0.1em", fontFamily: "'DM Sans', sans-serif" }}>Free</span>
            <div style={{ marginTop: 12, marginBottom: 12, display: "flex", alignItems: "baseline", gap: 4 }}>
              <span style={{ fontSize: 48, fontWeight: 800, color: "#1c1917", fontFamily: "'DM Sans', sans-serif", lineHeight: 1 }}>$0</span>
              <span style={{ fontSize: 14, color: "#a8a29e" }}>/month</span>
            </div>
            <p style={{ fontSize: 13, color: "#78716c", marginBottom: 24, lineHeight: 1.5, fontFamily: "'DM Sans', sans-serif" }}>Good enough to see if this is for you. No card required.</p>

            <div style={{ display: "flex", flexDirection: "column", gap: 12, flex: 1, marginBottom: 28 }}>
              {FREE_FEATURES.map((f) => (
                <div key={f} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3.5 8L6.5 11L12.5 5" stroke="#a8a29e" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  <span style={{ fontSize: 13, color: "#57534e", fontFamily: "'DM Sans', sans-serif" }}>{f}</span>
                </div>
              ))}
            </div>

            <a href="https://t.me/contextdrop2027bot" target="_blank" rel="noopener noreferrer"
              style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "12px 24px", borderRadius: 12, border: "1px solid #e7e2d9", background: "#faf8f5", color: "#44403c", fontSize: 14, fontWeight: 700, textDecoration: "none", fontFamily: "'DM Sans', sans-serif", transition: "all 0.15s" }}>
              Start free on Telegram
            </a>
          </div>

          {/* Pro — dark card */}
          <div style={{ background: "#1c1917", borderRadius: 20, padding: "32px 28px", display: "flex", flexDirection: "column", position: "relative", overflow: "hidden", boxShadow: "0 12px 40px rgba(0,0,0,0.15)" }}>
            <span style={{ position: "absolute", top: 20, right: 20, fontSize: 10, fontWeight: 700, color: "#fff", background: "#f97316", padding: "4px 12px", borderRadius: 100 }}>Most popular</span>

            <span style={{ fontSize: 12, fontWeight: 700, color: "#f97316", textTransform: "uppercase", letterSpacing: "0.1em", fontFamily: "'DM Sans', sans-serif" }}>Pro</span>
            <div style={{ marginTop: 12, marginBottom: 12, display: "flex", alignItems: "baseline", gap: 4 }}>
              <span style={{ fontSize: 48, fontWeight: 800, color: "#fff", fontFamily: "'DM Sans', sans-serif", lineHeight: 1 }}>$9</span>
              <span style={{ fontSize: 14, color: "#a8a29e" }}>/month</span>
            </div>
            <p style={{ fontSize: 13, color: "#a8a29e", marginBottom: 24, lineHeight: 1.5, fontFamily: "'DM Sans', sans-serif" }}>Unlimited everything. For people who actually use it.</p>

            <div style={{ display: "flex", flexDirection: "column", gap: 12, flex: 1, marginBottom: 28 }}>
              {PRO_FEATURES.map((f) => (
                <div key={f.text} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3.5 8L6.5 11L12.5 5" stroke="#f97316" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  <span style={{ fontSize: 13, color: f.bold ? "#fff" : "#d6d3d1", fontWeight: f.bold ? 700 : 400, fontFamily: "'DM Sans', sans-serif" }}>{f.text}</span>
                </div>
              ))}
            </div>

            <a href="/pricing"
              style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "12px 24px", borderRadius: 12, background: "#f97316", color: "#fff", fontSize: 14, fontWeight: 700, textDecoration: "none", fontFamily: "'DM Sans', sans-serif", boxShadow: "0 4px 16px rgba(249,115,22,0.3)", transition: "all 0.15s" }}>
              Get Pro — $9/mo
            </a>
          </div>
        </div>

        {/* Bottom tagline */}
        <p style={{ textAlign: "center", fontSize: 12, color: "#b8b0a8", fontFamily: "'JetBrains Mono', monospace", marginTop: "1.5rem" }}>
          // No annual lock-in. Cancel from Telegram with one message.
        </p>
      </div>
    </section>
  );
}
