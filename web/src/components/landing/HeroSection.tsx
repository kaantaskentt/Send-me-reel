"use client";

/*
 * HeroSection — ContextDrop "Design B Overhaul" (ported from Manus landing-v2)
 * Rotating headline + before/after visual: blurred 9-photo grid → arrow → 3 verdict cards
 */

import { useEffect, useState } from "react";

const HERO_VIDEO_URL =
  "https://d2xsxph8kpxj0f.cloudfront.net/310419663029819932/PLcAoykFsSXnZwd5KnAU3Y/hero_loop_5e8e7a1f.mp4";

const ROTATING_WORDS = ["summarised.", "actioned.", "useful."];

const GRID_IMAGES = [
  "https://d2xsxph8kpxj0f.cloudfront.net/310419663029819932/PLcAoykFsSXnZwd5KnAU3Y/RZMhPDNnbZpx_ab1add6e.jpg",
  "https://d2xsxph8kpxj0f.cloudfront.net/310419663029819932/PLcAoykFsSXnZwd5KnAU3Y/356piVEXwgnh_94e4e7a7.jpg",
  "https://d2xsxph8kpxj0f.cloudfront.net/310419663029819932/PLcAoykFsSXnZwd5KnAU3Y/uPzQBCBLHQve_83ee7649.jpg",
  "https://d2xsxph8kpxj0f.cloudfront.net/310419663029819932/PLcAoykFsSXnZwd5KnAU3Y/VViOS25xufIt_6ca63bab.jpg",
  "https://d2xsxph8kpxj0f.cloudfront.net/310419663029819932/PLcAoykFsSXnZwd5KnAU3Y/iELn9dcEv3uV_fd683050.jpg",
  "https://d2xsxph8kpxj0f.cloudfront.net/310419663029819932/PLcAoykFsSXnZwd5KnAU3Y/q74aSfzt9j5n_a5e1bcc1.jpg",
  "https://d2xsxph8kpxj0f.cloudfront.net/310419663029819932/PLcAoykFsSXnZwd5KnAU3Y/sr2Zq4APXxw9_3b3bf9e6.jpeg",
  "https://d2xsxph8kpxj0f.cloudfront.net/310419663029819932/PLcAoykFsSXnZwd5KnAU3Y/ceIx8Ust2H4U_0cfac81d.jpg",
  "https://d2xsxph8kpxj0f.cloudfront.net/310419663029819932/PLcAoykFsSXnZwd5KnAU3Y/KJz6F2USPqQP_75899b04.png",
];

