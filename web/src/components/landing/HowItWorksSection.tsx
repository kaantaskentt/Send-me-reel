"use client";

import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import { BOT_LINK } from "@/lib/constants";

const STEPS = [
  {
    number: "1",
    emoji: "\ud83d\udcce",
    title: "Paste a link",
    body: "Instagram Reel, TikTok, X video, or any article. Paste it into the Telegram bot.",
  },
  {
    number: "2",
    emoji: "\ud83e\udde0",
    title: "We break it down",
    body: "Audio transcribed. Screen analyzed. Every tool, link, and concept extracted \u2014 in under 60 seconds.",
  },
  {
    number: "3",
    emoji: "\u26a1",
    title: "You decide",
    body: "A clear verdict: what\u2019s in it, why it matters to you, and what to do next. One tap \u2014 Learn, Apply, or Skip.",
  },
];

export default function HowItWorksSection() {
  const headlineRef = useScrollAnimation(0.2);
  const stepsRef = useScrollAnimation(0.15);

  return (
    <section
      id="how-it-works"
      className="py-24 lg:py-32"
      style={{ background: "white" }}
    >
      <div className="landing-container">
        <div ref={headlineRef} className="fade-up text-center mb-16">
          <span className="section-label block mb-3">How It Works</span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl text-[#1a1a1a] mb-4 font-[800] tracking-[-0.025em]">
            Three steps.{" "}
            <span className="text-[#F97316]">60 seconds.</span>
          </h2>
          <p className="text-slate-500 text-lg max-w-md mx-auto font-normal">
            Faster than scrolling to the next video.
          </p>
        </div>

        <div ref={stepsRef} className="stagger-children relative max-w-4xl mx-auto">
          <div
            className="hidden sm:block absolute top-10 left-[calc(16.67%+1rem)] right-[calc(16.67%+1rem)] h-px"
            style={{
              background:
                "linear-gradient(90deg, #F97316, #FDBA74, #F97316)",
              opacity: 0.3,
            }}
          />

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
            {STEPS.map((step) => (
              <div
                key={step.number}
                className="flex flex-col items-center text-center"
              >
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center text-white text-lg mb-5 relative z-10 font-[800]"
                  style={{
                    background: "#F97316",
                    boxShadow: "0 4px 16px rgba(249,115,22,0.3)",
                  }}
                >
                  {step.number}
                </div>
                <span className="text-3xl mb-3">{step.emoji}</span>
                <h3 className="text-[#1a1a1a] text-xl mb-2 font-bold">
                  {step.title}
                </h3>
                <p className="text-slate-500 text-sm leading-relaxed max-w-[220px] font-normal">
                  {step.body}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="text-center mt-14">
          <a
            href={BOT_LINK}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-primary inline-flex"
          >
            <svg
              width="17"
              height="17"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12l-6.871 4.326-2.962-.924c-.643-.204-.657-.643.136-.953l11.57-4.461c.537-.194 1.006.131.833.941z" />
            </svg>
            Try it now — it&apos;s free
          </a>
        </div>
      </div>
    </section>
  );
}
