"use client";

/*
 * VerdictSection — ContextDrop
 * Chat mockup: user sends link → typing → verdict → action buttons (Tasks + Deep Dive)
 * Right side explains: verdict → tasks → deep dive flow. No Learn/Apply/Skip.
 */

import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import { useEffect, useRef, useState } from "react";

type Stage = "idle" | "link-sent" | "typing" | "verdict" | "buttons";

export default function VerdictSection() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const headlineRef = useScrollAnimation(0.2) as React.RefObject<HTMLDivElement>;
  const [stage, setStage] = useState<Stage>("buttons");
  const [started, setStarted] = useState(false);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting && !started) {
          setStarted(true);
          setStage("idle");
          setTimeout(() => setStage("link-sent"), 400);
          setTimeout(() => setStage("typing"), 1300);
          setTimeout(() => setStage("verdict"), 2900);
          setTimeout(() => setStage("buttons"), 3700);
        }
      },
      { threshold: 0.3 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [started]);

  const show = (s: Stage) => {
    const order: Stage[] = ["idle", "link-sent", "typing", "verdict", "buttons"];
    return order.indexOf(stage) >= order.indexOf(s);
  };

  return (
    <section className="py-24 lg:py-32" style={{ background: "white" }}>
      <div style={{ maxWidth: 960, margin: "0 auto", padding: "0 clamp(1rem, 4vw, 4rem)" }}>
        <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-16">

          {/* Left: Chat mockup */}
          <div className="flex-shrink-0 w-full max-w-[360px] mx-auto lg:mx-0">
            <div
              ref={sectionRef}
              className="rounded-2xl overflow-hidden"
              style={{ background: "#FAFAF8", border: "1px solid #ede9e3", boxShadow: "0 12px 48px rgba(0,0,0,0.09), 0 2px 8px rgba(0,0,0,0.04)" }}
            >
              {/* Chat header */}
              <div className="flex items-center gap-3 px-4 py-3 border-b" style={{ borderColor: "#ede9e3", background: "white" }}>
                <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0" style={{ background: "#F97316" }}>C</div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-[#1a1a1a] font-semibold" style={{ fontFamily: "'DM Sans', sans-serif" }}>ContextDrop</div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block" />
                    <span className="text-[10px] text-slate-400" style={{ fontFamily: "'DM Sans', sans-serif" }}>online</span>
                  </div>
                </div>
              </div>

              {/* Messages */}
              <div className="p-4 space-y-3" style={{ minHeight: 320 }}>
                {/* User sends link */}
                <div className="flex justify-end transition-all duration-500" style={{ opacity: show("link-sent") ? 1 : 0, transform: show("link-sent") ? "translateY(0)" : "translateY(10px)" }}>
                  <div className="rounded-2xl rounded-br-sm px-3.5 py-2.5 max-w-[85%]" style={{ background: "#F97316" }}>
                    <p className="text-white text-xs break-all leading-relaxed" style={{ fontFamily: "'DM Sans', sans-serif" }}>https://instagram.com/reel/C8x4mK...</p>
                    <p className="text-orange-200 text-[10px] text-right mt-0.5">10:42 ✓✓</p>
                  </div>
                </div>

                {/* Typing */}
                {stage === "typing" && (
                  <div className="flex justify-start">
                    <div className="rounded-2xl rounded-bl-sm px-4 py-3 flex items-center gap-1.5" style={{ background: "#f3f4f6" }}>
                      {[0, 150, 300].map((delay) => (
                        <span key={delay} className="w-1.5 h-1.5 rounded-full bg-slate-400 inline-block" style={{ animation: `typingBounce 1s ${delay}ms infinite` }} />
                      ))}
                    </div>
                  </div>
                )}

                {/* Verdict card */}
                <div className="flex justify-start transition-all duration-700" style={{ opacity: show("verdict") ? 1 : 0, transform: show("verdict") ? "translateY(0)" : "translateY(14px)" }}>
                  <div className="rounded-2xl rounded-bl-sm p-4 w-full" style={{ background: "white", border: "1px solid #ede9e3", boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
                    <div className="flex items-center gap-2 mb-2.5">
                      <span className="text-[9px] font-bold px-2 py-0.5 rounded-full" style={{ background: "#fce7f3", color: "#ec4899" }}>instagram reel</span>
                      <span className="text-[9px] font-bold px-2 py-0.5 rounded-full" style={{ background: "#f0fdf4", color: "#16a34a" }}>Worth your time</span>
                    </div>
                    <p className="text-[#1a1a1a] text-sm font-bold mb-2 leading-snug" style={{ fontFamily: "'DM Sans', sans-serif" }}>Claude agent managers — one agent runs the rest</p>
                    <p className="text-[#57534e] text-[11px] leading-relaxed mb-3 italic" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                      Solid. Orchestrator pattern cuts prompt complexity in half. The GitHub repo at 2:14 is the real takeaway.
                    </p>

                    {/* Action buttons — Tasks + Deep Dive */}
                    <div className="transition-all duration-500" style={{ opacity: show("buttons") ? 1 : 0, transform: show("buttons") ? "translateY(0)" : "translateY(6px)" }}>
                      <div className="flex gap-2 mb-2">
                        <span className="text-[9px] font-bold px-2.5 py-1 rounded" style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", color: "#16a34a" }}>✅ Add to tasks</span>
                        <span className="text-[9px] font-bold px-2.5 py-1 rounded" style={{ background: "#fff7ed", border: "1px solid #fed7aa", color: "#ea580c" }}>⚡ Deep Dive</span>
                      </div>
                      <div className="rounded" style={{ background: "#fafaf8", border: "1px solid #e7e2d9", borderLeft: "2px solid #f97316", padding: "4px 8px" }}>
                        <span className="text-[9px] text-[#1c1917]" style={{ fontFamily: "'DM Sans', sans-serif" }}>Fork the orchestrator repo this week</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <p className="text-center text-slate-400 text-xs mt-3" style={{ fontFamily: "'JetBrains Mono', monospace" }}>// real analysis · your next move</p>
          </div>

          {/* Right: Copy */}
          <div ref={headlineRef} className="fade-up flex-1 min-w-0">
            <span className="section-label block mb-3">How It Works</span>
            <h2
              className="text-3xl sm:text-4xl lg:text-5xl text-[#1a1a1a] mb-5"
              style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 800, letterSpacing: "-0.03em", lineHeight: 1.1 }}
            >
              Not a summary.
              <br />
              <span style={{ color: "#F97316" }}>A verdict.</span>
            </h2>
            <p className="text-slate-500 text-base sm:text-lg mb-8 leading-relaxed" style={{ fontFamily: "'DM Sans', sans-serif" }}>
              Send any link. In 30 seconds you get a sharp take — what it is, what&apos;s inside, and whether it&apos;s worth your time. Then turn the good parts into action.
            </p>

            <div className="space-y-5">
              {[
                {
                  emoji: "🧠",
                  label: "The Verdict",
                  color: "#f97316",
                  bg: "#fff7ed",
                  border: "#fed7aa",
                  desc: "A structured breakdown — what the content is, what tools or ideas are inside, and real-world context. No fluff, no filler. Your sharp friend watched it so you don't have to.",
                },
                {
                  emoji: "✅",
                  label: "Tasks",
                  color: "#16a34a",
                  bg: "#f0fdf4",
                  border: "#bbf7d0",
                  desc: "See something worth doing? Add it to your tasks with one tap. Every task stays linked to the content it came from — so you never forget why.",
                },
                {
                  emoji: "⚡",
                  label: "Deep Dive",
                  color: "#ea580c",
                  bg: "#fff7ed",
                  border: "#fed7aa",
                  desc: "Go deeper. Pull out every tool mentioned, get personalized insights based on your profile, and get a concrete next step — all from the same content.",
                },
              ].map((item) => (
                <div key={item.label} className="flex items-start gap-4">
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center text-base flex-shrink-0 mt-0.5"
                    style={{ background: item.bg, border: `1px solid ${item.border}` }}
                  >
                    {item.emoji}
                  </div>
                  <div>
                    <span className="text-sm font-semibold block mb-0.5" style={{ fontFamily: "'DM Sans', sans-serif", color: item.color }}>{item.label}</span>
                    <p className="text-slate-500 text-sm leading-relaxed" style={{ fontFamily: "'DM Sans', sans-serif" }}>{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>

      <style>{`
        @keyframes typingBounce {
          0%, 60%, 100% { transform: translateY(0); }
          30% { transform: translateY(-4px); }
        }
      `}</style>
    </section>
  );
}
