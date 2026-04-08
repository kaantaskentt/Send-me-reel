/*
 * VerdictSection — ContextDrop "Warm Signal"
 * Warm cream background, real Telegram chat feel
 * Animated: user sends link → typing indicator → verdict slides in → buttons appear
 */

import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import { useEffect, useRef, useState } from "react";

type Stage = "idle" | "link-sent" | "typing" | "verdict" | "buttons";

export default function VerdictSection() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const headlineRef = useScrollAnimation(0.2) as React.RefObject<HTMLDivElement>;
  const [stage, setStage] = useState<Stage>("idle");
  const [started, setStarted] = useState(false);

  useEffect(() => {
    // Show full verdict immediately so it's visible on page load
    setStage("buttons");
  }, []);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting && !started) {
          setStarted(true);
          setStage("idle");
          setTimeout(() => setStage("link-sent"), 300);
          setTimeout(() => setStage("typing"), 1200);
          setTimeout(() => setStage("verdict"), 2700);
          setTimeout(() => setStage("buttons"), 3500);
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
        <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-16">
          {/* Left: Telegram chat mockup */}
          <div className="flex-shrink-0 w-full max-w-sm mx-auto lg:mx-0">
            <div
              ref={sectionRef}
              className="rounded-2xl overflow-hidden"
              style={{
                background: "#FAFAF8",
                border: "1px solid #f0ede8",
                boxShadow: "0 8px 40px rgba(0,0,0,0.08)",
              }}
            >
              {/* Chat header */}
              <div
                className="flex items-center gap-3 px-4 py-3 border-b"
                style={{ borderColor: "#f0ede8", background: "white" }}
              >
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold"
                  style={{ background: "#F97316" }}
                >
                  C
                </div>
                <div>
                  <div
                    className="text-sm text-[#1a1a1a]"
                    style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 600 }}
                  >
                    ContextDrop
                  </div>
                  <div className="text-xs text-slate-400" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                    bot
                  </div>
                </div>
              </div>

              {/* Chat messages */}
              <div className="p-4 space-y-3 min-h-[300px]">
                {/* User message */}
                <div
                  className="flex justify-end transition-all duration-500"
                  style={{
                    opacity: show("link-sent") ? 1 : 0,
                    transform: show("link-sent") ? "translateY(0)" : "translateY(10px)",
                  }}
                >
                  <div
                    className="rounded-2xl rounded-br-sm px-3.5 py-2.5 max-w-[80%]"
                    style={{ background: "#F97316" }}
                  >
                    <p className="text-white text-xs break-all" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                      https://tiktok.com/@mirofish/video/7391...
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
                      <span className="typing-dot w-1.5 h-1.5 rounded-full bg-slate-400 inline-block" />
                      <span className="typing-dot w-1.5 h-1.5 rounded-full bg-slate-400 inline-block" />
                      <span className="typing-dot w-1.5 h-1.5 rounded-full bg-slate-400 inline-block" />
                    </div>
                  </div>
                )}

                {/* Verdict card */}
                <div
                  className="flex justify-start transition-all duration-600"
                  style={{
                    opacity: show("verdict") ? 1 : 0,
                    transform: show("verdict") ? "translateY(0)" : "translateY(12px)",
                  }}
                >
                  <div
                    className="rounded-2xl rounded-bl-sm p-4 max-w-[92%]"
                    style={{
                      background: "white",
                      border: "1px solid #f0ede8",
                      boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
                    }}
                  >
                    <span
                      className="text-[10px] text-slate-400 block mb-2"
                      style={{ fontFamily: "'JetBrains Mono', monospace" }}
                    >
                      // tiktok reel
                    </span>
                    <p
                      className="text-[#1a1a1a] text-sm font-bold mb-2.5"
                      style={{ fontFamily: "'DM Sans', sans-serif" }}
                    >
                      MiroFish — Multi-agent AI
                    </p>
                    <div className="space-y-1.5 mb-3">
                      <p className="text-slate-600 text-xs" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                        🎯 <strong>What it is:</strong> Open-source framework for autonomous multi-agent systems
                      </p>
                      <p className="text-slate-600 text-xs" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                        🛠️ <strong>Tools:</strong> n8n, Claude, LangChain
                      </p>
                      <p className="text-slate-600 text-xs" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                        🔥 <strong>Why it matters:</strong> Enables complex workflows & automation
                      </p>
                    </div>
                    <div
                      className="flex gap-2 transition-all duration-500"
                      style={{
                        opacity: show("buttons") ? 1 : 0,
                        transform: show("buttons") ? "translateY(0)" : "translateY(6px)",
                      }}
                    >
                      <button className="verdict-btn-learn">Learn</button>
                      <button className="verdict-btn-apply">Apply</button>
                      <button className="verdict-btn-skip">Skip</button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <p
              className="text-center text-slate-400 text-xs mt-3"
              style={{ fontFamily: "'JetBrains Mono', monospace" }}
            >
              // real analysis · real verdict
            </p>
          </div>

          {/* Right: Copy */}
          <div ref={headlineRef} className="fade-up flex-1 min-w-0">
            <span className="section-label block mb-3">Example Verdict</span>
            <h2
              className="text-3xl sm:text-4xl lg:text-5xl text-[#1a1a1a] mb-5"
              style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 800, letterSpacing: "-0.025em" }}
            >
              Not a summary.
              <br />
              <span style={{ color: "#F97316" }}>A verdict.</span>
            </h2>
            <p
              className="text-slate-500 text-lg mb-8 leading-relaxed"
              style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 400 }}
            >
              Every analysis answers three questions: what is this, how do I use it, and why does it matter to me?
              Then you decide in one tap.
            </p>

            <div className="space-y-5">
              {[
                { emoji: "📚", label: "Learn", desc: "Get a deeper breakdown — use cases, alternatives, and how to get started." },
                { emoji: "✅", label: "Apply", desc: "Get a step-by-step action plan tailored to your workflow." },
                { emoji: "⏭️", label: "Skip", desc: "Not relevant? Dismiss it. ContextDrop learns your preferences over time." },
              ].map((item) => (
                <div key={item.label} className="flex items-start gap-4">
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center text-base flex-shrink-0 mt-0.5"
                    style={{ background: "#fff5ee", border: "1px solid #fde8d4" }}
                  >
                    {item.emoji}
                  </div>
                  <div>
                    <span
                      className="text-[#1a1a1a] text-sm font-semibold block"
                      style={{ fontFamily: "'DM Sans', sans-serif" }}
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
    </section>
  );
}
