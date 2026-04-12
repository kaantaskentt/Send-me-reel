"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";

export default function NavBar() {
  const [scrolled, setScrolled] = useState(false);
  const [hasSession, setHasSession] = useState(false);
  const pathname = usePathname();
  const isInApp = pathname === "/dashboard" || pathname === "/chat";

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  useEffect(() => {
    fetch("/api/user").then((r) => { if (r.ok) setHasSession(true); }).catch(() => {});
  }, []);

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled ? "bg-white/90 backdrop-blur-md border-b border-[#f0ede8]" : "bg-transparent"
      }`}
    >
      <div style={{ maxWidth: 1040, margin: "0 auto", padding: "0 12px", display: "flex", alignItems: "center", justifyContent: "space-between", height: 52 }}>

        {/* Logo — compact on mobile */}
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: 6, textDecoration: "none", flexShrink: 0 }}>
          <div style={{ width: 26, height: 26, borderRadius: 7, background: "#F97316", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="12" height="12" viewBox="0 0 14 14" fill="none"><path d="M2.5 7L6 10.5L11.5 3.5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </div>
          <span className="hidden sm:inline" style={{ fontSize: 15, fontWeight: 700, color: "#1c1917", fontFamily: "'DM Sans', sans-serif" }}>ContextDrop</span>
        </Link>

        {/* Center nav — desktop only */}
        <div className="hidden md:flex items-center gap-7">
          {!isInApp && (
            <>
              <a href="#preview" className="animated-link text-slate-500 hover:text-slate-800 transition-colors text-sm" style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 500 }}>How it works</a>
              <a href="#pricing" className="animated-link text-slate-500 hover:text-slate-800 transition-colors text-sm" style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 500 }}>Pricing</a>
            </>
          )}
        </div>

        {/* Right side — responsive */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {/* Dashboard / Sign in — always visible */}
          {!isInApp && (
            <Link
              href={hasSession ? "/dashboard" : "/login"}
              style={{ fontSize: 12, fontWeight: 600, color: "#78716c", textDecoration: "none", padding: "6px 10px", borderRadius: 8, border: "1px solid #e7e2d9", fontFamily: "'DM Sans', sans-serif", transition: "all 0.15s" }}
            >
              {hasSession ? "Dashboard" : "Sign in"}
            </Link>
          )}

          {/* Telegram CTA */}
          {isInApp ? (
            <Link href="/dashboard" className="btn-primary !py-1.5 !px-3 !text-xs">My Feed</Link>
          ) : (
            <a href="https://t.me/contextdrop2027bot" target="_blank" rel="noopener noreferrer"
              style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "#f97316", color: "#fff", fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: 12, padding: "7px 14px", borderRadius: 100, textDecoration: "none", boxShadow: "0 2px 8px rgba(249,115,22,0.25)", transition: "all 0.15s", whiteSpace: "nowrap" }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12l-6.871 4.326-2.962-.924c-.643-.204-.657-.643.136-.953l11.57-4.461c.537-.194 1.006.131.833.941z"/>
              </svg>
              <span className="hidden sm:inline">Open in Telegram</span>
              <span className="sm:hidden">Telegram</span>
            </a>
          )}
        </div>
      </div>
    </nav>
  );
}
