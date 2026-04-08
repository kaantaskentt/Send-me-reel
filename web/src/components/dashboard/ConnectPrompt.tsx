import { ArrowRight } from "lucide-react";
import { BOT_LINK } from "@/lib/constants";

const DASHBOARD_LINK = `${BOT_LINK}?start=dashboard`;

export default function ConnectPrompt() {
  return (
    <div style={{ minHeight: "100vh", background: "#faf8f5", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px", fontFamily: "'DM Sans', sans-serif" }}>
      <div style={{ width: "100%", maxWidth: 400, display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
        <div style={{ width: 56, height: 56, borderRadius: 16, background: "#fff7ed", border: "1px solid #fed7aa", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, marginBottom: 20 }}>🔒</div>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: "#1c1917", marginBottom: 10, marginTop: 0 }}>Open your dashboard</h1>
        <p style={{ fontSize: 14, color: "#78716c", lineHeight: 1.6, marginBottom: 28, marginTop: 0, maxWidth: 320 }}>
          Send{" "}
          <code style={{ background: "#f5f1eb", color: "#f97316", padding: "2px 7px", borderRadius: 6, fontSize: 13 }}>/dashboard</code>{" "}
          in the ContextDrop Telegram bot to get your personal sign-in link.
        </p>
        <a href={DASHBOARD_LINK} target="_blank" rel="noopener noreferrer"
          style={{ display: "inline-flex", alignItems: "center", gap: 10, background: "#f97316", color: "#fff", fontWeight: 700, fontSize: 15, padding: "13px 28px", borderRadius: 100, textDecoration: "none", marginBottom: 16 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12l-6.871 4.326-2.962-.924c-.643-.204-.657-.643.136-.953l11.57-4.461c.537-.194 1.006.131.833.941z" />
          </svg>
          Open Telegram bot
          <ArrowRight style={{ width: 15, height: 15 }} />
        </a>
        <a href="/" style={{ fontSize: 13, color: "#c4bdb5", textDecoration: "none" }}>← Back to home</a>
      </div>
    </div>
  );
}
