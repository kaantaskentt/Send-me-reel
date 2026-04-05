"use client";

import { useScrollAnimation } from "@/hooks/useScrollAnimation";

const BOOKMARK_GRAVEYARD_URL =
  "https://d2xsxph8kpxj0f.cloudfront.net/310419663029819932/PLcAoykFsSXnZwd5KnAU3Y/bookmark_graveyard-UxchFs7sfyBW9XqdrSbAcx.webp";

const PROBLEMS = [
  {
    number: "01",
    title: "Save 10 videos. Review zero.",
    body: "Your saved folder is a graveyard of good intentions. You bookmark with conviction and never return.",
  },
  {
    number: "02",
    title: "Can\u2019t find the reel with that tool.",
    body: "You saw a video about some AI tool three weeks ago. You scroll for 20 minutes trying to find it. You give up.",
  },
  {
    number: "03",
    title: "\u201CI\u2019ll go back to it later.\u201D You won\u2019t.",
    body: "Later never comes. The insight that could have changed your workflow sits untouched. Bookmarking feels like progress. It isn\u2019t.",
  },
];

export default function ProblemSection() {
  const headlineRef = useScrollAnimation(0.2);
  const illustrationRef = useScrollAnimation(0.1);
  const cardsRef = useScrollAnimation(0.15);

  return (
    <section className="py-24 lg:py-32" style={{ background: "#FAFAF8" }}>
      <div className="landing-container">
        <div ref={headlineRef} className="fade-up text-center mb-12">
          <span className="section-label block mb-3">The Problem</span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl text-[#1a1a1a] mb-4 font-[800] tracking-[-0.025em]">
            Bookmarks are where content
            <br className="hidden sm:block" /> goes to die.
          </h2>
          <p className="text-slate-500 text-lg max-w-xl mx-auto leading-relaxed font-normal">
            You&apos;re not lazy. The problem isn&apos;t you — it&apos;s
            the gap between watching and doing. Every saved reel is a
            promise you&apos;ll break.
          </p>
        </div>

        <div ref={illustrationRef} className="fade-up max-w-3xl mx-auto mb-14">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={BOOKMARK_GRAVEYARD_URL}
            alt="Pile of faded bookmarks transforming into one clear verdict card"
            className="w-full rounded-2xl"
            style={{
              boxShadow: "0 4px 32px rgba(0,0,0,0.06)",
              border: "1px solid #f0ede8",
            }}
          />
        </div>

        <div
          ref={cardsRef}
          className="stagger-children grid grid-cols-1 sm:grid-cols-3 gap-5 max-w-4xl mx-auto"
        >
          {PROBLEMS.map((p) => (
            <div
              key={p.number}
              className="card-clean p-6 group hover:shadow-md transition-shadow duration-300"
            >
              <span className="text-xs tracking-widest text-orange-400 block mb-3 mono font-medium">
                {p.number}
              </span>
              <h3 className="text-[#1a1a1a] text-lg mb-2 leading-snug font-bold">
                {p.title}
              </h3>
              <p className="text-slate-500 text-sm leading-relaxed font-normal">
                {p.body}
              </p>
              <div className="mt-5 h-0.5 w-0 group-hover:w-full transition-all duration-500 rounded-full bg-[#F97316]" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
