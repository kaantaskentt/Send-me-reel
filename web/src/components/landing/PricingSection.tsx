"use client";

import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import { BOT_LINK } from "@/lib/constants";

const FREE_FEATURES = [
  "10 analyses per month",
  "Full video + audio + visual analysis",
  "Personalized verdicts",
  "Works in group chats",
  "No credit card required",
];

const PRO_FEATURES = [
  "150 analyses per month",
  "Everything in Free",
  "Priority processing",
  "Extended context profiles",
  "Early access to new features",
];

export default function PricingSection() {
  const headlineRef = useScrollAnimation(0.2);
  const cardsRef = useScrollAnimation(0.15);

  return (
    <section id="pricing" className="py-24 lg:py-32" style={{ background: "white" }}>
      <div className="landing-container">
        <div ref={headlineRef} className="fade-up text-center mb-14">
          <span className="section-label block mb-3">Pricing</span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl text-[#1a1a1a] mb-4 font-[800] tracking-[-0.025em]">
            Start free.
            <br />
            <span className="text-[#F97316]">Upgrade when you&apos;re hooked.</span>
          </h2>
          <p className="text-slate-500 text-lg max-w-md mx-auto font-normal leading-relaxed">
            No trials. No tricks. Use it, love it, then decide.
          </p>
        </div>

        <div
          ref={cardsRef}
          className="stagger-children max-w-3xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6"
        >
          {/* Free Tier */}
          <div
            className="rounded-2xl p-8 flex flex-col"
            style={{
              background: "#FAFAF8",
              border: "1px solid #f0ede8",
            }}
          >
            <div className="mb-6">
              <span className="text-sm font-semibold text-slate-400 uppercase tracking-wider">
                Free
              </span>
              <div className="mt-3 flex items-baseline gap-1">
                <span className="text-4xl font-[800] text-[#1a1a1a]">$0</span>
                <span className="text-slate-400 text-sm">/month</span>
              </div>
              <p className="text-slate-500 text-sm mt-2">
                For the curious. Just send a link.
              </p>
            </div>

            <ul className="space-y-3 mb-8 flex-1">
              {FREE_FEATURES.map((f) => (
                <li key={f} className="flex items-start gap-2.5">
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 18 18"
                    fill="none"
                    className="flex-shrink-0 mt-0.5"
                  >
                    <path
                      d="M4.5 9L7.5 12L13.5 6"
                      stroke="#10B981"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  <span className="text-slate-600 text-sm">{f}</span>
                </li>
              ))}
            </ul>

            <a
              href={BOT_LINK}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-ghost text-center w-full justify-center"
            >
              Start free on Telegram
            </a>
          </div>

          {/* Pro Tier */}
          <div
            className="rounded-2xl p-8 flex flex-col relative overflow-hidden"
            style={{
              background: "white",
              border: "2px solid #F97316",
              boxShadow: "0 8px 40px rgba(249,115,22,0.12)",
            }}
          >
            <div
              className="absolute top-4 right-4 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full text-white"
              style={{ background: "#F97316" }}
            >
              Popular
            </div>

            <div className="mb-6">
              <span className="text-sm font-semibold text-[#F97316] uppercase tracking-wider">
                Pro
              </span>
              <div className="mt-3 flex items-baseline gap-1">
                <span className="text-4xl font-[800] text-[#1a1a1a]">$5</span>
                <span className="text-slate-400 text-sm">/month</span>
              </div>
              <p className="text-slate-500 text-sm mt-2">
                For power users. ~5 analyses a day.
              </p>
            </div>

            <ul className="space-y-3 mb-8 flex-1">
              {PRO_FEATURES.map((f) => (
                <li key={f} className="flex items-start gap-2.5">
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 18 18"
                    fill="none"
                    className="flex-shrink-0 mt-0.5"
                  >
                    <path
                      d="M4.5 9L7.5 12L13.5 6"
                      stroke="#F97316"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  <span className="text-slate-600 text-sm">{f}</span>
                </li>
              ))}
            </ul>

            <a
              href={BOT_LINK}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary text-center w-full justify-center"
            >
              Get Pro
            </a>

            <p className="text-center text-slate-400 text-xs mt-3">
              That&apos;s $0.03 per analysis. Less than a gumball.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
