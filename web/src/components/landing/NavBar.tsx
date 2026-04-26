"use client";

/*
 * NavBar — Manus "Warm Signal" port (Apr 26)
 * Light bg with orange CTA, sticky with subtle border on scroll.
 */

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";

export default function NavBar() {
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();
  const isInApp = pathname === "/dashboard" || pathname === "/chat";

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-white/90 backdrop-blur-md border-b border-[#f0ede8]"
          : "bg-transparent"
      }`}
    >
      <div className="cd-container flex items-center justify-between h-16">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 group" style={{ textDecoration: "none" }}>
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

        {/* Center nav */}
        <div className="hidden sm:flex items-center gap-7">
          {!isInApp && (
            <>
              <a
                href="#how-it-works"
                className="cd-animated-link text-slate-500 hover:text-slate-800 transition-colors text-sm"
                style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 500 }}
              >
                How it works
              </a>
              <a
                href="#verdict"
                className="cd-animated-link text-slate-500 hover:text-slate-800 transition-colors text-sm"
                style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 500 }}
              >
                Example
              </a>
            </>
          )}
          {isInApp && (
            <Link
              href="/"
              className="cd-animated-link text-slate-500 hover:text-slate-800 transition-colors text-sm"
              style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 500, textDecoration: "none" }}
            >
              Back to site
            </Link>
          )}
        </div>

        {/* Right side CTAs */}
        <div className="flex items-center gap-3">
          {!isInApp && (
            <Link
              href="/login"
              className="hidden sm:inline-flex text-sm text-slate-500 hover:text-slate-800 transition-colors"
              style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 500, textDecoration: "none" }}
            >
              Sign in
            </Link>
          )}

          {isInApp ? (
            <Link
              href="/dashboard"
              className="cd-btn-primary !py-2 !px-4 !text-sm"
              style={{ textDecoration: "none" }}
            >
              My Feed
            </Link>
          ) : (
            <a
              href="https://t.me/contextdrop2027bot"
              target="_blank"
              rel="noopener noreferrer"
              className="cd-btn-primary !py-2 !px-4 !text-sm"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12l-6.871 4.326-2.962-.924c-.643-.204-.657-.643.136-.953l11.57-4.461c.537-.194 1.006.131.833.941z"/>
              </svg>
              Open in Telegram
            </a>
          )}
        </div>
      </div>
    </nav>
  );
}
