"use client";

export default function LoginContent({ botDashboardLink }: { botDashboardLink: string }) {
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
          maxWidth: 420,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 0,
        }}
      >
        {/* Logo */}
        <div
          style={{
            width: 52,
            height: 52,
            borderRadius: 14,
            background: "#f97316",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 24,
          }}
        >
          <svg width="22" height="22" viewBox="0 0 14 14" fill="none">
            <path
              d="M2.5 7L6 10.5L11.5 3.5"
              stroke="white"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        {/* Heading */}
        <h1
          style={{
            fontSize: 26,
            fontWeight: 800,
            color: "#1c1917",
            textAlign: "center",
            marginBottom: 10,
            marginTop: 0,
            lineHeight: 1.2,
          }}
        >
          Sign in to ContextDrop
        </h1>
        <p
          style={{
            fontSize: 15,
            color: "#78716c",
            textAlign: "center",
            marginBottom: 32,
            marginTop: 0,
            lineHeight: 1.6,
            maxWidth: 340,
          }}
        >
          We use magic links — no passwords. Your sign-in link is sent through
          the Telegram bot.
        </p>

        {/* Steps card */}
        <div
          style={{
            width: "100%",
            background: "#fff",
            border: "1px solid #f0ede8",
            borderRadius: 18,
            padding: "28px 28px",
            marginBottom: 24,
            boxShadow: "0 2px 12px rgba(0,0,0,0.04)",
          }}
        >
          {[
            {
              step: "1",
              icon: "📱",
              title: "Open the Telegram bot",
              desc: "Tap the button below to open ContextDrop in Telegram.",
            },
            {
              step: "2",
              icon: "💬",
              title: 'Type "/dashboard"',
              desc: "The bot will generate a personal sign-in link just for you.",
            },
            {
              step: "3",
              icon: "✅",
              title: "Tap your link",
              desc: "You'll be signed in automatically and taken to your feed.",
            },
          ].map(({ step, icon, title, desc }, i) => (
            <div
              key={step}
              style={{
                display: "flex",
                gap: 16,
                marginBottom: i < 2 ? 22 : 0,
              }}
            >
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  background: "#fff7ed",
                  border: "1px solid #fed7aa",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 16,
                  flexShrink: 0,
                }}
              >
                {icon}
              </div>
              <div style={{ flex: 1 }}>
                <p
                  style={{
                    fontSize: 14,
                    fontWeight: 700,
                    color: "#1c1917",
                    margin: "0 0 3px 0",
                  }}
                >
                  {title}
                </p>
                <p
                  style={{
                    fontSize: 13,
                    color: "#a8a29e",
                    margin: 0,
                    lineHeight: 1.5,
                  }}
                >
                  {desc}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Primary CTA */}
        <a
          href={botDashboardLink}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-primary"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 10,
            width: "100%",
            padding: "14px 24px",
            fontSize: 15,
            borderRadius: 100,
            textDecoration: "none",
            boxSizing: "border-box",
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12l-6.871 4.326-2.962-.924c-.643-.204-.657-.643.136-.953l11.57-4.461c.537-.194 1.006.131.833.941z" />
          </svg>
          Open Telegram bot
        </a>

        {/* Divider */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            width: "100%",
            margin: "20px 0",
          }}
        >
          <div style={{ flex: 1, height: 1, background: "#f0ede8" }} />
          <span style={{ fontSize: 12, color: "#c4bdb5", fontWeight: 500 }}>
            already have a link?
          </span>
          <div style={{ flex: 1, height: 1, background: "#f0ede8" }} />
        </div>

        {/* Manual token input */}
        <p style={{ fontSize: 13, color: "#a8a29e", textAlign: "center", margin: 0, lineHeight: 1.6 }}>
          If you already received a sign-in link from the bot, just click it
          directly — it will sign you in automatically.
        </p>

        {/* Back to home */}
        <a
          href="/"
          style={{
            marginTop: 28,
            fontSize: 13,
            color: "#c4bdb5",
            textDecoration: "none",
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          ← Back to home
        </a>
      </div>
    </div>
  );
}
