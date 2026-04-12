"use client";

/*
 * DashboardPreviewSection — ContextDrop (ported from Manus landing-v2)
 * Browser mockup of the dashboard with feature callouts below.
 */

import { useScrollAnimation } from "@/hooks/useScrollAnimation";

const FEATURES = [
  { emoji: "📥", title: "Your Feed", desc: "Every link you've sent, summarised and organised. Filter by platform, search by keyword, expand any card for the full breakdown." },
  { emoji: "✅", title: "Tasks", desc: "Add any insight to your task list with one tap. Each task stays linked to the content it came from so you never lose context." },
  { emoji: "💬", title: "Ask AI", desc: "Ask follow-up questions about any piece of content. Get a step-by-step plan, alternatives, or a deeper breakdown — all in context." },
  { emoji: "🔗", title: "Connectors", desc: "Sync to Notion, Todoist, and Google Calendar (coming soon). Your summaries and tasks flow into the tools you already use." },
];

const MOCK_CARDS = [
  { platform: "youtube", title: "Claude Code: sub-agents that actually ship", summary: "Orchestrator runs the others. CLAUDE.md at 14:30 is the only part worth rewinding.", expanded: true, color: "#dc2626", time: "4m ago" },
  { platform: "x", title: "The Cursor AI workflow that 10x'd my output", summary: "Tab completion + inline chat = 3x faster reviews. Try it on the next PR.", expanded: false, color: "#000", time: "1h ago" },
  { platform: "linkedin", title: "Why most SaaS pricing pages fail", summary: "Mid. The one stat about anchoring is worth 30 seconds. Skip the rest.", expanded: false, color: "#0077b5", time: "3h ago" },
];

