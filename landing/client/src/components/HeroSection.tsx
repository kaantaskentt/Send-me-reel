/*
 * HeroSection — ContextDrop "Design B Simplified"
 * Design B base: video background, centered headline, Plus Jakarta Sans 800
 * Hero visual: the bookmark-transform mockup (Instagram saved grid → ContextDrop feed)
 * Verdict cards use exact copy: Obsidian (Instagram/Apply), Claude Code (LinkedIn/Learn), SaaS pricing (X/Skip)
 */

import { useEffect, useState } from "react";

const HERO_VIDEO_URL =
  "https://d2xsxph8kpxj0f.cloudfront.net/310419663029819932/PLcAoykFsSXnZwd5KnAU3Y/hero_loop_5e8e7a1f.mp4";

const BOOKMARK_MOCKUP =
  "https://d2xsxph8kpxj0f.cloudfront.net/310419663029819932/PLcAoykFsSXnZwd5KnAU3Y/bookmark_transform-Jha2Z6WFfgQy3n73aNgcYF.webp";

export default function HeroSection() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 80);
    return () => clearTimeout(t);
  }, []);

  const fade = (delay: number) => ({
    opacity: visible ? 1 : 0,
    transform: visible ? "translateY(0)" : "translateY(20px)",
    transition: `opacity 0.7s ease ${delay}s, transform 0.7s ease ${delay}s`,
  });

  return (
    <section
      style={{
        position: "relative",
        minHeight: "100vh",
        overflow: "hidden",
        background: "#faf8f5",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
      }}
    >
      {/* ── Video background ── */}
      <div style={{ position: "absolute", inset: 0, zIndex: 0 }}>
        <video
          autoPlay
          muted
          loop
          playsInline
          style={{ width: "100%", height: "100%", objectFit: "cover", opacity: 0.22 }}
        >
          <source src={HERO_VIDEO_URL} type="video/mp4" />
        </video>
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(180deg, rgba(250,248,245,0.08) 0%, rgba(250,248,245,0.05) 30%, rgba(250,248,245,0.75) 68%, rgba(250,248,245,1) 100%)",
          }}
        />
      </div>

      {/* ── Content ── */}
      <div
        style={{
          position: "relative",
          zIndex: 1,
          width: "100%",
          maxWidth: 860,
          margin: "0 auto",
          padding: "clamp(100px, 14vh, 130px) clamp(1.5rem, 5vw, 4rem) 0",
          textAlign: "center",
        }}
      >
        {/* Badge */}
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            background: "rgba(255,255,255,0.9)",
            backdropFilter: "blur(8px)",
            border: "1px solid #fed7aa",
            color: "#f97316",
            fontSize: 13,
            fontWeight: 600,
            padding: "6px 16px",
            borderRadius: 100,
            marginBottom: "2rem",
            boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
            fontFamily: "'Plus Jakarta Sans', 'DM Sans', sans-serif",
            ...fade(0),
          }}
        >
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: "#f97316",
              display: "inline-block",
              animation: "pulse-dot 2s infinite",
            }}
          />
          10 free analyses · No signup
        </div>

        {/* Headline */}
        <h1
          style={{
            fontFamily: "'Plus Jakarta Sans', 'DM Sans', sans-serif",
            fontWeight: 800,
            fontSize: "clamp(2.8rem, 6.5vw, 5.2rem)",
            lineHeight: 1.0,
            letterSpacing: "-0.05em",
            color: "#1c1917",
            marginBottom: "1.5rem",
            ...fade(0.1),
          }}
        >
          Your social feed
          <span style={{ color: "#f97316", display: "block" }}>
            is actually useful.
          </span>
        </h1>

        {/* Subline */}
        <p
          style={{
            fontSize: "clamp(15px, 1.8vw, 17px)",
            color: "#78716c",
            maxWidth: 500,
            margin: "0 auto 2.5rem",
            lineHeight: 1.75,
            fontFamily: "'DM Sans', sans-serif",
            fontWeight: 400,
            ...fade(0.2),
          }}
        >
          Every video you save and forget is a tool, a framework, or an idea
          you never used. ContextDrop turns your saved content into a feed of
          verdicts — what it contains, what to do with it, and why it matters{" "}
          <em>to you</em>. In 60 seconds.
        </p>

        {/* CTAs */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "0.875rem",
            flexWrap: "wrap",
            marginBottom: "1.5rem",
            ...fade(0.3),
          }}
        >
          <CTAButton />
          <a
            href="#how-it-works"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              background: "rgba(255,255,255,0.85)",
              backdropFilter: "blur(8px)",
              color: "#44403c",
              fontFamily: "'Plus Jakarta Sans', 'DM Sans', sans-serif",
              fontWeight: 600,
              fontSize: 14,
              padding: "13px 22px",
              borderRadius: 100,
              textDecoration: "none",
              border: "1.5px solid #e7e2d9",
              transition: "all 0.2s",
            }}
            onMouseEnter={(e) => {
              const el = e.currentTarget as HTMLAnchorElement;
              el.style.background = "#fff";
              el.style.borderColor = "#a8a29e";
            }}
            onMouseLeave={(e) => {
              const el = e.currentTarget as HTMLAnchorElement;
              el.style.background = "rgba(255,255,255,0.85)";
              el.style.borderColor = "#e7e2d9";
            }}
          >
            See how it works ↓
          </a>
        </div>

        {/* Social proof */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 10,
            marginBottom: "3.5rem",
            ...fade(0.4),
          }}
        >
          <div style={{ display: "flex" }}>
            {[
              { bg: "#F97316", l: "A" },
              { bg: "#8B5CF6", l: "M" },
              { bg: "#10B981", l: "J" },
              { bg: "#3B82F6", l: "K" },
            ].map((u, i) => (
              <div
                key={i}
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: "50%",
                  border: "2px solid #faf8f5",
                  background: u.bg,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 10,
                  color: "#fff",
                  fontWeight: 700,
                  marginLeft: i > 0 ? -8 : 0,
                  fontFamily: "'DM Sans', sans-serif",
                }}
              >
                {u.l}
              </div>
            ))}
          </div>
          <span
            style={{
              fontSize: 13,
              color: "#a8a29e",
              fontFamily: "'DM Sans', sans-serif",
            }}
          >
            Joined by <strong style={{ color: "#44403c" }}>2,400+</strong>{" "}
            creators &amp; founders
          </span>
        </div>
      </div>

      {/* ── Bookmark transform mockup ── */}
      <div
        style={{
          position: "relative",
          zIndex: 1,
          width: "100%",
          maxWidth: 960,
          margin: "0 auto",
          padding: "0 clamp(1rem, 4vw, 3rem) clamp(3rem, 6vh, 5rem)",
          ...fade(0.5),
        }}
      >
        <div
          style={{
            borderRadius: 20,
            overflow: "hidden",
            boxShadow:
              "0 24px 80px rgba(0,0,0,0.12), 0 8px 24px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.04)",
          }}
        >
          <img
            src={BOOKMARK_MOCKUP}
            alt="Your Instagram saved posts become a clean ContextDrop feed"
            style={{ width: "100%", display: "block" }}
            loading="eager"
          />
        </div>
        {/* Caption */}
        <p
          style={{
            textAlign: "center",
            fontSize: 12,
            color: "#a8a29e",
            marginTop: "1rem",
            fontFamily: "'DM Sans', sans-serif",
            letterSpacing: "0.04em",
          }}
        >
          Every video you've ever saved — finally useful.
        </p>
      </div>

      <style>{`
        @keyframes pulse-dot {
          0%, 100% { box-shadow: 0 0 0 0 rgba(249,115,22,0.4); }
          50% { box-shadow: 0 0 0 6px rgba(249,115,22,0); }
        }
      `}</style>
    </section>
  );
}

function CTAButton() {
  const [hovered, setHovered] = useState(false);
  return (
    <a
      href="https://t.me/contextdrop2027bot"
      target="_blank"
      rel="noopener noreferrer"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        background: hovered ? "#ea6c0a" : "#f97316",
        color: "#fff",
        fontFamily: "'Plus Jakarta Sans', 'DM Sans', sans-serif",
        fontWeight: 700,
        fontSize: 15,
        padding: "14px 26px",
        borderRadius: 100,
        textDecoration: "none",
        boxShadow: hovered
          ? "0 12px 36px rgba(249,115,22,0.45)"
          : "0 6px 28px rgba(249,115,22,0.28)",
        transform: hovered ? "translateY(-2px)" : "translateY(0)",
        transition: "all 0.2s",
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12l-6.871 4.326-2.962-.924c-.643-.204-.657-.643.136-.953l11.57-4.461c.537-.194 1.006.131.833.941z" />
      </svg>
      Start free on Telegram
    </a>
  );
}
