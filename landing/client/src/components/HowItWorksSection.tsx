/*
 * HowItWorksSection — ContextDrop "Warm Signal" Design
 * Refined 3-step layout: horizontal numbered steps with connector line
 * Clean cards, no emoji-in-circles, better visual hierarchy
 */

import { useScrollAnimation } from "@/hooks/useScrollAnimation";

const STEPS = [
  {
    number: "01",
    title: "Send a link",
    body: "Drop any video URL into ContextDrop — on Telegram or WhatsApp. No app to download. No account needed to start.",
    detail: "Works with TikTok · Instagram · YouTube · LinkedIn · X",
    platforms: [
      { label: "Telegram", bg: "#0088cc", color: "#fff" },
      { label: "WhatsApp", bg: "#25D366", color: "#fff" },
    ],
  },
  {
    number: "02",
    title: "AI analyzes it",
    body: "ContextDrop watches the video, transcribes the audio, and surfaces every tool, framework, and idea mentioned — in under 60 seconds.",
    detail: "⏱ ~60 seconds avg",
    platforms: [],
  },
  {
    number: "03",
    title: "You get a verdict",
    body: "Not a summary — a decision. Tap Learn to go deeper, Apply to get an action plan, or Skip to move on. Your feed stays clean.",
    detail: "Learn · Apply · Skip",
    platforms: [],
  },
];

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
          maxWidth: 960,
          margin: "0 auto",
          padding: "clamp(4rem, 8vh, 6rem) clamp(1.5rem, 5vw, 5rem)",
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
            <span style={{ color: "#f97316" }}>60 seconds.</span>
          </h2>
          <p
            style={{
              fontSize: 15,
              color: "#78716c",
              maxWidth: 420,
              margin: "0 auto",
              lineHeight: 1.7,
              fontFamily: "'DM Sans', sans-serif",
            }}
          >
            From link to actionable insight, faster than you can scroll past the next video.
          </p>
        </div>

        {/* Step cards */}
        <div
          ref={stepsRef}
          className="stagger-children"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            gap: "1.25rem",
            position: "relative",
          }}
        >
          {STEPS.map((step, i) => (
            <div
              key={step.number}
              style={{
                background: "#fff",
                border: "1px solid #e7e2d9",
                borderRadius: 18,
                padding: "1.75rem",
                boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
                position: "relative",
              }}
            >
              {/* Step number — large, light, background */}
              <div
                style={{
                  position: "absolute",
                  top: "1.25rem",
                  right: "1.25rem",
                  fontSize: 48,
                  fontWeight: 900,
                  color: "#f5f1eb",
                  fontFamily: "'Plus Jakarta Sans', 'DM Sans', sans-serif",
                  lineHeight: 1,
                  userSelect: "none",
                  letterSpacing: "-0.04em",
                }}
              >
                {step.number}
              </div>

              {/* Connector arrow between steps (desktop only) */}
              {i < STEPS.length - 1 && (
                <div
                  style={{
                    display: "none", // hidden on mobile, shown via CSS below
                  }}
                  className="step-connector"
                />
              )}

              {/* Orange accent line */}
              <div
                style={{
                  width: 28,
                  height: 3,
                  background: "linear-gradient(90deg, #f97316, #fb923c)",
                  borderRadius: 100,
                  marginBottom: "1.25rem",
                }}
              />

              <h3
                style={{
                  fontFamily: "'Plus Jakarta Sans', 'DM Sans', sans-serif",
                  fontWeight: 700,
                  fontSize: 17,
                  color: "#1c1917",
                  marginBottom: 8,
                  letterSpacing: "-0.02em",
                }}
              >
                {step.title}
              </h3>

              <p
                style={{
                  fontSize: 13.5,
                  color: "#78716c",
                  lineHeight: 1.7,
                  fontFamily: "'DM Sans', sans-serif",
                  marginBottom: 14,
                }}
              >
                {step.body}
              </p>

              {/* Platform badges */}
              {step.platforms.length > 0 && (
                <div style={{ display: "flex", gap: 6, marginBottom: 12, flexWrap: "wrap" }}>
                  {step.platforms.map((p) => (
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
              )}

              {/* Detail chip */}
              <div
                style={{
                  background: "#faf8f5",
                  border: "1px solid #e7e2d9",
                  borderRadius: 8,
                  padding: "7px 12px",
                  fontFamily: "'JetBrains Mono', 'DM Mono', monospace",
                  fontSize: 10.5,
                  color: "#a8a29e",
                }}
              >
                {step.detail}
              </div>
            </div>
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
