export default function PrivacyPage() {
  return (
    <div style={{ minHeight: "100vh", background: "#faf8f5", fontFamily: "'DM Sans', sans-serif" }}>
      <div style={{ maxWidth: 680, margin: "0 auto", padding: "80px 20px 60px" }}>
        <a href="/" style={{ color: "#f97316", fontSize: 13, fontWeight: 600, textDecoration: "none" }}>← Back</a>
        <h1 style={{ fontSize: 28, fontWeight: 800, color: "#1c1917", margin: "24px 0 8px", letterSpacing: "-0.02em" }}>Privacy Policy</h1>
        <p style={{ fontSize: 13, color: "#a8a29e", marginBottom: 32 }}>Last updated: April 12, 2026</p>

        <div style={{ display: "flex", flexDirection: "column", gap: 24, fontSize: 14, color: "#44403c", lineHeight: 1.75 }}>
          <section>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: "#1c1917", marginBottom: 8 }}>What we collect</h2>
            <p>When you use ContextDrop via Telegram, we store your Telegram user ID, first name, and username to identify your account. If you sign in with Google on the web dashboard, we also store your email address. We do not collect passwords.</p>
          </section>

          <section>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: "#1c1917", marginBottom: 8 }}>Content you send us</h2>
            <p>When you send a link, we temporarily download the video to extract audio and frames for analysis. Video files are deleted immediately after processing. We store the transcript, visual summary, and AI-generated verdict tied to your account so you can access them on your dashboard.</p>
          </section>

          <section>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: "#1c1917", marginBottom: 8 }}>How we use your data</h2>
            <p>Your profile information (role, focus, interests) is used solely to personalize your content breakdowns. We do not sell, share, or use your data for advertising. AI analysis is performed using OpenAI and Anthropic APIs — your content is sent to these providers for processing under their respective data policies.</p>
          </section>

          <section>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: "#1c1917", marginBottom: 8 }}>Notion integration</h2>
            <p>If you connect Notion, we store an access token scoped to the page you select. We only write to the ContextDrop database we create — we do not read or modify any other Notion content.</p>
          </section>

          <section>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: "#1c1917", marginBottom: 8 }}>Data deletion</h2>
            <p>You can clear your profile from the dashboard settings. To delete your account entirely, contact us via Telegram. We will remove all your data within 7 days.</p>
          </section>

          <section>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: "#1c1917", marginBottom: 8 }}>Contact</h2>
            <p>Questions? Reach out via <a href="https://t.me/contextdrop2027bot" style={{ color: "#f97316", textDecoration: "none", fontWeight: 600 }}>Telegram</a>.</p>
          </section>
        </div>
      </div>
    </div>
  );
}
