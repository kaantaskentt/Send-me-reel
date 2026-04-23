"use client";

/*
 * ProblemSection — ContextDrop "Feel Seen First"
 * Design: Warm cream, dark text, staggered pain cards that feel like a mirror
 * Philosophy: Make the reader nod before they scroll. Pains first, product second.
 */

import { useScrollAnimation } from "@/hooks/useScrollAnimation";

const PAIN_MOMENTS = [
  {
    time: "1:14 AM",
    icon: "🌙",
    quote: "You save a reel at 1am. By morning, you forgot what it was even about.",
    sub: "The save felt like progress. It wasn't.",
  },
  {
    time: "3 weeks later",
    icon: "🔍",
    quote: "You watched a 90-second breakdown of an AI tool. It sounded perfect. You can't remember the name.",
    sub: "You scroll for 20 minutes trying to find it. You give up.",
  },
  {
    time: "Right now",
    icon: "📁",
    quote: "Your bookmarks folder has 300 items. You've reopened maybe 5.",
    sub: "Bookmarking feels like learning. It isn't.",
  },
  {
    time: "Every week",
    icon: "⚡",
    quote: "Someone sends you a link. You say \"I'll watch this later.\" You mean it. You don't.",
    sub: "Later never comes. The insight sits there, untouched.",
  },
];

const WHO_ITS_FOR = [
  { label: "Founders", desc: "who learn from social but can't afford to lose ideas" },
  { label: "Developers", desc: "who follow AI tools and need to act, not just watch" },
  { label: "Creators", desc: "who consume constantly but retain almost nothing" },
  { label: "Anyone", desc: "who learns from short-form content and loses it by Tuesday" },
];

export default function ProblemSection() {
  const headlineRef = useScrollAnimation(0.2) as React.RefObject<HTMLDivElement>;
  const painRef = useScrollAnimation(0.1) as React.RefObject<HTMLDivElement>;
  const whoRef = useScrollAnimation(0.15) as React.RefObject<HTMLDivElement>;

  return (
    <section className="py-24 lg:py-36" style={{ background: "#FAFAF8" }}>
      <div className="landing-container max-w-5xl mx-auto">

        {/* ── Headline ── */}
        <div ref={headlineRef} className="fade-up text-center mb-16">
          <span
            className="inline-block text-xs tracking-[0.18em] uppercase text-orange-400 mb-4"
            style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 500 }}
          >
            Sound familiar?
          </span>
          <h2
            className="text-3xl sm:text-4xl lg:text-[2.75rem] text-[#1a1a1a] leading-tight mb-5"
            style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 800, letterSpacing: "-0.03em" }}
          >
            You're not lazy.
            <br />
            <span style={{ color: "#F97316" }}>You're just losing the signal.</span>
          </h2>
          <p
            className="text-slate-500 text-lg max-w-xl mx-auto leading-relaxed"
            style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 400 }}
          >
            Every one of these has happened to you. Probably this week.
          </p>
        </div>

        {/* ── Pain moment cards ── */}
        <div ref={painRef} className="stagger-children grid grid-cols-1 sm:grid-cols-2 gap-4 mb-20">
          {PAIN_MOMENTS.map((p, i) => (
            <div
              key={i}
              className="group relative rounded-2xl p-6 transition-all duration-300 hover:-translate-y-0.5"
              style={{
                background: "#fff",
                border: "1px solid #f0ede8",
                boxShadow: "0 2px 16px rgba(0,0,0,0.04)",
              }}
            >
              {/* Time stamp */}
              <div className="flex items-center gap-2 mb-4">
                <span className="text-xl">{p.icon}</span>
                <span
                  className="text-xs text-orange-400 tracking-widest"
                  style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 500 }}
                >
                  {p.time}
                </span>
              </div>

              {/* Quote */}
              <p
                className="text-[#1a1a1a] text-[1.05rem] leading-snug mb-3"
                style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 700 }}
              >
                "{p.quote}"
              </p>

              {/* Sub */}
              <p
                className="text-slate-400 text-sm leading-relaxed"
                style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 400 }}
              >
                {p.sub}
              </p>

              {/* Orange left accent line */}
              <div
                className="absolute left-0 top-6 bottom-6 w-0.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                style={{ background: "#F97316" }}
              />
            </div>
          ))}
        </div>

        {/* ── Recognition payoff ── */}
        <div
          ref={whoRef}
          className="fade-up rounded-3xl px-8 py-10 sm:px-12 sm:py-12 text-center"
          style={{
            background: "linear-gradient(135deg, #fff8f3 0%, #fff 100%)",
            border: "1.5px solid #fde8d8",
          }}
        >
          <p
            className="text-[#1a1a1a] text-xl sm:text-2xl leading-snug mb-2"
            style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 800 }}
          >
            That's exactly why ContextDrop exists.
          </p>
          <p
            className="text-slate-500 text-base mb-10 max-w-lg mx-auto"
            style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 400 }}
          >
            Not another bookmark tool. A verdict on every video — what it is, what's inside, and whether it's worth your time.
          </p>

          {/* Who it's for grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {WHO_ITS_FOR.map((w, i) => (
              <div
                key={i}
                className="rounded-xl px-4 py-3 text-left"
                style={{ background: "#fff", border: "1px solid #f0ede8" }}
              >
                <div
                  className="text-sm text-[#1a1a1a] mb-0.5"
                  style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 700 }}
                >
                  {w.label}
                </div>
                <div
                  className="text-xs text-slate-400 leading-snug"
                  style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 400 }}
                >
                  {w.desc}
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </section>
  );
}
