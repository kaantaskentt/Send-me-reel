"use client";

import { useScrollAnimation } from "@/hooks/useScrollAnimation";

export default function PersonalizationSection() {
  const headlineRef = useScrollAnimation(0.2);
  const cardsRef = useScrollAnimation(0.15);

  return (
    <section className="py-24 lg:py-32" style={{ background: "white" }}>
      <div className="landing-container">
        <div ref={headlineRef} className="fade-up text-center mb-14">
          <span className="section-label block mb-3">Personalization</span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl text-[#1a1a1a] mb-4 font-[800] tracking-[-0.025em]">
            Same video.
            <br />
            <span className="text-[#F97316]">Different verdict.</span>
          </h2>
          <p className="text-slate-500 text-lg max-w-lg mx-auto leading-relaxed font-normal">
            A founder sees product integration opportunities. A student
            sees a study path. The AI knows the difference because you
            told it who you are.
          </p>
        </div>

        <div ref={cardsRef} className="stagger-children max-w-5xl mx-auto">
          <div className="flex justify-center mb-8">
            <div className="card-clean p-5 flex items-center gap-4 max-w-sm w-full">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0"
                style={{ background: "#fff5ee", border: "1px solid #fde8d4" }}
              >
                👤
              </div>
              <div>
                <p className="text-[#1a1a1a] text-sm font-bold">
                  Your context profile
                </p>
                <p className="text-slate-500 text-xs mt-0.5">
                  Role: Startup Founder · Focus: AI agents
                </p>
                <p className="text-slate-400 text-xs">
                  Flag: multi-agent systems, RAG pipelines
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 max-w-3xl mx-auto">
            <div className="card-clean p-5">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold bg-[#F97316]">
                  F
                </div>
                <span className="text-xs text-slate-400 font-medium">
                  Startup Founder
                </span>
              </div>
              <p className="text-[#1a1a1a] text-sm font-bold mb-2">
                MiroFish — Multi-agent AI
              </p>
              <p className="text-slate-500 text-xs leading-relaxed mb-3">
                🎯 <strong>For you:</strong> Integrate this into your
                product&apos;s orchestration layer. n8n handles the workflow,
                Claude handles reasoning.
              </p>
              <p className="text-xs font-semibold text-[#F97316]">
                → How to use this in your product
              </p>
            </div>

            <div className="card-clean p-5">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold bg-[#8B5CF6]">
                  S
                </div>
                <span className="text-xs text-slate-400 font-medium">
                  CS Student
                </span>
              </div>
              <p className="text-[#1a1a1a] text-sm font-bold mb-2">
                MiroFish — Multi-agent AI
              </p>
              <p className="text-slate-500 text-xs leading-relaxed mb-3">
                📚 <strong>For you:</strong> Start with LangChain docs, then
                study Bayesian belief networks. This is your intro to agentic
                AI.
              </p>
              <p className="text-xs font-semibold text-[#8B5CF6]">
                → What to study to understand this
              </p>
            </div>
          </div>

          <div className="text-center mt-8">
            <a
              href="/context"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors hover:bg-orange-100"
              style={{
                background: "#fff5ee",
                border: "1px solid #fde8d4",
                color: "#EA6C0A",
              }}
            >
              Set up your profile →
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
