"use client";

/**
 * DashboardPreviewSection — Animated product demo (from Manus)
 * Telegram LEFT | Dashboard RIGHT with blur-focus animation
 */

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence, useInView } from "framer-motion";
import { IconSignal, IconBrain, IconLightning, IconCheck, IconDashboard, IconEye } from "./Icons";

const MR_CONTEXT_LOGO =
  "https://d2xsxph8kpxj0f.cloudfront.net/310419663029819932/PLcAoykFsSXnZwd5KnAU3Y/mr-context-logo-PGbrznR2gppkFjPKsZGnX6.webp";

function BotButtons() {
  return (
    <>
      <div className="flex items-center gap-1 px-2 py-0.5 rounded-md" style={{ background: "#2b3a4a", color: "#8ba4b8", fontSize: 9 }}>
        <IconEye size={8} color="#8ba4b8" /> View
      </div>
      <div className="flex items-center gap-1 px-2 py-0.5 rounded-md" style={{ background: "#2b3a4a", color: "#8ba4b8", fontSize: 9 }}>
        <IconDashboard size={8} color="#8ba4b8" /> Dashboard
      </div>
    </>
  );
}

function InstagramIcon() {
  return (
    <div className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0"
      style={{ background: "linear-gradient(135deg,#f09433,#e6683c,#dc2743,#cc2366,#bc1888)" }}>
      <svg width="12" height="12" viewBox="0 0 24 24" fill="white">
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
      </svg>
    </div>
  );
}

function XIcon() {
  return (
    <div className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0" style={{ background: "#000" }}>
      <svg width="11" height="11" viewBox="0 0 24 24" fill="white">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.73-8.835L1.254 2.25H8.08l4.253 5.622 5.911-5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
      </svg>
    </div>
  );
}

