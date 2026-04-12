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
        <div className="container" style={{ position: "relative", zIndex: 1 }}>
          <div ref={ctaRef} className="fade-up max-w-2xl mx-auto text-center">
            {/* Telegram icon */}
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-8"
              style={{ background: "#F97316", boxShadow: "0 8px 32px rgba(249,115,22,0.3)" }}
            >
              <svg width="28" height="28" viewBox="0 0 24 24" fill="white">
                <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12l-6.871 4.326-2.962-.924c-.643-.204-.657-.643.136-.953l11.57-4.461c.537-.194 1.006.131.833.941z"/>
              </svg>
            </div>

            <h2
              className="text-3xl sm:text-4xl lg:text-5xl text-[#1a1a1a] mb-4"
              style={{ fontFamily: "'Plus Jakarta Sans', 'DM Sans', sans-serif", fontWeight: 800, letterSpacing: "-0.04em" }}
            >
              Stop saving content.
              <br /><span style={{ color: "#F97316" }}>Start acting on it.</span>
            </h2>

            <p
              className="text-slate-500 text-lg mb-3 leading-relaxed"
              style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 400 }}
            >
              Your first 10 analyses are free. No credit card. No signup.
              Just send a link and see what happens.
            </p>

            <p
              className="text-orange-400 text-sm mb-10"
              style={{ fontFamily: "'JetBrains Mono', monospace" }}
            >
              // send link → get summary → add to tasks → actually do it
            </p>

            {/* CTA button */}
            <a
              href="https://t.me/contextdrop2027bot"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary pulse-orange text-base !py-4 !px-8 inline-flex"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12l-6.871 4.326-2.962-.924c-.643-.204-.657-.643.136-.953l11.57-4.461c.537-.194 1.006.131.833.941z"/>
              </svg>
              Start free on Telegram
            </a>

            {/* Trust signals */}
            <div className="flex flex-wrap items-center justify-center gap-5 mt-8">
              {[
                { emoji: "✅", text: "10 free analyses" },
                { emoji: "🔒", text: "No account needed" },
                { emoji: "⚡", text: "30-second summaries" },
                { emoji: "📱", text: "Works in groups" },
              ].map((t) => (
                <span
                  key={t.text}
                  className="flex items-center gap-1.5 text-slate-400 text-sm"
                  style={{ fontFamily: "'DM Sans', sans-serif" }}
                >
                  <span>{t.emoji}</span>
                  {t.text}
                </span>
              ))}
            </div>

            {/* Secondary link */}
            <div className="mt-6">
              <a
                href="/dashboard"
                className="text-slate-400 text-sm hover:text-slate-600 transition-colors animated-link"
                style={{ fontFamily: "'DM Sans', sans-serif" }}
              >
                Already using ContextDrop? Open your dashboard →
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-10" style={{ borderColor: "#f0ede8", background: "white" }}>
        <div className="container">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            {/* Logo */}
            <div className="flex items-center gap-2">
              <div
                className="w-6 h-6 rounded-lg flex items-center justify-center"
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

            {/* Links */}
            <div className="flex items-center gap-6">
              <a
                href="#preview"
                className="text-slate-400 text-sm hover:text-slate-600 transition-colors"
                style={{ fontFamily: "'DM Sans', sans-serif" }}
              >
                How it works
              </a>
              <a
                href="https://t.me/contextdrop2027bot"
                target="_blank"
                rel="noopener noreferrer"
                className="text-slate-400 text-sm hover:text-slate-600 transition-colors"
                style={{ fontFamily: "'DM Sans', sans-serif" }}
              >
                Telegram
              </a>
              <a
                href="/privacy"
                className="text-slate-400 text-sm hover:text-slate-600 transition-colors"
                style={{ fontFamily: "'DM Sans', sans-serif" }}
              >
                Privacy
              </a>
              <a
                href="/terms"
                className="text-slate-400 text-sm hover:text-slate-600 transition-colors"
                style={{ fontFamily: "'DM Sans', sans-serif" }}
              >
                Terms
              </a>
            </div>

            {/* Copyright */}
            <p className="text-slate-400 text-xs" style={{ fontFamily: "'DM Sans', sans-serif" }}>
              © {new Date().getFullYear()} ContextDrop
            </p>
          </div>
        </div>
      </footer>
    </>
  );
}