export default function DashboardPreviewSection() {
  const headlineRef = useScrollAnimation(0.2) as React.RefObject<HTMLDivElement>;
  const mockupRef = useScrollAnimation(0.1) as React.RefObject<HTMLDivElement>;
  const featuresRef = useScrollAnimation(0.15) as React.RefObject<HTMLDivElement>;

  return (
    <section id="preview" style={{ background: "#faf8f5", borderTop: "1px solid #e7e2d9", borderBottom: "1px solid #e7e2d9" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "clamp(4rem, 8vh, 6rem) clamp(1.5rem, 5vw, 4rem)" }}>

        {/* Headline */}
        <div ref={headlineRef} className="fade-up" style={{ textAlign: "center", marginBottom: "3rem" }}>
          <span style={{ display: "inline-block", fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#f97316", marginBottom: "1rem", fontFamily: "'DM Sans', sans-serif" }}>
            The Dashboard
          </span>
          <h2 style={{ fontFamily: "'Plus Jakarta Sans', 'DM Sans', sans-serif", fontWeight: 800, fontSize: "clamp(2rem, 3.5vw, 3rem)", letterSpacing: "-0.04em", color: "#1c1917", lineHeight: 1.1, marginBottom: "1rem" }}>
            Your content library.<br /><span style={{ color: "#f97316" }}>Finally actionable.</span>
          </h2>
          <p style={{ fontSize: 15, color: "#78716c", maxWidth: 460, margin: "0 auto", lineHeight: 1.7, fontFamily: "'DM Sans', sans-serif" }}>
            Everything you&apos;ve analysed lives in one clean dashboard — searchable, filterable, and connected to your tasks and tools.
          </p>
        </div>

        {/* Browser mockup */}
        <div ref={mockupRef} className="fade-up" style={{ marginBottom: "3rem" }}>
          <div style={{ borderRadius: 16, overflow: "hidden", boxShadow: "0 32px 80px rgba(0,0,0,0.14), 0 8px 24px rgba(0,0,0,0.07), 0 0 0 1px rgba(0,0,0,0.06)", border: "1px solid #e7e2d9" }}>

            {/* Browser chrome */}
            <div style={{ background: "#f5f3f0", borderBottom: "1px solid #e7e2d9", padding: "10px 16px", display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ display: "flex", gap: 5 }}>
                <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#fc5c57" }} />
                <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#fdbc2c" }} />
                <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#33c748" }} />
              </div>
              <div style={{ flex: 1, background: "white", borderRadius: 6, padding: "4px 12px", fontSize: 11, color: "#a8a29e", fontFamily: "'JetBrains Mono', monospace", border: "1px solid #e7e2d9", maxWidth: 280, margin: "0 auto" }}>
                contextdrop.com/dashboard
              </div>
            </div>

            {/* Dashboard content */}
            <div style={{ background: "#faf8f5", display: "flex", minHeight: 420 }}>

              {/* Sidebar */}
              <div className="hidden md:flex" style={{ width: 200, background: "white", borderRight: "1px solid #f0ede8", padding: "16px 0", flexShrink: 0, flexDirection: "column" }}>
                <div style={{ padding: "0 16px 16px", borderBottom: "1px solid #f0ede8", marginBottom: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ width: 28, height: 28, borderRadius: 8, background: "#f97316", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <svg width="12" height="12" viewBox="0 0 14 14" fill="none"><path d="M2.5 7L6 10.5L11.5 3.5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    </div>
                    <span style={{ fontWeight: 700, fontSize: 13, color: "#1c1917", fontFamily: "'DM Sans', sans-serif" }}>ContextDrop</span>
                  </div>
                </div>
                <div style={{ padding: "0 16px 12px", borderBottom: "1px solid #f0ede8", marginBottom: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ width: 28, height: 28, borderRadius: "50%", background: "#f97316", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <span style={{ color: "white", fontSize: 11, fontWeight: 700 }}>AM</span>
                    </div>
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 600, color: "#1c1917", fontFamily: "'DM Sans', sans-serif" }}>Alex M.</div>
                      <div style={{ fontSize: 9, color: "#a8a29e" }}>@alexm</div>
                    </div>
                  </div>
                </div>
                {[
                  { emoji: "📥", label: "My Feed", active: true },
                  { emoji: "✅", label: "Tasks", badge: "4" },
                  { emoji: "💬", label: "Ask AI", badge: "New" },
                  { emoji: "⚙️", label: "Settings" },
                ].map((item) => (
                  <div key={item.label} style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 16px", background: item.active ? "#fff7ed" : "transparent", borderLeft: item.active ? "2px solid #f97316" : "2px solid transparent", marginBottom: 2 }}>
                    <span style={{ fontSize: 12 }}>{item.emoji}</span>
                    <span style={{ fontSize: 11.5, fontWeight: item.active ? 700 : 500, color: item.active ? "#f97316" : "#57534e", fontFamily: "'DM Sans', sans-serif", flex: 1 }}>{item.label}</span>
                    {item.badge && <span style={{ fontSize: 9, fontWeight: 700, background: item.badge === "New" ? "#f97316" : "#fff7ed", color: item.badge === "New" ? "white" : "#f97316", padding: "1px 5px", borderRadius: 20 }}>{item.badge}</span>}
                  </div>
                ))}
                <div style={{ margin: "12px 16px 0", padding: "10px 12px", background: "#faf8f5", borderRadius: 8, border: "1px solid #f0ede8" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <span style={{ fontSize: 9, color: "#a8a29e" }}>Monthly credits</span>
                    <span style={{ fontSize: 9, fontWeight: 700, color: "#f97316" }}>47/100</span>
                  </div>
                  <div style={{ height: 3, background: "#f0ede8", borderRadius: 2 }}>
                    <div style={{ width: "47%", height: "100%", background: "#f97316", borderRadius: 2 }} />
                  </div>
                </div>
                <div style={{ padding: "12px 16px 0" }}>
                  <div style={{ background: "#f97316", borderRadius: 8, padding: "8px 12px", display: "flex", alignItems: "center", gap: 6, justifyContent: "center" }}>
                    <span style={{ fontSize: 10 }}>✈️</span>
                    <span style={{ fontSize: 10, fontWeight: 700, color: "white", fontFamily: "'DM Sans', sans-serif" }}>Send a video</span>
                  </div>
                </div>
              </div>

              {/* Feed */}
              <div style={{ flex: 1, padding: 16, overflow: "hidden", minWidth: 0 }}>
                <div style={{ display: "flex", gap: 6, marginBottom: 12, flexWrap: "wrap" }}>
                  {["All", "Instagram", "TikTok", "X"].map((tab, i) => (
                    <div key={tab} style={{ fontSize: 10, fontWeight: 600, padding: "4px 10px", borderRadius: 20, background: i === 0 ? "#f97316" : "white", color: i === 0 ? "white" : "#78716c", border: `1px solid ${i === 0 ? "#f97316" : "#e7e2d9"}`, fontFamily: "'DM Sans', sans-serif" }}>{tab}</div>
                  ))}
                </div>
                {MOCK_CARDS.map((card, i) => (
                  <div key={i} style={{ background: "white", borderRadius: 10, border: `1px solid ${card.expanded ? "#e7e5e4" : "#f0ede8"}`, marginBottom: 8, overflow: "hidden", boxShadow: card.expanded ? "0 4px 16px rgba(0,0,0,0.07)" : "0 1px 3px rgba(0,0,0,0.04)" }}>
                    <div style={{ padding: "10px 12px", display: "flex", alignItems: "flex-start", gap: 8 }}>
                      <div style={{ width: 16, height: 16, borderRadius: 4, background: card.color, flexShrink: 0, marginTop: 1 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: 11.5, color: "#1c1917", marginBottom: 2, lineHeight: 1.3 }}>{card.title}</div>
                        <div style={{ fontSize: 10, color: "#a8a29e", fontStyle: "italic" }}>{card.summary}</div>
                        {!card.expanded && <div style={{ display: "flex", gap: 6, marginTop: 4 }}><span style={{ fontSize: 8, color: "#d4cfc9" }}>⚡ Deep Dive</span><span style={{ fontSize: 8, color: "#d4cfc9" }}>· 💬 Ask</span></div>}
                      </div>
                      <span style={{ fontSize: 9, color: "#c4bfbb", whiteSpace: "nowrap" }}>{card.time}</span>
                    </div>
                    {card.expanded && (
                      <div style={{ padding: "0 12px 12px", borderTop: "1px solid #f5f3f0" }}>
                        <div style={{ background: "#fafaf8", borderRadius: 6, padding: "8px 10px", marginTop: 8, marginBottom: 8 }}>
                          <div style={{ fontSize: 8, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#a8a29e", marginBottom: 3 }}>🧠 What it is</div>
                          <div style={{ fontSize: 10, color: "#57534e", lineHeight: 1.5 }}>Solid. Sub-agents handle parallel tasks while Claude orchestrates — cuts build time by 60%. The CLAUDE.md setup at 14:30 is the only part worth rewinding. Skip the intro.</div>
                        </div>
                        <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
                          <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", color: "#16a34a", fontSize: 9, fontWeight: 700, padding: "5px 10px", borderRadius: 6 }}>✅ Add to my tasks</div>
                          <div style={{ background: "#fff7ed", border: "1px solid #fed7aa", color: "#ea580c", fontSize: 9, fontWeight: 700, padding: "5px 10px", borderRadius: 6 }}>⚡ Deep Dive</div>
                        </div>
                        <div style={{ background: "#fafaf8", border: "1px solid #e7e2d9", borderLeft: "2px solid #f97316", borderRadius: 6, padding: "6px 10px" }}>
                          <div style={{ fontSize: 8, color: "#a8a29e", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 2 }}>TASKS</div>
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <div style={{ width: 12, height: 12, borderRadius: 3, border: "1.5px solid #d4cfc9", flexShrink: 0 }} />
                            <span style={{ fontSize: 10, color: "#1c1917" }}>Set up CLAUDE.md in every new project</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Feature callouts */}
        <div ref={featuresRef} className="stagger-children" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1rem" }}>
          {FEATURES.map((f) => (
            <div key={f.title} style={{ background: "white", border: "1px solid #e7e2d9", borderRadius: 14, padding: "1.25rem 1.5rem", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
              <div style={{ fontSize: 22, marginBottom: 8 }}>{f.emoji}</div>
              <h3 style={{ fontFamily: "'Plus Jakarta Sans', 'DM Sans', sans-serif", fontWeight: 700, fontSize: 14, color: "#1c1917", marginBottom: 6, letterSpacing: "-0.01em" }}>{f.title}</h3>
              <p style={{ fontSize: 12.5, color: "#78716c", lineHeight: 1.65, fontFamily: "'DM Sans', sans-serif" }}>{f.desc}</p>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div style={{ textAlign: "center", marginTop: "2.5rem" }}>
          <a href="/dashboard" style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "transparent", border: "1.5px solid #e7e2d9", color: "#44403c", fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: 13, padding: "10px 20px", borderRadius: 100, textDecoration: "none", transition: "all 0.2s" }}>
            Open dashboard →
          </a>
        </div>
      </div>
    </section>
  );
}
