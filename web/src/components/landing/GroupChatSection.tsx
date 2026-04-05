"use client";

import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import { BOT_LINK } from "@/lib/constants";

const FEATURES = [
  {
    emoji: "💬",
    title: "Threaded replies",
    desc: "The bot replies directly to the message with the link, keeping context clean in busy groups.",
  },
  {
    emoji: "👁️",
    title: "Shared context",
    desc: "Everyone in the group sees the verdict. One link, one analysis, zero duplication.",
  },
  {
    emoji: "🔒",
    title: "Private choices",
    desc: "Learn, Apply, or Skip are sent privately. Your decisions stay yours.",
  },
];

export default function GroupChatSection() {
  const headlineRef = useScrollAnimation(0.2);
  const contentRef = useScrollAnimation(0.15);

  return (
    <section className="py-24 lg:py-32" style={{ background: "#FAFAF8" }}>
      <div className="landing-container">
        <div ref={headlineRef} className="fade-up text-center mb-14">
          <span className="section-label block mb-3">Group Chats</span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl text-[#1a1a1a] mb-4 font-[800] tracking-[-0.025em]">
            Your whole group,
            <br />
            <span className="text-[#F97316]">on the same page.</span>
          </h2>
          <p className="text-slate-500 text-lg max-w-md mx-auto font-normal">
            Add ContextDrop to any Telegram group. When someone drops a link,
            everyone gets the verdict.
          </p>
        </div>

        <div
          ref={contentRef}
          className="fade-up flex flex-col lg:flex-row items-center gap-12 lg:gap-16 max-w-5xl mx-auto"
        >
          <div className="flex-shrink-0 w-full max-w-sm mx-auto lg:mx-0">
            <div
              className="rounded-2xl overflow-hidden"
              style={{
                background: "white",
                border: "1px solid #f0ede8",
                boxShadow: "0 8px 40px rgba(0,0,0,0.08)",
              }}
            >
              <div className="flex items-center gap-3 px-4 py-3 border-b border-[#f0ede8] bg-[#fafaf8]">
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center text-lg"
                  style={{
                    background: "linear-gradient(135deg, #F97316, #fb923c)",
                  }}
                >
                  🚀
                </div>
                <div>
                  <div className="text-sm text-[#1a1a1a] font-semibold">
                    AI Founders Club
                  </div>
                  <div className="text-xs text-slate-400">12 members</div>
                </div>
              </div>

              <div className="p-4 space-y-3">
                <div className="flex items-start gap-2">
                  <div className="w-7 h-7 rounded-full bg-purple-400 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                    A
                  </div>
                  <div>
                    <span className="text-xs text-purple-500 font-semibold block mb-1">
                      Alex
                    </span>
                    <div
                      className="rounded-2xl rounded-tl-sm px-3 py-2"
                      style={{
                        background: "#f9f5f0",
                        border: "1px solid #f0ede8",
                      }}
                    >
                      <p className="text-xs text-blue-500 underline break-all">
                        https://instagram.com/reel/C9x...
                      </p>
                      <p className="text-slate-400 text-[10px] mt-0.5">
                        10:31
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-2">
                  <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 bg-[#F97316]">
                    C
                  </div>
                  <div>
                    <span className="text-xs font-semibold block mb-1 text-[#F97316]">
                      ContextDrop
                    </span>
                    <div
                      className="rounded-2xl rounded-tl-sm p-3"
                      style={{
                        background: "white",
                        border: "1px solid #f0ede8",
                        boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
                      }}
                    >
                      <p className="text-[#1a1a1a] text-xs font-bold mb-1.5">
                        Runway ML — AI Video Generation
                      </p>
                      <p className="text-slate-500 text-xs mb-1">
                        🎯 Text-to-video AI, Gen-3 Alpha model
                      </p>
                      <p className="text-slate-500 text-xs mb-2">
                        🛠️ Tools: Runway, Sora, Pika
                      </p>
                      <div className="flex gap-1.5">
                        <span className="text-[10px] px-2 py-0.5 rounded-full text-white font-semibold bg-[#F97316]">
                          Learn
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full text-white font-semibold bg-[#10B981]">
                          Apply
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full text-slate-500 font-semibold bg-[#f3f4f6]">
                          Skip
                        </span>
                      </div>
                      <p className="text-slate-400 text-[10px] mt-1.5">
                        10:31
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-2">
                  <div className="w-7 h-7 rounded-full bg-blue-400 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                    M
                  </div>
                  <div>
                    <span className="text-xs text-blue-500 font-semibold block mb-1">
                      Maya
                    </span>
                    <div
                      className="rounded-2xl rounded-tl-sm px-3 py-2"
                      style={{
                        background: "#f9f5f0",
                        border: "1px solid #f0ede8",
                      }}
                    >
                      <p className="text-slate-700 text-xs">
                        we need this in every group 🔥
                      </p>
                      <p className="text-slate-400 text-[10px] mt-0.5">
                        10:32
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex-1 min-w-0 space-y-6">
            {FEATURES.map((f) => (
              <div key={f.title} className="flex items-start gap-4">
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
                  style={{
                    background: "#fff5ee",
                    border: "1px solid #fde8d4",
                  }}
                >
                  {f.emoji}
                </div>
                <div>
                  <h3 className="text-[#1a1a1a] text-lg mb-1 font-bold">
                    {f.title}
                  </h3>
                  <p className="text-slate-500 text-sm leading-relaxed font-normal">
                    {f.desc}
                  </p>
                </div>
              </div>
            ))}

            <div className="pt-2">
              <a
                href={BOT_LINK}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-ghost inline-flex"
              >
                Add to your group →
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
