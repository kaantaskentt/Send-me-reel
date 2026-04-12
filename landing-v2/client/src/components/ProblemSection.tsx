/*
 * ProblemSection — ContextDrop "Feel Seen First"
 * Design: Warm cream, dark text, staggered pain cards that feel like a mirror
 * Philosophy: Make the reader nod before they scroll. Pains first, product second.
 * Cards now have permanent left accent borders, richer shadows, stronger sub-copy
 */

import { useScrollAnimation } from "@/hooks/useScrollAnimation";

const PAIN_MOMENTS = [
  {
    time: "1:14 AM",
    icon: "🌙",
    quote: "You save a reel at 1am. By morning, you forgot what it was even about.",
    sub: "The save felt like progress. It wasn't.",
    accent: "#F97316",
  },
  {
    time: "3 weeks later",
    icon: "🔍",
    quote: "You watched a 90-second breakdown of an AI tool. It sounded perfect. You can't remember the name.",
    sub: "You scroll for 20 minutes trying to find it. You give up.",
    accent: "#ea580c",
  },
  {
    time: "Right now",
    icon: "📁",
    quote: "Your bookmarks folder has 300 items. You've reopened maybe 5.",
    sub: "Bookmarking feels like learning. It isn't.",
    accent: "#F97316",
  },
  {
    time: "Every week",
    icon: "⚡",
    quote: "Someone sends you a link. You say \"I'll watch this later.\" You mean it. You don't.",
    sub: "Later never comes. The insight sits there, untouched.",
    accent: "#ea580c",
  },
];

const WHO_ITS_FOR = [
  { icon: "🚀", label: "Founders", desc: "who learn from social but can't afford to lose ideas" },
  { icon: "⌨️", label: "Developers", desc: "who follow AI tools and need to act, not just watch" },
  { icon: "🎨", label: "Creators", desc: "who consume constantly but retain almost nothing" },
  { icon: "🧠", label: "Anyone", desc: "who learns from short-form content and loses it by Tuesday" },
];

export default function ProblemSection() {
  const headlineRef = useScrollAnimation(0.2) as React.RefObject<HTMLDivElement>;
  const painRef = useScrollAnimation(0.1) as React.RefObject<HTMLDivElement>;
  const whoRef = useScrollAnimation(0.15) as React.RefObject<HTMLDivElement>;

  return (
    <section className="py-24 lg:py-36" style={{ background: "#FAFAF8" }}>
      <div className="container max-w-5xl mx-auto px-4">

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
        <div ref={painRef} className="stagger-children grid grid-cols-1 sm:grid-cols-2 gap-5 mb-20">
          {PAIN_MOMENTS.map((p, i) => (
            <div
              key={i}
              className="group relative rounded-2xl p-6 sm:p-7 transition-all duration-300 hover:-translate-y-1"
              style={{
                background: "#fff",
                border: "1px solid #ede9e3",
                borderLeft: `3px solid ${p.accent}`,
                boxShadow: "0 4px 24px rgba(0,0,0,0.06), 0 1px 4px rgba(0,0,0,0.04)",
              }}
            >
              {/* Time stamp */}
              <div className="flex items-center gap-2 mb-4">
                <span className="text-lg">{p.icon}</span>
                <span
                  className="text-xs tracking-widest uppercase"
                  style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 600, color: p.accent }}
                >
                  {p.time}
                </span>
              </div>

              {/* Quote */}
              <p
                className="text-[#1a1a1a] text-[1.05rem] sm:text-[1.1rem] leading-snug mb-4"
                style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 700 }}
              >
                "{p.quote}"
              </p>

              {/* Sub — now more prominent */}
              <p
                className="text-[0.9rem] leading-relaxed"
                style={{
                  fontFamily: "'DM Sans', sans-serif",
                  fontWeight: 500,
                  color: "#78716c",
                  borderTop: "1px solid #f5f0eb",
                  paddingTop: "12px",
                  marginTop: "4px",
                }}
              >
                {p.sub}
              </p>
            </div>
          ))}
        </div>

        {/* ── Recognition payoff ── */}
        <div
          ref={whoRef}
          className="fade-up rounded-3xl px-6 py-10 sm:px-12 sm:py-12"
          style={{
            background: "linear-gradient(135deg, #fff4ec 0%, #fffaf7 60%, #fff 100%)",
            border: "1.5px solid #fbd5b5",
            boxShadow: "0 8px 40px rgba(249,115,22,0.07)",
          }}
        >
          <div className="text-center mb-8">
            <p
              className="text-[#1a1a1a] text-xl sm:text-2xl lg:text-3xl leading-snug mb-3"
              style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 800, letterSpacing: "-0.02em" }}
            >
              That's exactly why ContextDrop exists.
            </p>
            <p
              className="text-slate-500 text-base sm:text-lg max-w-lg mx-auto leading-relaxed"
              style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 400 }}
            >
              Send any link — reel, thread, video — and get back a sharp, honest take in 30 seconds. What it is, what matters, and what to do next.
            </p>
          </div>

          {/* Who it's for grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {WHO_ITS_FOR.map((w, i) => (
              <div
                key={i}
                className="rounded-xl px-4 py-4 text-left transition-all duration-200 hover:-translate-y-0.5"
                style={{
                  background: "#fff",
                  border: "1px solid #ede9e3",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
                }}
              >
                <div className="text-xl mb-2">{w.icon}</div>
                <div
                  className="text-sm text-[#1a1a1a] mb-1"
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