// — Telegram Panel —
function TelegramPanel({ step }: { step: number }) {
  return (
    <div className="flex flex-col h-full" style={{ background: "#17212b" }}>
      <div className="flex items-center justify-between px-3 py-2.5 flex-shrink-0" style={{ background: "#232e3c", borderBottom: "1px solid #1a2533" }}>
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-full overflow-hidden flex-shrink-0" style={{ border: "2px solid #F97316" }}>
            <img src={MR_CONTEXT_LOGO} alt="Mr Context" className="w-full h-full object-cover" />
          </div>
          <div>
            <div className="font-semibold" style={{ fontSize: 13, color: "white" }}>Mr Context</div>
            <div style={{ fontSize: 10, color: "#6c8ea4" }}>bot</div>
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col justify-end gap-2 px-3 py-3 overflow-hidden">
        {/* Older card */}
        <div className="flex items-end gap-2">
          <div className="w-5 h-5 rounded-full overflow-hidden flex-shrink-0">
            <img src={MR_CONTEXT_LOGO} alt="" className="w-full h-full object-cover" />
          </div>
          <div className="rounded-2xl rounded-bl-sm px-3 py-2.5" style={{ background: "#232e3c", maxWidth: "88%" }}>
            <div style={{ fontSize: 10.5, color: "#F97316", fontWeight: 700, marginBottom: 3 }}>
              <span className="inline-flex items-center gap-1"><IconSignal size={11} color="#F97316" /> Claude &quot;7 Days of Work in 1 Hour&quot;</span>
            </div>
            <div style={{ fontSize: 10, color: "#8ba4b8", lineHeight: 1.5 }}>
              <span className="inline-flex items-center gap-1"><IconBrain size={10} color="#8ba4b8" /> Generic productivity hype. Zero specifics.</span>
            </div>
            <div style={{ fontSize: 10, color: "#8ba4b8", lineHeight: 1.5 }}>
              <span className="inline-flex items-center gap-1"><IconLightning size={10} color="#8ba4b8" /> Skip it.</span>
            </div>
            <div style={{ fontSize: 9, color: "#4a6070", marginTop: 4 }}>9:28 PM</div>
            <div className="flex gap-1.5 mt-2"><BotButtons /></div>
          </div>
        </div>

        {/* User sends link */}
        <AnimatePresence>
          {step >= 1 && (
            <motion.div key="user-link" initial={{ opacity: 0, y: 8, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.25 }} className="flex justify-end">
              <div className="px-3 py-2 rounded-2xl rounded-br-sm" style={{ background: "#2b5278", maxWidth: "82%" }}>
                <div style={{ fontSize: 10, color: "#a8c8e8", wordBreak: "break-all", lineHeight: 1.4 }}>instagram.com/reel/C8x4mKjL...</div>
                <div style={{ fontSize: 9, color: "#4a6070", textAlign: "right", marginTop: 2 }}>10:51 PM ✓✓</div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* On it */}
        <AnimatePresence>
          {step >= 2 && (
            <motion.div key="on-it" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }} className="flex justify-center">
              <div style={{ fontSize: 9.5, color: "#4a6070" }}>On it — about 30 seconds. <span style={{ color: "#6c8ea4" }}>10:51 PM</span></div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Typing */}
        <AnimatePresence>
          {step === 2 && (
            <motion.div key="typing" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} className="flex items-end gap-2">
              <div className="w-5 h-5 rounded-full overflow-hidden flex-shrink-0"><img src={MR_CONTEXT_LOGO} alt="" className="w-full h-full object-cover" /></div>
              <div className="px-3 py-2.5 rounded-2xl rounded-bl-sm" style={{ background: "#232e3c" }}>
                <div className="flex gap-1 items-center" style={{ height: 14 }}>
                  {[0, 0.18, 0.36].map(d => (
                    <motion.div key={d} className="w-1.5 h-1.5 rounded-full" style={{ background: "#6c8ea4" }}
                      animate={{ y: [0, -4, 0] }} transition={{ duration: 0.55, repeat: Infinity, delay: d }} />
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Bot card */}
        <AnimatePresence>
          {step >= 3 && (
            <motion.div key="bot-card" initial={{ opacity: 0, y: 10, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }} className="flex items-end gap-2">
              <div className="w-5 h-5 rounded-full overflow-hidden flex-shrink-0"><img src={MR_CONTEXT_LOGO} alt="" className="w-full h-full object-cover" /></div>
              <div className="rounded-2xl rounded-bl-sm px-3 py-2.5" style={{ background: "#232e3c", maxWidth: "88%" }}>
                <div style={{ fontSize: 10.5, color: "#F97316", fontWeight: 700, marginBottom: 4 }}>
                  <span className="inline-flex items-center gap-1"><IconSignal size={11} color="#F97316" /> Claude Code: sub-agents that ship</span>
                </div>
                {step >= 4 ? (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
                    <div style={{ fontSize: 10, color: "#8ba4b8", lineHeight: 1.55, marginBottom: 2 }}>
                      <span className="inline-flex items-center gap-1"><IconBrain size={10} color="#8ba4b8" /> Solid. CLAUDE.md at 14:30 is the only part worth rewinding.</span>
                    </div>
                    <div style={{ fontSize: 10, color: "#e8f0f7", lineHeight: 1.55 }}>
                      <span className="inline-flex items-center gap-1"><IconLightning size={10} color="#e8f0f7" /> This is your stack — try it on the next build.</span>
                    </div>
                    <div style={{ fontSize: 9, color: "#4a6070", marginTop: 4 }}>10:51 PM</div>
                    <div className="flex gap-1.5 mt-2"><BotButtons /></div>
                  </motion.div>
                ) : (
                  <div className="space-y-1.5">
                    {[78, 92, 55].map((w, i) => (
                      <motion.div key={i} animate={{ opacity: [0.3, 0.6, 0.3] }} transition={{ duration: 1, repeat: Infinity, delay: i * 0.12 }}
                        className="h-2 rounded" style={{ background: "#2b3a4a", width: `${w}%` }} />
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Task confirmed */}
        <AnimatePresence>
          {step >= 6 && (
            <motion.div key="confirm" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }} className="flex items-end gap-2">
              <div className="w-5 h-5 rounded-full overflow-hidden flex-shrink-0"><img src={MR_CONTEXT_LOGO} alt="" className="w-full h-full object-cover" /></div>
              <div className="px-3 py-2 rounded-2xl rounded-bl-sm" style={{ background: "#232e3c", fontSize: 10.5, color: "#e8f0f7" }}>
                <span className="inline-flex items-center gap-1.5"><IconCheck size={11} color="#4ade80" /> Added to your tasks.</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Input bar */}
      <div className="px-3 pb-3 pt-1 flex-shrink-0">
        <div className="flex items-center gap-2 px-3 py-2 rounded-full" style={{ background: "#232e3c" }}>
          <span className="flex-1 text-xs truncate" style={{ color: "#3d5263" }}>Write a message...</span>
          <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: step === 1 ? "#F97316" : "#2b3a4a" }}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill={step === 1 ? "white" : "#4a6070"}><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
          </div>
        </div>
      </div>
    </div>
  );
}

// — Dashboard Feed —
function DashboardFeed({ step, taskCount, newCardVisible, newCardTaskAdded }: { step: number; taskCount: number; newCardVisible: boolean; newCardTaskAdded: boolean }) {
  return (
    <div className="flex h-full" style={{ background: "white" }}>
      {/* Sidebar — desktop only */}
      <div className="hidden lg:flex flex-col flex-shrink-0" style={{ width: 160, background: "#faf8f5", borderRight: "1px solid #f0ece6", padding: "12px 0" }}>
        <div className="flex items-center gap-2 px-3 pb-3 mb-2" style={{ borderBottom: "1px solid #f0ece6" }}>
          <div className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0" style={{ background: "#F97316" }}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="white"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
          </div>
          <span className="font-bold text-xs" style={{ color: "#1a1a1a" }}>ContextDrop</span>
        </div>
        <div className="flex flex-col gap-0.5 px-2">
          <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg" style={{ background: "#fff7ed" }}>
            <IconDashboard size={13} color="#F97316" />
            <span className="text-xs font-semibold" style={{ color: "#F97316" }}>My Feed</span>
          </div>
          <div className="flex items-center justify-between px-2 py-1.5 rounded-lg">
            <div className="flex items-center gap-2">
              <IconCheck size={13} color="#6b7280" />
              <span className="text-xs" style={{ color: "#374151" }}>Tasks</span>
            </div>
            <motion.span key={taskCount} initial={{ scale: 1.6, color: "#F97316" }} animate={{ scale: 1, color: "#F97316" }} transition={{ duration: 0.3, type: "spring", stiffness: 300 }}
              className="text-xs font-bold px-1.5 py-0.5 rounded-full" style={{ background: "#fff7ed", minWidth: 18, textAlign: "center" }}>{taskCount}</motion.span>
          </div>
          <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg">
            <IconBrain size={13} color="#6b7280" />
            <span className="text-xs" style={{ color: "#374151" }}>Ask AI</span>
            <span className="ml-auto text-xs px-1.5 py-0.5 rounded-full text-white" style={{ background: "#F97316", fontSize: 8 }}>New</span>
          </div>
        </div>
      </div>

      {/* Feed */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <div className="flex items-center gap-1.5 px-3 py-2 flex-shrink-0" style={{ borderBottom: "1px solid #f0ece6" }}>
          {["All", "Instagram", "TikTok", "X"].map(tab => (
            <button key={tab} className="px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap"
              style={tab === "All" ? { background: "#F97316", color: "white" } : { background: "#f5f5f5", color: "#6b7280" }}>{tab}</button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-2.5 flex flex-col gap-2">
          {/* New animated card */}
          <AnimatePresence>
            {newCardVisible && (
              <motion.div key="new-card" initial={{ opacity: 0, y: -14, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                className="rounded-xl p-3" style={{ background: "white", border: "1.5px solid #fed7aa", boxShadow: "0 2px 14px rgba(249,115,22,0.1)" }}>
                <div className="flex items-center gap-2 mb-2"><InstagramIcon /><span className="text-xs font-semibold tracking-wide" style={{ color: "#9ca3af" }}>INSTAGRAM</span></div>
                {step >= 4 ? (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
                    <div className="font-bold text-sm mb-1 leading-snug" style={{ color: "#1a1a1a" }}>Claude Code: sub-agents that ship</div>
                    <div className="text-xs mb-2 leading-relaxed" style={{ color: "#6b7280", fontStyle: "italic" }}>CLAUDE.md at 14:30 is the only part worth rewinding. Skip the intro.</div>
                    <div className="flex flex-wrap gap-1 mb-2">
                      {["claude code", "ai dev"].map(t => <span key={t} className="text-xs px-2 py-0.5 rounded-full" style={{ background: "#f5f5f5", color: "#6b7280" }}>{t}</span>)}
                    </div>
                  </motion.div>
                ) : (
                  <div className="space-y-1.5 mb-2">
                    {[70, 88, 52].map((w, i) => (
                      <motion.div key={i} animate={{ opacity: [0.35, 0.7, 0.35] }} transition={{ duration: 1.1, repeat: Infinity, delay: i * 0.15 }}
                        className="h-2.5 rounded" style={{ background: "#f0ece6", width: `${w}%` }} />
                    ))}
                  </div>
                )}
                {step >= 4 && (
                  <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.3 }} className="flex items-center gap-2">
                    <motion.button animate={step === 5 ? { scale: [1, 1.06, 1], boxShadow: ["0 0 0 0 rgba(249,115,22,0)", "0 0 0 5px rgba(249,115,22,0.22)", "0 0 0 0 rgba(249,115,22,0)"] } : {}} transition={{ duration: 0.5 }}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold"
                      style={newCardTaskAdded ? { background: "#dcfce7", color: "#16a34a", border: "1px solid #bbf7d0" } : { background: "#fff7ed", color: "#F97316", border: "1px solid #fed7aa" }}>
                      <span className="inline-flex items-center gap-1"><IconCheck size={12} color={newCardTaskAdded ? "#16a34a" : "#F97316"} />{newCardTaskAdded ? "Added to tasks" : "Add to tasks"}</span>
                    </motion.button>
                    <button className="px-3 py-1.5 rounded-lg text-xs font-semibold" style={{ background: "#fffbeb", color: "#d97706", border: "1px solid #fde68a" }}>
                      <span className="inline-flex items-center gap-1"><IconLightning size={12} color="#d97706" /> Deep Dive</span>
                    </button>
                  </motion.div>
                )}
                <AnimatePresence>
                  {newCardTaskAdded && (
                    <motion.div initial={{ opacity: 0, height: 0, marginTop: 0 }} animate={{ opacity: 1, height: "auto", marginTop: 8 }} transition={{ duration: 0.3 }}
                      className="flex items-center gap-2 px-3 py-2 rounded-lg overflow-hidden" style={{ background: "#fff7ed", borderLeft: "3px solid #F97316" }}>
                      <input type="checkbox" className="w-3 h-3 flex-shrink-0" style={{ accentColor: "#F97316" }} readOnly />
                      <span className="text-xs" style={{ color: "#374151" }}>Set up CLAUDE.md in every new project</span>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Static cards */}
          <div className="rounded-xl p-3" style={{ background: "white", border: "1px solid #f0ece6" }}>
            <div className="flex items-center gap-2 mb-1.5"><XIcon /><span className="text-xs font-semibold tracking-wide" style={{ color: "#9ca3af" }}>X / TWITTER</span></div>
            <div className="font-bold text-xs mb-1 leading-snug" style={{ color: "#1a1a1a" }}>The Cursor AI workflow that 10x&apos;d my output</div>
            <div className="text-xs leading-relaxed" style={{ color: "#6b7280", fontStyle: "italic" }}>Tab completion + inline chat = 3x faster reviews.</div>
          </div>
          <div className="rounded-xl p-3" style={{ background: "white", border: "1px solid #f0ece6" }}>
            <div className="flex items-center gap-2 mb-1.5"><InstagramIcon /><span className="text-xs font-semibold tracking-wide" style={{ color: "#9ca3af" }}>INSTAGRAM</span></div>
            <div className="font-bold text-xs mb-1 leading-snug" style={{ color: "#1a1a1a" }}>Why most SaaS pricing pages fail</div>
            <div className="text-xs leading-relaxed" style={{ color: "#6b7280", fontStyle: "italic" }}>The anchoring stat is worth 30 seconds. Skip the rest.</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// — Main Section —
export default function DashboardPreviewSection() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(sectionRef, { once: false, margin: "-80px" });

  const [step, setStep] = useState(0);
  const [taskCount, setTaskCount] = useState(4);
  const [newCardVisible, setNewCardVisible] = useState(false);
  const [newCardTaskAdded, setNewCardTaskAdded] = useState(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const clear = () => { timers.current.forEach(clearTimeout); timers.current = []; };
  const after = (fn: () => void, ms: number) => { const id = setTimeout(fn, ms); timers.current.push(id); };

  const runSequence = () => {
    clear();
    setStep(0); setTaskCount(4); setNewCardVisible(false); setNewCardTaskAdded(false);
    after(() => setStep(1), 800);
    after(() => setStep(2), 1700);
    after(() => { setStep(3); setNewCardVisible(true); }, 3000);
    after(() => setStep(4), 4000);
    after(() => setStep(5), 5200);
    after(() => { setStep(6); setNewCardTaskAdded(true); setTaskCount(5); }, 6000);
    after(runSequence, 10000);
  };

  useEffect(() => {
    if (isInView) {
      const id = setTimeout(runSequence, 400);
      timers.current.push(id);
    } else {
      clear();
      setStep(0); setTaskCount(4); setNewCardVisible(false); setNewCardTaskAdded(false);
    }
    return clear;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isInView]);

  const dashboardBlurred = step < 3;

  return (
    <section ref={sectionRef} id="preview" className="py-20 px-4" style={{ background: "#faf8f5", borderTop: "1px solid #e7e2d9", borderBottom: "1px solid #e7e2d9" }}>
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <div className="inline-block text-xs font-bold tracking-widest uppercase mb-4 px-3 py-1 rounded-full" style={{ color: "#F97316", background: "#fff7ed", border: "1px solid #fed7aa" }}>The Dashboard</div>
          <h2 className="font-black mb-4" style={{ fontSize: "clamp(2rem, 3.5vw, 3rem)", color: "#1a1a1a", letterSpacing: "-0.04em", lineHeight: 1.1 }}>
            Your content library.<br /><span style={{ color: "#F97316" }}>Finally actionable.</span>
          </h2>
          <p className="text-base max-w-md mx-auto" style={{ color: "#78716c", lineHeight: 1.7 }}>
            Everything you&apos;ve analysed lives in one clean dashboard — searchable, filterable, and connected to your tasks and tools.
          </p>
        </div>

        {/* Browser mockup */}
        <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid #e5e0d8", boxShadow: "0 8px 40px rgba(0,0,0,0.08), 0 2px 8px rgba(0,0,0,0.04)" }}>
          <div className="flex items-center gap-2 px-4 py-3" style={{ background: "#f5f0eb", borderBottom: "1px solid #e5e0d8" }}>
            <div className="flex gap-1.5">
              <div className="w-3 h-3 rounded-full" style={{ background: "#ff5f57" }} />
              <div className="w-3 h-3 rounded-full" style={{ background: "#febc2e" }} />
              <div className="w-3 h-3 rounded-full" style={{ background: "#28c840" }} />
            </div>
            <div className="flex-1 mx-4">
              <div className="mx-auto max-w-xs px-3 py-1 rounded-full text-xs text-center" style={{ background: "white", color: "#9ca3af", border: "1px solid #e5e0d8" }}>
                contextdrop.com/dashboard
              </div>
            </div>
          </div>

          <div className="flex" style={{ height: "clamp(380px, 56vh, 500px)" }}>
            {/* Telegram — hidden on mobile */}
            <motion.div className="hidden md:block flex-shrink-0" style={{ width: 240, borderRight: "1px solid #1a2533", position: "relative", zIndex: dashboardBlurred ? 2 : 1 }}
              animate={{ boxShadow: dashboardBlurred ? "4px 0 24px rgba(0,0,0,0.18)" : "none" }} transition={{ duration: 0.5 }}>
              <TelegramPanel step={step} />
            </motion.div>

            {/* Dashboard — blurs while Telegram active */}
            <motion.div className="flex-1 overflow-hidden"
              animate={{ filter: dashboardBlurred ? "blur(2px) brightness(0.92)" : "blur(0px) brightness(1)", opacity: dashboardBlurred ? 0.7 : 1 }}
              transition={{ duration: 0.5, ease: "easeInOut" }}>
              <DashboardFeed step={step} taskCount={taskCount} newCardVisible={newCardVisible} newCardTaskAdded={newCardTaskAdded} />
            </motion.div>
          </div>
        </div>

        <p className="text-center mt-4 text-sm font-mono" style={{ color: "#9ca3af" }}>
          // Every link you&apos;ve ever saved — finally turned into action.
        </p>
      </div>
    </section>
  );
}
