/*
 * VerdictSection — ContextDrop "Warm Signal"
 * Instagram Reel example: Claude agent managers
 * Animated: user sends link → typing → verdict slides in → action buttons appear
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
      <div className="container">
        <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-20">

          {/* Left: Chat mockup */}
          <div className="flex-shrink-0 w-full max-w-[360px] mx-auto lg:mx-0">
            <div
              ref={sectionRef}
              className="rounded-2xl overflow-hidden"
              style={{
                background: "#FAFAF8",
                border: "1px solid #ede9e3",
                boxShadow: "0 12px 48px rgba(0,0,0,0.09), 0 2px 8px rgba(0,0,0,0.04)",
              }}
            >
              {/* Chat header */}
              <div
                className="flex items-center gap-3 px-4 py-3 border-b"
                style={{ borderColor: "#ede9e3", background: "white" }}
              >
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
                  style={{ background: "#F97316" }}
                >
                  C
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-[#1a1a1a] font-semibold" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                    ContextDrop
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block" />
                    <span className="text-[10px] text-slate-400" style={{ fontFamily: "'DM Sans', sans-serif" }}>online</span>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-[9px] px-2 py-0.5 rounded-full font-bold tracking-wide" style={{ background: "#e8f4fd", color: "#0088cc" }}>TG</span>
                  <span className="text-[9px] px-2 py-0.5 rounded-full font-bold tracking-wide" style={{ background: "#e8fdf0", color: "#25D366" }}>WA</span>
                </div>
              </div>

              {/* Messages */}
              <div className="p-4 space-y-3" style={{ minHeight: 320 }}>

                {/* User sends Instagram link */}
                <div
                  className="flex justify-end transition-all duration-500"
                  style={{
                    opacity: show("link-sent") ? 1 : 0,
                    transform: show("link-sent") ? "translateY(0)" : "translateY(10px)",
                  }}
                >
                  <div
                    className="rounded-2xl rounded-br-sm px-3.5 py-2.5 max-w-[85%]"
                    style={{ background: "#F97316" }}
                  >
                    <p className="text-white text-xs break-all leading-relaxed" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                      https://instagram.com/reel/C8x4mK...
                    </p>
                    <p className="text-orange-200 text-[10px] text-right mt-0.5">10:42 ✓✓</p>
                  </div>
                </div>

                {/* Typing indicator */}
                {stage === "typing" && (
                  <div className="flex justify-start">
                    <div
                      className="rounded-2xl rounded-bl-sm px-4 py-3 flex items-center gap-1.5"
                      style={{ background: "#f3f4f6" }}
                    >
                      {[0, 150, 300].map((delay) => (
                        <span
                          key={delay}
                          className="w-1.5 h-1.5 rounded-full bg-slate-400 inline-block"
                          style={{ animation: `typingBounce 1s ${delay}ms infinite` }}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Verdict card */}
                <div
                  className="flex justify-start transition-all duration-700"
                  style={{
                    opacity: show("verdict") ? 1 : 0,
                    transform: show("verdict") ? "translateY(0)" : "translateY(14px)",
                  }}
                >
                  <div
                    className="rounded-2xl rounded-bl-sm p-4 w-full"
                    style={{
                      background: "white",
                      border: "1px solid #ede9e3",
                      boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
                    }}
                  >
                    {/* Source label */}
                    <div className="flex items-center gap-1.5 mb-2.5">
                      <span
                        className="text-[9px] font-bold px-2 py-0.5 rounded-full"
                        style={{ background: "#fce7f3", color: "#ec4899" }}
                      >
                        instagram reel
                      </span>
                    </div>

                    <p className="text-[#1a1a1a] text-sm font-bold mb-3 leading-snug" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                      How to set up Claude agent managers
                    </p>

                    <div className="space-y-2 mb-3.5">
                      <p className="text-slate-600 text-xs leading-relaxed" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                        🎯 <strong>What it is:</strong> Step-by-step walkthrough of Claude's new subagent delegation feature — one agent orchestrates others
                      </p>
                      <p className="text-slate-600 text-xs leading-relaxed" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                        🛠️ <strong>Tools shown:</strong> Claude 3.5, MCP servers, custom system prompts
                      </p>
                      <p className="text-slate-600 text-xs leading-relaxed" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                        ⚡ <strong>Why it matters:</strong> If you're building AI workflows, this is the delegation pattern that cuts your prompt complexity in half
                      </p>
                    </div>

                    {/* Action buttons */}
                    <div
                      className="flex gap-2 transition-all duration-500"
                      style={{
                        opacity: show("buttons") ? 1 : 0,
                        transform: show("buttons") ? "translateY(0)" : "translateY(6px)",
                      }}
                    >
                      <button className="verdict-btn-learn">📚 Learn</button>
                      <button className="verdict-btn-apply">🚀 Apply</button>
                      <button className="verdict-btn-skip">⏭ Skip</button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <p
              className="text-center text-slate-400 text-xs mt-3"
              style={{ fontFamily: "'JetBrains Mono', 'DM Mono', monospace" }}
            >
              // real analysis · real verdict
            </p>
          </div>

          {/* Right: Copy */}
          <div ref={headlineRef} className="fade-up flex-1 min-w-0">
            <span className="section-label block mb-3">Example Verdict</span>
            <h2
              className="text-3xl sm:text-4xl lg:text-5xl text-[#1a1a1a] mb-5"
              style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 800, letterSpacing: "-0.03em", lineHeight: 1.1 }}
            >
              Not a summary.
              <br />
              <span style={{ color: "#F97316" }}>A verdict.</span>
            </h2>
            <p
              className="text-slate-500 text-lg mb-8 leading-relaxed"
              style={{ fontFamily: "'DM Sans', sans-serif" }}
            >
              Send any link on <strong style={{ color: "#0088cc" }}>Telegram</strong> or <strong style={{ color: "#25D366" }}>WhatsApp</strong>. In 30 seconds you get a structured breakdown — what it is, what's inside, and exactly what to do with it. Then one tap decides its fate.
            </p>

            <div className="space-y-5">
              {[
                {
                  emoji: "📚",
                  label: "Learn",
                  color: "#f97316",
                  bg: "#fff5ee",
                  border: "#fde8d4",
                  desc: "Get a deeper breakdown — use cases, alternatives, and a reading list. Saved to your feed so you can come back when you're ready.",
                },
                {
                  emoji: "🚀",
                  label: "Apply",
                  color: "#16a34a",
                  bg: "#f0fdf4",
                  border: "#bbf7d0",
                  desc: "Get a step-by-step action plan built around your workflow. Concrete next steps, not generic advice.",
                },
                {
                  emoji: "⏭️",
                  label: "Skip",
                  color: "#78716c",
                  bg: "#faf8f5",
                  border: "#e7e2d9",
                  desc: "Not relevant right now? Dismiss it cleanly. ContextDrop notes the pattern and gets sharper over time.",
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
                    <span
                      className="text-sm font-semibold block mb-0.5"
                      style={{ fontFamily: "'DM Sans', sans-serif", color: item.color }}
                    >
                      {item.label}
                    </span>
                    <p
                      className="text-slate-500 text-sm leading-relaxed"
                      style={{ fontFamily: "'DM Sans', sans-serif" }}
                    >
                      {item.desc}
                    </p>
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
