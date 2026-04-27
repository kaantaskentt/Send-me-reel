"use client";

import { useSearchParams } from "next/navigation";

const ERROR_MESSAGES: Record<string, string> = {
  expired_token: "Your sign-in link has expired.",
  auth_failed: "Sign-in failed. Please try again.",
  google_failed: "Google sign-in failed. Please try again.",
  google_no_token: "Google sign-in didn't complete. Please try again.",
  google_callback_failed: "Something went wrong with Google sign-in.",
  missing_token: "Invalid sign-in link.",
  account_not_found: "Account not found.",
};

export default function LoginContent({
  botDashboardLink,
}: {
  botDashboardLink: string;
}) {
  const searchParams = useSearchParams();
  const errorParam = searchParams.get("error");
  const errorMessage = errorParam ? ERROR_MESSAGES[errorParam] || "Something went wrong." : null;

  return (
    <div style={{ minHeight: "100vh", background: "#faf8f5", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, fontFamily: "'DM Sans', sans-serif" }}>
      <div style={{ width: "100%", maxWidth: 420, display: "flex", flexDirection: "column", alignItems: "center" }}>

        {/* Logo */}
        <div style={{ width: 48, height: 48, borderRadius: 14, background: "#f97316", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 20 }}>
          <svg width="20" height="20" viewBox="0 0 14 14" fill="none"><path d="M2.5 7L6 10.5L11.5 3.5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </div>

        <h1 style={{ fontSize: 24, fontWeight: 800, color: "#1c1917", textAlign: "center", margin: "0 0 6px 0" }}>
          Welcome to ContextDrop
        </h1>
        <p style={{ fontSize: 14, color: "#78716c", textAlign: "center", margin: "0 0 28px 0" }}>
          Sign in or create an account
        </p>

        {/* Error */}
        {errorMessage && (
          <div style={{ width: "100%", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 14, padding: "12px 16px", marginBottom: 20, textAlign: "center" }}>
            <p style={{ fontSize: 13, color: "#dc2626", margin: 0 }}>{errorMessage}</p>
          </div>
        )}

        {/* Google */}
        <a href="/api/auth/google" onClick={() => {
          const pendingUrl = searchParams.get("url");
          if (searchParams.get("next") === "/share" && pendingUrl) {
            document.cookie = `cd_pending_url=${encodeURIComponent(pendingUrl)}; path=/; max-age=600; SameSite=Lax`;
          }
        }} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, width: "100%", padding: "14px 24px", background: "#fff", color: "#1c1917", fontWeight: 600, fontSize: 14, borderRadius: 100, textDecoration: "none", boxSizing: "border-box", border: "1px solid #e7e2d9", marginBottom: 16, cursor: "pointer", transition: "all 0.15s" }}>
          <svg width="18" height="18" viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A11.96 11.96 0 0 0 0 12c0 1.94.46 3.77 1.28 5.4l3.56-2.77.01-.54z" fill="#FBBC05" />
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 1.09 14.97 0 12 0 7.7 0 3.99 2.47 2.18 6.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
          </svg>
          Continue with Google
        </a>

        {/* Divider */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, width: "100%", margin: "0 0 16px 0" }}>
          <div style={{ flex: 1, height: 1, background: "#f0ede8" }} />
          <span style={{ fontSize: 12, color: "#c4bdb5", fontWeight: 500 }}>or</span>
          <div style={{ flex: 1, height: 1, background: "#f0ede8" }} />
        </div>

        {/* Telegram */}
        <a href={botDashboardLink} target="_blank" rel="noopener noreferrer"
          style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, width: "100%", padding: "14px 24px", background: "#fff", color: "#44403c", fontWeight: 600, fontSize: 14, borderRadius: 100, textDecoration: "none", boxSizing: "border-box", border: "1px solid #e7e2d9", transition: "all 0.15s" }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="#229ED9"><path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12l-6.871 4.326-2.962-.924c-.643-.204-.657-.643.136-.953l11.57-4.461c.537-.194 1.006.131.833.941z" /></svg>
          Sign in via Telegram
        </a>

        <a href="/" style={{ marginTop: 24, fontSize: 13, color: "#c4bdb5", textDecoration: "none" }}>← Back to home</a>
      </div>
    </div>
  );
}
