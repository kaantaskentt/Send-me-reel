"use client";

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
          50 free credits · No signup
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
          <em>to you</em>. In 30 seconds.
        </p>

        {/* CTAs — clear hierarchy: primary → secondary text links */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "0.75rem",
            marginBottom: "1.5rem",
            ...fade(0.3),
          }}
        >
          <CTAButton />
          <div style={{ display: "flex", alignItems: "center", gap: "1.25rem", flexWrap: "wrap", justifyContent: "center" }}>
            <a
              href="/dashboard"
              style={{ color: "#78716c", fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: 13, textDecoration: "none", borderBottom: "1px solid #d6d3d1", paddingBottom: 1, transition: "color 0.15s" }}
            >
              Go to dashboard →
            </a>
            <span style={{ color: "#d6d3d1", fontSize: 12 }}>·</span>
            <a
              href="#how-it-works"
              style={{ color: "#a8a29e", fontFamily: "'DM Sans', sans-serif", fontWeight: 500, fontSize: 13, textDecoration: "none", transition: "color 0.15s" }}
            >
              See how it works ↓
            </a>
          </div>
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
  const [tgHovered, setTgHovered] = useState(false);
  const baseStyle = {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    color: "#fff",
    fontFamily: "'Plus Jakarta Sans', 'DM Sans', sans-serif",
    fontWeight: 700,
    fontSize: 15,
    padding: "14px 26px",
    borderRadius: 100,
    textDecoration: "none",
    transition: "all 0.2s",
  } as const;
  return (
    <div style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center" }}>
      <a
        href="https://t.me/contextdrop2027bot"
        target="_blank"
        rel="noopener noreferrer"
        style={{
          ...baseStyle,
          background: tgHovered ? "#ea6c0a" : "#f97316",
          boxShadow: tgHovered
            ? "0 12px 36px rgba(249,115,22,0.45)"
            : "0 6px 28px rgba(249,115,22,0.28)",
          transform: tgHovered ? "translateY(-2px)" : "translateY(0)",
        }}
        onMouseEnter={() => setTgHovered(true)}
        onMouseLeave={() => setTgHovered(false)}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12l-6.871 4.326-2.962-.924c-.643-.204-.657-.643.136-.953l11.57-4.461c.537-.194 1.006.131.833.941z" />
        </svg>
        Telegram
      </a>
      <span
        style={{
          ...baseStyle,
          background: "#25D366",
          opacity: 0.6,
          cursor: "not-allowed",
          position: "relative",
        }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
        </svg>
        WhatsApp
        <span style={{ fontSize: 9, fontWeight: 600, background: "rgba(255,255,255,0.25)", padding: "2px 8px", borderRadius: 100, marginLeft: 2 }}>Soon</span>
      </span>
    </div>
  );
}
