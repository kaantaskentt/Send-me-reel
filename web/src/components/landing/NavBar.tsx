"use client";

/*
 * NavBar — Manus "Dark Signal" port (Apr 26)
 * Dark transparent → blurred-on-scroll. Orange "Start free" CTA → /signup.
 */

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";

export default function NavBar() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();
  const isInApp = pathname === "/dashboard" || pathname === "/chat";

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  return (
    <>
      <nav
        className="fixed top-0 left-0 right-0 z-50 transition-all duration-300"
        style={{
          background: scrolled ? "rgba(10,10,10,0.92)" : "transparent",
          backdropFilter: scrolled ? "blur(12px)" : "none",
          WebkitBackdropFilter: scrolled ? "blur(12px)" : "none",
          borderBottom: scrolled ? "1px solid rgba(255,255,255,0.08)" : "1px solid transparent",
        }}
      >
        <div className="cd-container flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-2 group" style={{ textDecoration: "none" }}>
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ background: "#F97316" }}
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M2.5 7L6 10.5L11.5 3.5" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <span
              className="text-white text-[1rem] tracking-tight"
              style={{ fontFamily: "'Inter', sans-serif", fontWeight: 700 }}
            >
              ContextDrop
            </span>
          </Link>

          <div className="hidden sm:flex items-center gap-7">
            {!isInApp && (
              <>
                <a
                  href="#preview"
                  className="text-[#A1A1AA] hover:text-white transition-colors duration-150 text-sm font-medium"
                >
                  How it works
                </a>
                <a
                  href="#pricing"
                  className="text-[#A1A1AA] hover:text-white transition-colors duration-150 text-sm font-medium"
                >
                  Pricing
                </a>
              </>
            )}
            {isInApp && (
              <Link
                href="/"
                className="text-[#A1A1AA] hover:text-white transition-colors duration-150 text-sm font-medium"
                style={{ textDecoration: "none" }}
              >
                ← Back to site
              </Link>
            )}
          </div>

          <div className="flex items-center gap-3">
            {!isInApp && (
              <Link
                href="/login"
                className="hidden sm:inline-flex text-sm text-[#71717A] hover:text-[#A1A1AA] transition-colors font-medium"
                style={{ textDecoration: "none" }}
              >
                Sign in
              </Link>
            )}

            {isInApp ? (
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold text-white transition-all duration-150"
                style={{ background: "#F97316", textDecoration: "none" }}
              >
                My Feed
              </Link>
            ) : (
              <Link
                href="/signup"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold text-white transition-all duration-150 hover:brightness-110 active:scale-95"
                style={{ background: "#F97316", textDecoration: "none" }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" className="flex-shrink-0">
                  <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12l-6.871 4.326-2.962-.924c-.643-.204-.657-.643.136-.953l11.57-4.461c.537-.194 1.006.131.833.941z"/>
                </svg>
                Start free
              </Link>
            )}

            <button
              className="sm:hidden flex flex-col gap-1 p-2"
              onClick={() => setMenuOpen(!menuOpen)}
              aria-label="Toggle menu"
            >
              <span className={`block w-5 h-0.5 bg-[#A1A1AA] transition-all duration-200 ${menuOpen ? "rotate-45 translate-y-1.5" : ""}`} />
              <span className={`block w-5 h-0.5 bg-[#A1A1AA] transition-all duration-200 ${menuOpen ? "opacity-0" : ""}`} />
              <span className={`block w-5 h-0.5 bg-[#A1A1AA] transition-all duration-200 ${menuOpen ? "-rotate-45 -translate-y-1.5" : ""}`} />
            </button>
          </div>
        </div>
      </nav>

      {menuOpen && (
        <div
          className="fixed inset-0 z-40 sm:hidden"
          style={{ background: "rgba(10,10,10,0.97)" }}
          onClick={() => setMenuOpen(false)}
        >
          <div className="flex flex-col items-center justify-center h-full gap-8" onClick={(e) => e.stopPropagation()}>
            {!isInApp && (
              <>
                <a
                  href="#preview"
                  className="text-white text-2xl font-semibold"
                  onClick={() => setMenuOpen(false)}
                >
                  How it works
                </a>
                <a
                  href="#pricing"
                  className="text-white text-2xl font-semibold"
                  onClick={() => setMenuOpen(false)}
                >
                  Pricing
                </a>
              </>
            )}
            <Link
              href="/signup"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-xl text-lg font-bold text-white"
              style={{ background: "#F97316", textDecoration: "none" }}
              onClick={() => setMenuOpen(false)}
            >
              Start free
            </Link>
          </div>
        </div>
      )}
    </>
  );
}
