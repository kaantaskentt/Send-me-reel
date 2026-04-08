/*
 * ProblemSection — ContextDrop "Warm Signal"
 * Warm cream background, bookmark graveyard illustration, 3 pain point cards
 */

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
    title: "Can't find the reel with that tool.",
    body: "You saw a video about some AI tool three weeks ago. You scroll for 20 minutes trying to find it. You give up.",
  },
  {
    number: "03",
    title: '"I\'ll go back to it later." You won\'t.',
    body: "Later never comes. The insight that could have changed your workflow sits untouched. Bookmarking feels like progress. It isn't.",
  },
];

export default function ProblemSection() {
  const headlineRef = useScrollAnimation(0.2) as React.RefObject<HTMLDivElement>;
  const illustrationRef = useScrollAnimation(0.1) as React.RefObject<HTMLDivElement>;
  const cardsRef = useScrollAnimation(0.15) as React.RefObject<HTMLDivElement>;

  return (
    <section className="py-24 lg:py-32" style={{ background: "#FAFAF8" }}>
      <div className="container">
        {/* Headline */}
        <div ref={headlineRef} className="fade-up text-center mb-12">
          <span className="section-label block mb-3">The Problem</span>
          <h2
            className="text-3xl sm:text-4xl lg:text-5xl text-[#1a1a1a] mb-4"
            style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 800, letterSpacing: "-0.025em" }}
          >
            Bookmarks are where content
            <br className="hidden sm:block" /> goes to die.
          </h2>
          <p
            className="text-slate-500 text-lg max-w-xl mx-auto leading-relaxed"
            style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 400 }}
          >
            You're not lazy. You're overwhelmed. The feed is relentless, the content is dense,
            and the gap between "saving" and "understanding" has never been wider.
          </p>
        </div>

        {/* Illustration */}
        <div ref={illustrationRef} className="fade-up max-w-3xl mx-auto mb-14">
          <img
            src={BOOKMARK_GRAVEYARD_URL}
            alt="Pile of faded bookmarks transforming into one clear, organized verdict card"
            className="w-full rounded-2xl"
            style={{ boxShadow: "0 4px 32px rgba(0,0,0,0.06)", border: "1px solid #f0ede8" }}
          />
        </div>

        {/* Pain point cards */}
        <div
          ref={cardsRef}
          className="stagger-children grid grid-cols-1 sm:grid-cols-3 gap-5 max-w-4xl mx-auto"
        >
          {PROBLEMS.map((p) => (
            <div key={p.number} className="card-clean p-6 group hover:shadow-md transition-shadow duration-300">
              <span
                className="text-xs tracking-widest text-orange-400 block mb-3"
                style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 500 }}
              >
                {p.number}
              </span>
              <h3
                className="text-[#1a1a1a] text-lg mb-2 leading-snug"
                style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 700 }}
              >
                {p.title}
              </h3>
              <p
                className="text-slate-500 text-sm leading-relaxed"
                style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 400 }}
              >
                {p.body}
              </p>
              {/* Orange bottom accent on hover */}
              <div
                className="mt-5 h-0.5 w-0 group-hover:w-full transition-all duration-500 rounded-full"
                style={{ background: "#F97316" }}
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
