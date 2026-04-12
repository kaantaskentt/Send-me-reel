/*
 * PersonalizationSection — ContextDrop "Warm Signal"
 * White background, profile card + two verdict cards side by side
 * "It learns who you are" — the emotional moat
 */

import { useScrollAnimation } from "@/hooks/useScrollAnimation";

export default function PersonalizationSection() {
  const headlineRef = useScrollAnimation(0.2) as React.RefObject<HTMLDivElement>;
  const cardsRef = useScrollAnimation(0.15) as React.RefObject<HTMLDivElement>;

  return (
    <section className="py-24 lg:py-32" style={{ background: "white" }}>
      <div className="container">
        {/* Headline */}
        <div ref={headlineRef} className="fade-up text-center mb-14">
          <span className="section-label block mb-3">Personalization</span>
          <h2
            className="text-3xl sm:text-4xl lg:text-5xl text-[#1a1a1a] mb-4"
            style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 800, letterSpacing: "-0.025em" }}
          >
            Context is everything.
            <br />
            <span style={{ color: "#F97316" }}>It learns who you are.</span>
          </h2>
          <p
            className="text-slate-500 text-lg max-w-lg mx-auto leading-relaxed"
            style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 400 }}
          >
            The same video. Two completely different verdicts. Because you're not the same person
            as the person next to you.
          </p>
        </div>

        {/* Cards */}
        <div ref={cardsRef} className="stagger-children max-w-5xl mx-auto">
          {/* Profile card */}
          <div className="flex justify-center mb-8">
            <div className="card-clean p-5 flex items-center gap-4 max-w-sm w-full">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0"
                style={{ background: "#fff5ee", border: "1px solid #fde8d4" }}
              >
                👤
              </div>
              <div>
                <p
                  className="text-[#1a1a1a] text-sm font-bold"
                  style={{ fontFamily: "'DM Sans', sans-serif" }}
                >
                  Your context profile
                </p>
                <p className="text-slate-500 text-xs mt-0.5" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                  Role: Startup Founder · Focus: AI agents
                </p>
                <p className="text-slate-400 text-xs" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                  Flag: multi-agent systems, RAG pipelines
                </p>
              </div>
            </div>
          </div>

          {/* Same video → two verdicts */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 max-w-3xl mx-auto">
            {/* Founder verdict */}
            <div className="card-clean p-5">
              <div className="flex items-center gap-2 mb-3">
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold"
                  style={{ background: "#F97316" }}
                >
                  F
                </div>
                <span className="text-xs text-slate-400 font-medium" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                  Startup Founder
                </span>
              </div>
              <p className="text-[#1a1a1a] text-sm font-bold mb-2" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                MiroFish — Multi-agent AI
              </p>
              <p className="text-slate-500 text-xs leading-relaxed mb-3" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                🎯 <strong>For you:</strong> Integrate this into your product's orchestration layer. n8n handles the workflow, Claude handles reasoning.
              </p>
              <p className="text-xs font-semibold" style={{ color: "#F97316", fontFamily: "'DM Sans', sans-serif" }}>
                → How to use this in your product
              </p>
            </div>

            {/* Student verdict */}
            <div className="card-clean p-5">
              <div className="flex items-center gap-2 mb-3">
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold"
                  style={{ background: "#8B5CF6" }}
                >
                  S
                </div>
                <span className="text-xs text-slate-400 font-medium" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                  CS Student
                </span>
              </div>
              <p className="text-[#1a1a1a] text-sm font-bold mb-2" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                MiroFish — Multi-agent AI
              </p>
              <p className="text-slate-500 text-xs leading-relaxed mb-3" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                📚 <strong>For you:</strong> Start with LangChain docs, then study Bayesian belief networks. This is your intro to agentic AI.
              </p>
              <p className="text-xs font-semibold" style={{ color: "#8B5CF6", fontFamily: "'DM Sans', sans-serif" }}>
                → What to study to understand this
              </p>
            </div>
          </div>

          {/* Coming soon teaser */}
          <div className="text-center mt-8">
            <div
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm"
              style={{
                background: "#fff5ee",
                border: "1px solid #fde8d4",
                fontFamily: "'DM Sans', sans-serif",
                color: "#EA6C0A",
                fontWeight: 500,
              }}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-pulse" />
              Auto-extract your context from Claude/ChatGPT — coming soon
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
