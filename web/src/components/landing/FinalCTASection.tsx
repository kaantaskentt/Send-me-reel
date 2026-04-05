"use client";

import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import { BOT_LINK } from "@/lib/constants";

export default function FinalCTASection() {
  const ctaRef = useScrollAnimation(0.2);

  return (
    <>
      <section className="py-24 lg:py-32" style={{ background: "#FAFAF8" }}>
        <div className="landing-container">
          <div ref={ctaRef} className="fade-up max-w-2xl mx-auto text-center">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-8"
              style={{
                background: "#F97316",
                boxShadow: "0 8px 32px rgba(249,115,22,0.3)",
              }}
            >
              <svg width="28" height="28" viewBox="0 0 24 24" fill="white">
                <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12l-6.871 4.326-2.962-.924c-.643-.204-.657-.643.136-.953l11.57-4.461c.537-.194 1.006.131.833.941z" />
              </svg>
            </div>

            <h2 className="text-3xl sm:text-4xl lg:text-5xl text-[#1a1a1a] mb-4 font-[800] tracking-[-0.025em]">
              Ready to actually use
              <br />
              what you watch?
            </h2>

            <p className="text-slate-500 text-lg mb-3 leading-relaxed font-normal">
              Your first 10 analyses are free. No credit card. No signup. Just
              send a link and see what happens.
            </p>

            <p className="text-orange-400 text-sm mb-10 mono">
              &quot;Send it. Understand it. Actually use it.&quot;
            </p>

            <a
              href={BOT_LINK}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary pulse-orange text-base !py-4 !px-8 inline-flex"
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12l-6.871 4.326-2.962-.924c-.643-.204-.657-.643.136-.953l11.57-4.461c.537-.194 1.006.131.833.941z" />
              </svg>
              Start free on Telegram
            </a>

            <div className="flex flex-wrap items-center justify-center gap-5 mt-8">
              {[
                { emoji: "✅", text: "10 free analyses" },
                { emoji: "🔒", text: "No account needed" },
                { emoji: "⚡", text: "60-second verdicts" },
                { emoji: "📱", text: "Works in groups" },
              ].map((t) => (
                <span
                  key={t.text}
                  className="flex items-center gap-1.5 text-slate-400 text-sm"
                >
                  <span>{t.emoji}</span>
                  {t.text}
                </span>
              ))}
            </div>

            <div className="mt-6">
              <a
                href="/context"
                className="text-slate-400 text-sm hover:text-slate-600 transition-colors animated-link"
              >
                Already using ContextDrop? Edit your profile →
              </a>
            </div>
          </div>
        </div>
      </section>

      <footer
        className="border-t py-10"
        style={{ borderColor: "#f0ede8", background: "white" }}
      >
        <div className="landing-container">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg flex items-center justify-center bg-[#F97316]">
                <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
                  <path
                    d="M2.5 7L6 10.5L11.5 3.5"
                    stroke="white"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <span className="text-[#1a1a1a] text-sm font-bold">
                ContextDrop
              </span>
            </div>

            <div className="flex items-center gap-6">
              <a
                href="#how-it-works"
                className="text-slate-400 text-sm hover:text-slate-600 transition-colors"
              >
                How it works
              </a>
              <a
                href={BOT_LINK}
                target="_blank"
                rel="noopener noreferrer"
                className="text-slate-400 text-sm hover:text-slate-600 transition-colors"
              >
                Telegram
              </a>
            </div>

            <p className="text-slate-400 text-xs">
              © {new Date().getFullYear()} ContextDrop
            </p>
          </div>
        </div>
      </footer>
    </>
  );
}
