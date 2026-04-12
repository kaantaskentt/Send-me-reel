"use client";

interface Props {
  token: string;
  firstName: string;
  analysisCount: number;
}

export default function ClaimContent({ token, firstName, analysisCount }: Props) {
  const googleHref = `/api/auth/google?claim_token=${encodeURIComponent(token)}`;

  const headline =
    analysisCount > 0
      ? `Hey ${firstName} — save your ${analysisCount} ${analysisCount === 1 ? "analysis" : "analyses"}.`
      : `Hey ${firstName} — set up your account.`;

  const subhead =
    analysisCount > 0
      ? "Sign in with Google so you never lose your dashboard. Takes 3 seconds."
      : "Sign in with Google so your dashboard is permanently saved. Takes 3 seconds.";

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#faf8f5",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
        fontFamily: "'DM Sans', sans-serif",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 460,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        {/* Logo */}
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: 16,
            background: "#f97316",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 28,
          }}
        >
          <svg width="24" height="24" viewBox="0 0 14 14" fill="none">
            <path
              d="M2.5 7L6 10.5L11.5 3.5"
              stroke="white"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        {/* Headline */}
        <h1
          style={{
            fontSize: 26,
            fontWeight: 800,
            color: "#1c1917",
            textAlign: "center",
            marginBottom: 12,
            marginTop: 0,
            lineHeight: 1.2,
          }}
        >
          {headline}
        </h1>

        <p
          style={{
            fontSize: 15,
            color: "#78716c",
            textAlign: "center",
            marginBottom: 32,
            marginTop: 0,
            lineHeight: 1.6,
            maxWidth: 380,
          }}
        >
          {subhead}
        </p>

        {/* Google Sign-In */}
        <a
          href={googleHref}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 10,
            width: "100%",
            padding: "14px 24px",
            background: "#fff",
            color: "#1c1917",
            fontWeight: 600,
            fontSize: 15,
            borderRadius: 100,
            textDecoration: "none",
            boxSizing: "border-box",
            border: "1px solid #e7e2d9",
            marginBottom: 20,
            transition: "all 0.15s",
            cursor: "pointer",
            fontFamily: "'DM Sans', sans-serif",
            boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A11.96 11.96 0 0 0 0 12c0 1.94.46 3.77 1.28 5.4l3.56-2.77.01-.54z" fill="#FBBC05" />
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 1.09 14.97 0 12 0 7.7 0 3.99 2.47 2.18 6.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
          </svg>
          Continue with Google
        </a>

        {/* Reassurance */}
        <p
          style={{
            fontSize: 12,
            color: "#a8a29e",
            textAlign: "center",
            margin: 0,
            lineHeight: 1.6,
            maxWidth: 360,
          }}
        >
          Your Telegram bot stays connected. Same account, just permanent.
        </p>
      </div>
    </div>
  );
}
