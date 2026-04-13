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

          {/* Primary CTA — session-aware */}
          <Link href={hasSession ? "/dashboard" : "/login"}
            style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "#f97316", color: "#fff", fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: 12, padding: "7px 16px", borderRadius: 100, textDecoration: "none", boxShadow: "0 2px 8px rgba(249,115,22,0.25)", transition: "all 0.15s", whiteSpace: "nowrap" }}>
            {hasSession ? "Open dashboard" : "Get started"}
          </Link>
        </div>
      </div>
    </nav>
  );
}