export default function HeroSection() {
  const [visible, setVisible] = useState(false);
  const [wordIdx, setWordIdx] = useState(0);
  const [wordVisible, setWordVisible] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 80);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setWordVisible(false);
      setTimeout(() => {
        setWordIdx((prev) => (prev + 1) % ROTATING_WORDS.length);
        setWordVisible(true);
      }, 350);
    }, 2400);
    return () => clearInterval(interval);
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
      {/* Video background */}
      <div style={{ position: "absolute", inset: 0, zIndex: 0 }}>
        <video autoPlay muted loop playsInline style={{ width: "100%", height: "100%", objectFit: "cover", opacity: 0.18 }}>
          <source src={HERO_VIDEO_URL} type="video/mp4" />
        </video>
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(250,248,245,0.08) 0%, rgba(250,248,245,0.05) 30%, rgba(250,248,245,0.75) 68%, rgba(250,248,245,1) 100%)" }} />
      </div>

      {/* Content */}
      <div style={{ position: "relative", zIndex: 1, width: "100%", maxWidth: 860, margin: "0 auto", padding: "clamp(100px, 14vh, 130px) clamp(1.5rem, 5vw, 4rem) 0", textAlign: "center" }}>
        {/* Badge */}
        <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(255,255,255,0.9)", backdropFilter: "blur(8px)", border: "1px solid #fed7aa", color: "#f97316", fontSize: 13, fontWeight: 600, padding: "6px 16px", borderRadius: 100, marginBottom: "2rem", boxShadow: "0 1px 4px rgba(0,0,0,0.06)", fontFamily: "'Plus Jakarta Sans', 'DM Sans', sans-serif", ...fade(0) }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#f97316", display: "inline-block", animation: "pulse-dot 2s infinite" }} />
          10 free analyses · No signup
        </div>

        {/* Rotating headline */}
        <h1 style={{ fontFamily: "'Plus Jakarta Sans', 'DM Sans', sans-serif", fontWeight: 800, fontSize: "clamp(2.8rem, 6.5vw, 5.2rem)", lineHeight: 1.05, letterSpacing: "-0.05em", color: "#1c1917", marginBottom: "1.5rem", ...fade(0.1) }}>
          Your feed.
          <span style={{ color: "#f97316", display: "block", transition: "opacity 0.35s ease, transform 0.35s ease", opacity: wordVisible ? 1 : 0, transform: wordVisible ? "translateY(0)" : "translateY(8px)" }}>
            {ROTATING_WORDS[wordIdx]}
          </span>
        </h1>

        {/* Subline */}
        <p style={{ fontSize: "clamp(15px, 1.8vw, 17px)", color: "#78716c", maxWidth: 520, margin: "0 auto 2.5rem", lineHeight: 1.75, fontFamily: "'DM Sans', sans-serif", fontWeight: 400, ...fade(0.2) }}>
          Send a link. Get back what actually matters.
          No fluff — just a sharp take and your next move, in 30 seconds.
        </p>

        {/* CTAs */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.75rem", marginBottom: "1.5rem", ...fade(0.3) }}>
          <CTAButton />
          <div style={{ display: "flex", alignItems: "center", gap: "1.25rem", flexWrap: "wrap", justifyContent: "center" }}>
            <a href="/dashboard" style={{ color: "#78716c", fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: 13, textDecoration: "none", borderBottom: "1px solid #d6d3d1", paddingBottom: 1, transition: "color 0.15s, border-color 0.15s" }}
              onMouseEnter={(e) => { const el = e.currentTarget; el.style.color = "#44403c"; el.style.borderBottomColor = "#78716c"; }}
              onMouseLeave={(e) => { const el = e.currentTarget; el.style.color = "#78716c"; el.style.borderBottomColor = "#d6d3d1"; }}
            >Open dashboard →</a>
            <span style={{ color: "#d6d3d1", fontSize: 12 }}>·</span>
            <a href="#how-it-works" style={{ color: "#a8a29e", fontFamily: "'DM Sans', sans-serif", fontWeight: 500, fontSize: 13, textDecoration: "none", transition: "color 0.15s" }}
              onMouseEnter={(e) => { (e.currentTarget).style.color = "#78716c"; }}
              onMouseLeave={(e) => { (e.currentTarget).style.color = "#a8a29e"; }}
            >See how it works ↓</a>
          </div>
        </div>

        {/* Social proof */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, marginBottom: "3.5rem", ...fade(0.4) }}>
          <div style={{ display: "flex" }}>
            {[{ bg: "#F97316", l: "A" }, { bg: "#8B5CF6", l: "M" }, { bg: "#10B981", l: "J" }, { bg: "#3B82F6", l: "K" }].map((u, i) => (
              <div key={i} style={{ width: 28, height: 28, borderRadius: "50%", border: "2px solid #faf8f5", background: u.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: "#fff", fontWeight: 700, marginLeft: i > 0 ? -8 : 0, fontFamily: "'DM Sans', sans-serif" }}>{u.l}</div>
            ))}
          </div>
          <span style={{ fontSize: 13, color: "#a8a29e", fontFamily: "'DM Sans', sans-serif" }}>
            Joined by <strong style={{ color: "#44403c" }}>2,400+</strong> creators &amp; founders
          </span>
        </div>
      </div>

      {/* Before → After visual */}
      <div style={{ position: "relative", zIndex: 1, width: "100%", maxWidth: 860, margin: "0 auto", padding: "0 clamp(1rem, 4vw, 2.5rem) clamp(3rem, 6vh, 5rem)", ...fade(0.5) }}>
        <div className="hero-before-after" style={{ display: "flex", alignItems: "center", gap: "clamp(16px, 3vw, 28px)", justifyContent: "center" }}>

          {/* LEFT: blurred grid */}
          <div style={{ flex: "0 0 auto", width: "min(240px, 65vw)" }}>
            <div style={{ borderRadius: 16, overflow: "hidden", boxShadow: "0 12px 40px rgba(0,0,0,0.13), 0 2px 8px rgba(0,0,0,0.07)", border: "1px solid #e7e2d9" }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 2, background: "#e7e2d9" }}>
                {GRID_IMAGES.map((url, i) => (
                  <div key={i} style={{ position: "relative", aspectRatio: "1", overflow: "hidden" }}>
                    <img src={url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", filter: "blur(3px) brightness(0.75)", transform: "scale(1.06)" }} loading="eager" />
                    <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.10)" }} />
                    <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <div style={{ width: 22, height: 22, borderRadius: "50%", background: "rgba(255,255,255,0.82)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <svg width="7" height="9" viewBox="0 0 8 10" fill="none"><path d="M1 1L7 5L1 9V1Z" fill="#1c1917"/></svg>
                      </div>
                    </div>
                    <div style={{ position: "absolute", top: 4, right: 4 }}>
                      <svg width="8" height="10" viewBox="0 0 9 12" fill="rgba(255,255,255,0.75)"><path d="M1 1h7v10L4.5 8.5 1 11V1z"/></svg>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <p style={{ textAlign: "center", fontSize: 10.5, color: "#b8b0a8", marginTop: "0.6rem", fontFamily: "'JetBrains Mono', monospace" }}>
              // 300+ saved. Opened: 5.
            </p>
          </div>

          {/* ARROW */}
          <div className="hero-arrow" style={{ flex: "0 0 auto", display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
            <svg width="40" height="20" viewBox="0 0 40 20" fill="none" style={{ flexShrink: 0 }}>
              <path d="M0 10 H32 M26 4 L38 10 L26 16" stroke="#F97316" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span style={{ fontSize: 9, color: "#c4bfbb", fontFamily: "'JetBrains Mono', monospace", whiteSpace: "nowrap" }}>30s</span>
          </div>

          {/* RIGHT: 3 stacked output cards */}
          <div style={{ flex: "1 1 0", minWidth: 0, maxWidth: 400, display: "flex", flexDirection: "column", gap: 8, width: "100%" }}>

            {/* Card 1 — Instagram, expanded with task */}
            <div style={{ background: "white", borderRadius: 14, border: "1px solid #e7e2d9", padding: "13px 15px", boxShadow: "0 8px 28px rgba(0,0,0,0.08), 0 2px 6px rgba(0,0,0,0.04)" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 7 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <div style={{ width: 18, height: 18, borderRadius: 5, background: "linear-gradient(135deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <svg width="9" height="9" viewBox="0 0 24 24" fill="white"><circle cx="12" cy="12" r="4.5"/><circle cx="17.5" cy="6.5" r="1" /><rect x="2" y="2" width="20" height="20" rx="5" fill="none" stroke="white" strokeWidth="1.5"/></svg>
                  </div>
                  <span style={{ fontSize: 9, fontWeight: 700, color: "#a8a29e", fontFamily: "'DM Sans', sans-serif", textTransform: "uppercase", letterSpacing: "0.08em" }}>Instagram</span>
                </div>
                <span style={{ fontSize: 9, fontWeight: 700, color: "#16a34a", background: "#f0fdf4", border: "1px solid #bbf7d0", padding: "2px 7px", borderRadius: 20, fontFamily: "'DM Sans', sans-serif" }}>Worth your time</span>
              </div>
              <div style={{ fontSize: 12, fontWeight: 800, color: "#1c1917", lineHeight: 1.3, marginBottom: 5, fontFamily: "'DM Sans', sans-serif" }}>Claude agent managers — one agent runs the rest</div>
              <div style={{ fontSize: 10.5, color: "#57534e", lineHeight: 1.55, fontStyle: "italic", marginBottom: 8, fontFamily: "'DM Sans', sans-serif" }}>This is the one. Orchestrator pattern cuts prompt complexity in half. The GitHub repo he flashes at 2:14 is the real takeaway — fork it before you do anything else.</div>
              <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 8 }}>
                {["claude ai", "tools", "dev"].map(t => <span key={t} style={{ fontSize: 9, color: "#78716c", background: "#f5f3f0", border: "1px solid #e7e2d9", borderRadius: 20, padding: "2px 7px", fontFamily: "'DM Sans', sans-serif" }}>{t}</span>)}
              </div>
              <div style={{ display: "flex", gap: 5, marginBottom: 7 }}>
                <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", color: "#16a34a", fontSize: 9, fontWeight: 700, padding: "4px 9px", borderRadius: 5, fontFamily: "'DM Sans', sans-serif" }}>✅ Added to tasks</div>
                <div style={{ background: "#fff7ed", border: "1px solid #fed7aa", color: "#ea580c", fontSize: 9, fontWeight: 700, padding: "4px 9px", borderRadius: 5, fontFamily: "'DM Sans', sans-serif" }}>⚡ Deep Dive</div>
              </div>
              <div style={{ background: "#fafaf8", border: "1px solid #e7e2d9", borderLeft: "2px solid #f97316", borderRadius: 5, padding: "5px 9px", display: "flex", alignItems: "center", gap: 5 }}>
                <div style={{ width: 10, height: 10, borderRadius: 2, border: "1.5px solid #d4cfc9", flexShrink: 0 }} />
                <span style={{ fontSize: 9.5, color: "#1c1917", fontFamily: "'DM Sans', sans-serif" }}>Set up agent manager pattern this week</span>
              </div>
            </div>

            {/* Card 2 — LinkedIn, compact */}
            <div style={{ background: "white", borderRadius: 14, border: "1px solid #e7e2d9", padding: "13px 15px", boxShadow: "0 4px 14px rgba(0,0,0,0.05)" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 7 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <div style={{ width: 18, height: 18, borderRadius: 5, background: "#0a66c2", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <svg width="9" height="9" viewBox="0 0 24 24" fill="white"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
                  </div>
                  <span style={{ fontSize: 9, fontWeight: 700, color: "#a8a29e", fontFamily: "'DM Sans', sans-serif", textTransform: "uppercase", letterSpacing: "0.08em" }}>LinkedIn</span>
                </div>
                <span style={{ fontSize: 9, fontWeight: 700, color: "#d97706", background: "#fffbeb", border: "1px solid #fde68a", padding: "2px 7px", borderRadius: 20, fontFamily: "'DM Sans', sans-serif" }}>Skim it</span>
              </div>
              <div style={{ fontSize: 12, fontWeight: 800, color: "#1c1917", lineHeight: 1.3, marginBottom: 5, fontFamily: "'DM Sans', sans-serif" }}>Why most SaaS pricing pages fail</div>
              <div style={{ fontSize: 10.5, color: "#57534e", lineHeight: 1.55, fontStyle: "italic", fontFamily: "'DM Sans', sans-serif" }}>Mid. He&apos;s rehashing a blog post from 2024. The one stat about anchoring is worth 30 seconds. Skip the rest.</div>
            </div>

            {/* Card 3 — X/Twitter, compact */}
            <div style={{ background: "white", borderRadius: 14, border: "1px solid #e7e2d9", padding: "13px 15px", boxShadow: "0 4px 14px rgba(0,0,0,0.05)" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 7 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <div style={{ width: 18, height: 18, borderRadius: 5, background: "#000", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <svg width="9" height="9" viewBox="0 0 24 24" fill="white"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.737-8.835L1.254 2.25H8.08l4.253 5.622 5.911-5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                  </div>
                  <span style={{ fontSize: 9, fontWeight: 700, color: "#a8a29e", fontFamily: "'DM Sans', sans-serif", textTransform: "uppercase", letterSpacing: "0.08em" }}>X / Twitter</span>
                </div>
                <span style={{ fontSize: 9, fontWeight: 700, color: "#16a34a", background: "#f0fdf4", border: "1px solid #bbf7d0", padding: "2px 7px", borderRadius: 20, fontFamily: "'DM Sans', sans-serif" }}>Worth your time</span>
              </div>
              <div style={{ fontSize: 12, fontWeight: 800, color: "#1c1917", lineHeight: 1.3, marginBottom: 5, fontFamily: "'DM Sans', sans-serif" }}>The Cursor AI workflow that 10x&apos;d my output</div>
              <div style={{ fontSize: 10.5, color: "#57534e", lineHeight: 1.55, fontStyle: "italic", fontFamily: "'DM Sans', sans-serif" }}>Solid. Tab completion + inline chat = 3x faster code reviews. This is your lane — the workflow maps directly to what you&apos;re building.</div>
            </div>

            <p style={{ textAlign: "center", fontSize: 10.5, color: "#b8b0a8", marginTop: "0.25rem", fontFamily: "'JetBrains Mono', monospace" }}>
              // your ContextDrop feed
            </p>
          </div>
        </div>
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
