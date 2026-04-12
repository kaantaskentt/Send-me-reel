/*
 * TransformSection — ContextDrop "Before / After"
 * Design: Warm cream. Left: blurred real-people photo grid (9 thumbnails, Unsplash).
 * Right: large, bold feed cards — convincing copy, ContextDrop Guy voice.
 * No Apply/Learn/Skip. Cards are bigger and more readable than before.
 */

import { useScrollAnimation } from "@/hooks/useScrollAnimation";

// Real people / content creator photos — blurred overlay gives the "saved video" feel
const THUMBNAILS = [
  { url: "https://images.unsplash.com/photo-1611532736597-de2d4265fba3?w=300&q=80", platform: "ig" },
  { url: "https://images.unsplash.com/photo-1560250097-0b93528c311a?w=300&q=80", platform: "yt" },
  { url: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=300&q=80", platform: "li" },
  { url: "https://images.unsplash.com/photo-1551650975-87deedd944c3?w=300&q=80", platform: "ig" },
  { url: "https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=300&q=80", platform: "x" },
  { url: "https://images.unsplash.com/photo-1504868584819-f8e8b4b6d7e3?w=300&q=80", platform: "yt" },
  { url: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&q=80", platform: "ig" },
  { url: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=300&q=80", platform: "li" },
  { url: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=300&q=80", platform: "x" },
];

// Feed cards — different topics from hero. ContextDrop Guy voice. Detailed, opinionated.
const FEED_CARDS = [
  {
    platform: "ig",
    platformLabel: "Instagram",
    platformBg: "linear-gradient(135deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888)",
    accentColor: "#dc2743",
    title: "How to set up Claude agent managers — one agent runs the others",
    summary: "This is the one. Orchestrator pattern cuts prompt complexity in half. The GitHub repo he flashes at 2:14 is the real takeaway — fork it before you do anything else. The rest of the reel is just context.",
    tags: ["claude ai", "tools", "dev"],
    taskAdded: true,
    task: "Set up agent manager pattern this week",
    verdict: "Worth your time",
    verdictColor: "#16a34a",
    verdictBg: "#f0fdf4",
  },
  {
    platform: "li",
    platformLabel: "LinkedIn",
    platformBg: "#0077b5",
    accentColor: "#0077b5",
    title: "Why most SaaS pricing pages fail",
    summary: "Mid. He's rehashing a blog post from 2024. The one stat about anchoring is worth 30 seconds of your time. Skip the rest — you've seen this before.",
    tags: ["saas", "pricing"],
    taskAdded: false,
    task: null,
    verdict: "Skim it",
    verdictColor: "#b45309",
    verdictBg: "#fffbeb",
  },
  {
    platform: "x",
    platformLabel: "X / Twitter",
    platformBg: "#000000",
    accentColor: "#525252",
    title: "The Cursor AI workflow that 10x'd my output",
    summary: "Solid. Tab completion + inline chat = 3x faster code reviews. This is your lane — the workflow maps directly to what you're building. Try it on the next PR before committing to the full setup.",
    tags: ["cursor", "workflow"],
    taskAdded: true,
    task: "Try Cursor tab + inline chat on next PR",
    verdict: "Worth your time",
    verdictColor: "#16a34a",
    verdictBg: "#f0fdf4",
  },
];

export default function TransformSection() {
  const headlineRef = useScrollAnimation(0.2) as React.RefObject<HTMLDivElement>;
  const leftRef = useScrollAnimation(0.1) as React.RefObject<HTMLDivElement>;
  const rightRef = useScrollAnimation(0.15) as React.RefObject<HTMLDivElement>;

  return (
    <section
      id="transform"
      style={{
        background: "#faf8f5",
        borderTop: "1px solid #f0ede8",
        borderBottom: "1px solid #f0ede8",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          maxWidth: 1100,
          margin: "0 auto",
          padding: "clamp(4rem, 8vh, 6rem) clamp(1.5rem, 5vw, 4rem)",
        }}
      >
        {/* Headline */}
        <div
          ref={headlineRef}
          className="fade-up"
          style={{ textAlign: "center", marginBottom: "3.5rem" }}
        >
          <span
            style={{
              display: "inline-block",
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: "#f97316",
              marginBottom: "1rem",
              fontFamily: "'DM Sans', sans-serif",
            }}
          >
            The Transformation
          </span>
          <h2
            style={{
              fontFamily: "'Plus Jakarta Sans', 'DM Sans', sans-serif",
              fontWeight: 800,
              fontSize: "clamp(2rem, 3.5vw, 3rem)",
              letterSpacing: "-0.04em",
              color: "#1c1917",
              lineHeight: 1.1,
              marginBottom: "1rem",
            }}
          >
            This is what you save.
            <br />
            <span style={{ color: "#f97316" }}>This is what you get back.</span>
          </h2>
          <p
            style={{
              fontSize: 15,
              color: "#78716c",
              maxWidth: 460,
              margin: "0 auto",
              lineHeight: 1.7,
              fontFamily: "'DM Sans', sans-serif",
            }}
          >
            Send any link. Get back a sharp, honest take — what it is, what matters, and exactly what to do next.
          </p>
        </div>

        {/* Two-column layout */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr auto 1fr",
            gap: "2.5rem",
            alignItems: "start",
          }}
          className="transform-grid"
        >
          {/* LEFT: Blurred real-people photo grid */}
          <div ref={leftRef} className="fade-up">
            <div
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: "#a8a29e",
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                marginBottom: "1rem",
                fontFamily: "'DM Sans', sans-serif",
              }}
            >
              Your saved posts
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: 5,
                borderRadius: 18,
                overflow: "hidden",
                boxShadow: "0 8px 32px rgba(0,0,0,0.10), 0 2px 8px rgba(0,0,0,0.06)",
                border: "1px solid #e7e2d9",
              }}
            >
              {THUMBNAILS.map((thumb, i) => (
                <div
                  key={i}
                  style={{
                    position: "relative",
                    aspectRatio: "1",
                    overflow: "hidden",
                    background: "#e5e0d8",
                  }}
                >
                  {/* Real photo, slightly blurred */}
                  <img
                    src={thumb.url}
                    alt=""
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                      display: "block",
                      filter: "blur(2.5px) brightness(0.82)",
                      transform: "scale(1.05)",
                    }}
                    loading="lazy"
                  />

                  {/* Dark overlay */}
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      background: "rgba(0,0,0,0.12)",
                    }}
                  />

                  {/* Play button */}
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <div
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: "50%",
                        background: "rgba(255,255,255,0.88)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
                      }}
                    >
                      <svg width="9" height="11" viewBox="0 0 9 11" fill="none">
                        <path d="M1 1.5L8 5.5L1 9.5V1.5Z" fill="#1c1917" />
                      </svg>
                    </div>
                  </div>

                  {/* Bookmark */}
                  <div style={{ position: "absolute", top: 6, right: 6 }}>
                    <svg width="10" height="13" viewBox="0 0 10 13" fill="rgba(255,255,255,0.85)">
                      <path d="M1 1h8v11L5 9 1 12V1z" />
                    </svg>
                  </div>
                </div>
              ))}
            </div>

            <p
              style={{
                fontSize: 10.5,
                color: "#b8b0a8",
                marginTop: 12,
                fontFamily: "'JetBrains Mono', monospace",
                textAlign: "center",
                letterSpacing: "0.02em",
              }}
            >
              // 300+ saved. Opened: maybe 5.
            </p>
          </div>

          {/* CENTER: Arrow */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              paddingTop: "4rem",
              gap: 6,
            }}
          >
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: "50%",
                background: "#f97316",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 6px 20px rgba(249,115,22,0.40)",
                flexShrink: 0,
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </div>
            <span
              style={{
                fontSize: 9,
                color: "#f97316",
                fontWeight: 700,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                fontFamily: "'DM Sans', sans-serif",
                whiteSpace: "nowrap",
              }}
            >
              30 sec
            </span>
          </div>

          {/* RIGHT: Bold, convincing feed cards */}
          <div ref={rightRef} className="fade-up">
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: "#f97316",
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                marginBottom: "1rem",
                fontFamily: "'DM Sans', sans-serif",
              }}
            >
              Your ContextDrop feed
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {FEED_CARDS.map((card, i) => (
                <div
                  key={i}
                  style={{
                    background: "white",
                    border: "1px solid #ede9e3",
                    borderRadius: 14,
                    padding: "16px 18px",
                    boxShadow: "0 2px 16px rgba(0,0,0,0.06)",
                    transition: "box-shadow 0.2s",
                  }}
                >
                  {/* Platform row + verdict badge */}
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                      {/* Platform icon */}
                      <div
                        style={{
                          width: 22,
                          height: 22,
                          borderRadius: 6,
                          background: card.platformBg,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                        }}
                      >
                        {card.platform === "yt" && (
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="white"><path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
                        )}
                        {card.platform === "x" && (
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="white"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.253 5.622 5.911-5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                        )}
                        {card.platform === "ig" && (
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="white"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
                        )}
                        {card.platform === "li" && (
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="white"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
                        )}
                      </div>
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          color: "#a8a29e",
                          textTransform: "uppercase",
                          letterSpacing: "0.08em",
                          fontFamily: "'DM Sans', sans-serif",
                        }}
                      >
                        {card.platformLabel}
                      </span>
                    </div>

                    {/* Verdict badge */}
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        padding: "3px 9px",
                        borderRadius: 100,
                        background: card.verdictBg,
                        color: card.verdictColor,
                        border: `1px solid ${card.verdictColor}22`,
                        fontFamily: "'DM Sans', sans-serif",
                        letterSpacing: "0.02em",
                      }}
                    >
                      {card.verdict}
                    </span>
                  </div>

                  {/* Title — big and bold */}
                  <h3
                    style={{
                      fontSize: 15,
                      fontWeight: 800,
                      color: "#1c1917",
                      marginBottom: 7,
                      lineHeight: 1.3,
                      fontFamily: "'Plus Jakarta Sans', 'DM Sans', sans-serif",
                      letterSpacing: "-0.02em",
                    }}
                  >
                    {card.title}
                  </h3>

                  {/* Summary — ContextDrop Guy voice, readable size */}
                  <p
                    style={{
                      fontSize: 12.5,
                      color: "#57534e",
                      lineHeight: 1.6,
                      marginBottom: 10,
                      fontFamily: "'DM Sans', sans-serif",
                    }}
                  >
                    {card.summary}
                  </p>

                  {/* Tags */}
                  <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 12 }}>
                    {card.tags.map((tag) => (
                      <span
                        key={tag}
                        style={{
                          fontSize: 10,
                          fontWeight: 600,
                          padding: "3px 9px",
                          borderRadius: 100,
                          background: "#f5f3f0",
                          color: "#78716c",
                          border: "1px solid #e7e2d9",
                          fontFamily: "'DM Sans', sans-serif",
                        }}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>

                  {/* Divider */}
                  <div style={{ height: 1, background: "#f0ede8", marginBottom: 12 }} />

                  {/* Action row */}
                  <div style={{ display: "flex", gap: 7, alignItems: "center" }}>
                    <div
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        padding: "6px 12px",
                        borderRadius: 8,
                        background: card.taskAdded ? "#f0fdf4" : "#fff5ee",
                        border: `1px solid ${card.taskAdded ? "#bbf7d0" : "#fed7aa"}`,
                        color: card.taskAdded ? "#16a34a" : "#f97316",
                        fontFamily: "'DM Sans', sans-serif",
                        cursor: "pointer",
                      }}
                    >
                      {card.taskAdded ? "✅ Added to tasks" : "✅ Add to tasks"}
                    </div>
                    <div
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        padding: "6px 12px",
                        borderRadius: 8,
                        background: "#f5f3ff",
                        border: "1px solid #ddd6fe",
                        color: "#7c3aed",
                        fontFamily: "'DM Sans', sans-serif",
                        cursor: "pointer",
                      }}
                    >
                      ⚡ Deep Dive
                    </div>
                  </div>

                  {/* Task chip */}
                  {card.taskAdded && card.task && (
                    <div
                      style={{
                        marginTop: 10,
                        background: "#fafaf8",
                        border: "1px solid #e7e2d9",
                        borderLeft: "3px solid #f97316",
                        borderRadius: 8,
                        padding: "7px 11px",
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                      }}
                    >
                      <span style={{ fontSize: 11 }}>📌</span>
                      <span
                        style={{
                          fontSize: 11.5,
                          color: "#44403c",
                          fontWeight: 600,
                          fontFamily: "'DM Sans', sans-serif",
                        }}
                      >
                        {card.task}
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 720px) {
          .transform-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </section>
  );
}
