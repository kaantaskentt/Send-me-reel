"use client";

/*
 * FinalCTASection + Footer — ContextDrop "Merged Best"
 * FROM DESIGN B: video background with amber gradient overlay for visual bookend
 * FROM WEBDEV: trust signals, secondary dashboard link, clean footer
 */

import { useScrollAnimation } from "@/hooks/useScrollAnimation";

const HERO_VIDEO_URL =
  "https://d2xsxph8kpxj0f.cloudfront.net/310419663029819932/PLcAoykFsSXnZwd5KnAU3Y/hero_loop_5e8e7a1f.mp4";

export default function FinalCTASection() {
  const ctaRef = useScrollAnimation(0.2) as React.RefObject<HTMLDivElement>;

  return (
    <>
      {/* CTA Section */}
      <section
        className="py-24 lg:py-32"
        style={{ position: "relative", overflow: "hidden", background: "#faf8f5" }}
      >
        {/* Video background bookend */}
        <div style={{ position: "absolute", inset: 0, zIndex: 0 }}>
          <video
            autoPlay
            muted
            loop
            playsInline
            style={{ width: "100%", height: "100%", objectFit: "cover", opacity: 0.18 }}
          >
            <source src={HERO_VIDEO_URL} type="video/mp4" />
          </video>
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "rgba(250,248,245,0.88)",
            }}
          />
        </div>
        <div className="landing-container" style={{ position: "relative", zIndex: 1 }}>
          <div ref={ctaRef} className="fade-up max-w-2xl mx-auto text-center">
            {/* Small eyebrow label */}
            <div
              className="text-xs font-bold tracking-widest uppercase mb-6"
              style={{ color: "#F97316", fontFamily: "'DM Sans', sans-serif" }}
            >
              Your move
            </div>

            <h2
              className="text-4xl sm:text-5xl lg:text-6xl text-[#1a1a1a] mb-6"
              style={{ fontFamily: "'Plus Jakarta Sans', 'DM Sans', sans-serif", fontWeight: 800, letterSpacing: "-0.04em", lineHeight: 1.05 }}
            >
              You're not behind.
              <br />
              <span style={{ fontFamily: "var(--font-instrument-serif), 'Instrument Serif', Georgia, serif", fontStyle: "italic", fontWeight: 400, letterSpacing: "-0.02em" }}>
                Just one sip at a time.
              </span>
            </h2>

            <p
              className="text-slate-500 text-lg mb-10 leading-relaxed max-w-xl mx-auto"
              style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 400 }}
            >
              Your first 50 are free. No card. Send a link, see what comes back.
            </p>

            {/* Two-button CTA */}
            <div className="flex flex-wrap items-center justify-center gap-3 mb-8">
              <a
                href="https://t.me/contextdrop2027bot"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-base font-semibold py-3.5 px-7 rounded-full transition-all"
                style={{ background: "#1c1917", color: "white", fontFamily: "'DM Sans', sans-serif", textDecoration: "none" }}
              >
                Start free on Telegram
                <span style={{ fontSize: 18, marginTop: -1 }}>→</span>
              </a>
              <a
                href="/dashboard"
                className="inline-flex items-center text-base font-semibold py-3.5 px-7 rounded-full transition-all"
                style={{ background: "transparent", color: "#1c1917", border: "1px solid #d6d3d1", fontFamily: "'DM Sans', sans-serif", textDecoration: "none" }}
              >
                Open dashboard
              </a>
            </div>

            {/* Trust signals — dots, no emojis */}
            <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm" style={{ color: "#78716c", fontFamily: "'DM Sans', sans-serif" }}>
              {[
                "50 free verdicts",
                "No card required",
                "60-second turnaround",
                "Works in Telegram groups",
              ].map((t) => (
                <span key={t} className="inline-flex items-center gap-2">
                  <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#84cc16", display: "inline-block" }} />
                  {t}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8" style={{ borderColor: "#f0ede8", background: "#faf8f5" }}>
        <div className="landing-container">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            {/* Logo + tagline */}
            <div className="flex items-center gap-3 flex-wrap justify-center">
              <div className="flex items-center gap-2">
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center"
                  style={{ background: "#F97316" }}
                >
                  <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
                    <path d="M2.5 7L6 10.5L11.5 3.5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <span
                  className="text-[#1a1a1a] text-sm"
                  style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 700 }}
                >
                  ContextDrop
                </span>
              </div>
              <span className="text-sm" style={{ color: "#a8a29e", fontFamily: "'DM Sans', sans-serif" }}>
                — for people who feel behind on AI.
              </span>
            </div>

            {/* Links */}
            <div className="flex items-center gap-6 flex-wrap justify-center">
              <a href="#preview" className="text-sm hover:text-slate-700 transition-colors" style={{ color: "#78716c", fontFamily: "'DM Sans', sans-serif" }}>
                How it works
              </a>
              <a href="#pricing" className="text-sm hover:text-slate-700 transition-colors" style={{ color: "#78716c", fontFamily: "'DM Sans', sans-serif" }}>
                Pricing
              </a>
              <a href="https://t.me/contextdrop2027bot" target="_blank" rel="noopener noreferrer" className="text-sm hover:text-slate-700 transition-colors" style={{ color: "#78716c", fontFamily: "'DM Sans', sans-serif" }}>
                Telegram
              </a>
              <a href="/privacy" className="text-sm hover:text-slate-700 transition-colors" style={{ color: "#78716c", fontFamily: "'DM Sans', sans-serif" }}>
                Privacy
              </a>
              <a href="/terms" className="text-sm hover:text-slate-700 transition-colors" style={{ color: "#78716c", fontFamily: "'DM Sans', sans-serif" }}>
                Terms
              </a>
            </div>

            {/* Copyright */}
            <p className="text-sm" style={{ color: "#a8a29e", fontFamily: "'DM Sans', sans-serif" }}>
              © {new Date().getFullYear()} ContextDrop
            </p>
          </div>
        </div>
      </footer>
    </>
  );
}
