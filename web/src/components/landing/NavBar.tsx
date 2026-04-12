"use client";

/*
 * NavBar — ContextDrop "Warm Signal" Design (ported from Manus's landing/)
 * Light background, orange CTA, clean minimal nav
 * Sticky with subtle border on scroll
 */

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

  // Check if user has a session cookie (client-side check)
  useEffect(() => {
    // The cd_session cookie is httpOnly so we can't read it directly.
    // Instead, do a lightweight check against the user API.
    fetch("/api/user").then((r) => {
      if (r.ok) setHasSession(true);
    }).catch(() => {});
  }, []);

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-white/90 backdrop-blur-md border-b border-[#f0ede8]"
          : "bg-transparent"
      }`}
    >
      <div style={{ maxWidth: 1040, margin: "0 auto", padding: "0 clamp(0.75rem, 3vw, 4rem)", display: "flex", alignItems: "center", height: 56 }}>
        <Link href="/" className="flex items-center gap-2 group" style={{ flexShrink: 0 }}>
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ background: "#F97316" }}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M2.5 7L6 10.5L11.5 3.5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <span
            className="text-[#1a1a1a] text-[1rem] tracking-tight"
            style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 700 }}
          >
            ContextDrop
          </span>
        </Link>

        <div className="hidden sm:flex items-center justify-center gap-7" style={{ flex: 1 }}>
          {!isInApp && (
            <>
              <a href="#how-it-works" className="animated-link text-slate-500 hover:text-slate-800 transition-colors text-sm" style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 500 }}>
                How it works
              </a>
              <a href="#pricing" className="animated-link text-slate-500 hover:text-slate-800 transition-colors text-sm" style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 500 }}>
                Pricing
              </a>
            </>
          )}
          {isInApp && (
            <Link href="/" className="animated-link text-slate-500 hover:text-slate-800 transition-colors text-sm" style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 500 }}>
              Back to site
            </Link>
          )}
        </div>

        <div className="flex items-center gap-3" style={{ flexShrink: 0 }}>
          {!isInApp && (
            <Link href={hasSession ? "/dashboard" : "/login"} className="hidden sm:inline-flex text-sm text-slate-500 hover:text-slate-800 transition-colors" style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 500 }}>
              {hasSession ? "Dashboard" : "Sign in"}
            </Link>
          )}
          {isInApp ? (
            <Link href="/dashboard" className="btn-primary !py-2 !px-4 !text-sm">
              My Feed
            </Link>
          ) : (
            <div className="flex items-center gap-2">
              <a href="https://t.me/contextdrop2027bot" target="_blank" rel="noopener noreferrer" className="btn-primary !py-2 !px-4 !text-sm">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12l-6.871 4.326-2.962-.924c-.643-.204-.657-.643.136-.953l11.57-4.461c.537-.194 1.006.131.833.941z"/>
                </svg>
                <span className="hidden sm:inline">Open in Telegram</span>
                <span className="sm:hidden">Telegram</span>
              </a>
              <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-semibold text-[#25D366] bg-[#f0fdf4] border border-[#bbf7d0] px-2 py-1 rounded-full">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="#25D366"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                Soon
              </span>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
