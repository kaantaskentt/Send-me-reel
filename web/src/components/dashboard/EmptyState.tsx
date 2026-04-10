"use client";

interface Props { isFiltered: boolean; onClearFilters: () => void; }

function GhostCard() {
  return (
    <div style={{ background: "#fff", border: "1px solid #e7e2d9", borderRadius: 16, overflow: "hidden", opacity: 0.4, pointerEvents: "none", borderLeft: "3px solid #f97316" }}>
      <div style={{ padding: "14px 16px", display: "flex", alignItems: "flex-start", gap: 12 }}>
        <div style={{ width: 20, height: 20, borderRadius: 4, background: "#f0ebe4", flexShrink: 0, marginTop: 2 }} />
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <div style={{ height: 16, width: 48, borderRadius: 100, background: "#fed7aa" }} />
            <div style={{ height: 12, width: 40, borderRadius: 4, background: "#f0ebe4" }} />
          </div>
          <div style={{ height: 16, width: "75%", borderRadius: 4, background: "#f0ebe4", marginBottom: 6 }} />
          <div style={{ height: 12, width: "100%", borderRadius: 4, background: "#f5f1eb", marginBottom: 4 }} />
          <div style={{ height: 12, width: "66%", borderRadius: 4, background: "#f5f1eb" }} />
        </div>
        <div style={{ width: 16, height: 16, borderRadius: 4, background: "#f0ebe4", flexShrink: 0, marginTop: 2 }} />
      </div>
    </div>
  );
}

export default function EmptyState({ isFiltered, onClearFilters }: Props) {
  if (isFiltered) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "64px 24px", textAlign: "center", fontFamily: "'DM Sans', sans-serif" }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>🔍</div>
        <h3 style={{ fontSize: 18, fontWeight: 700, color: "#1c1917", marginBottom: 8, marginTop: 0 }}>No results found</h3>
        <p style={{ fontSize: 14, color: "#a8a29e", maxWidth: 320, lineHeight: 1.6, marginBottom: 20 }}>Try adjusting your filters or search query.</p>
        <button onClick={onClearFilters}
          style={{ fontSize: 13, fontWeight: 700, color: "#f97316", background: "#fff7ed", border: "1px solid #fed7aa", padding: "10px 20px", borderRadius: 100, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>
          Clear filters
        </button>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "48px 24px", textAlign: "center", fontFamily: "'DM Sans', sans-serif" }}>
      {/* Icon */}
      <div style={{ width: 56, height: 56, borderRadius: 16, background: "#fff7ed", border: "1px solid #fed7aa", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, marginBottom: 20 }}>
        ✨
      </div>

      {/* Copy */}
      <h3 style={{ fontSize: 18, fontWeight: 700, color: "#1c1917", marginBottom: 8, marginTop: 0 }}>Your feed is empty.</h3>
      <p style={{ fontSize: 14, color: "#a8a29e", maxWidth: 300, lineHeight: 1.6, marginBottom: 24 }}>
        Send your first link and your verdict will appear here in <strong style={{ color: "#44403c" }}>30 seconds</strong>.
      </p>

      {/* CTA */}
      <a href="https://t.me/contextdrop2027bot" target="_blank" rel="noopener noreferrer"
        style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 14, fontWeight: 700, color: "#fff", background: "#f97316", padding: "12px 24px", borderRadius: 100, textDecoration: "none", fontFamily: "'DM Sans', sans-serif", marginBottom: 8 }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12l-6.871 4.326-2.962-.924c-.643-.204-.657-.643.136-.953l11.57-4.461c.537-.194 1.006.131.833.941z" />
        </svg>
        Send a link on Telegram
      </a>
      <p style={{ fontSize: 11, color: "#c4bdb5", margin: 0 }}>Telegram</p>

      {/* Ghost card */}
      <div style={{ width: "100%", marginTop: 32 }}>
        <p style={{ fontSize: 10, color: "#d6d3d1", textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 600, marginBottom: 12 }}>Your first verdict will look like this</p>
        <GhostCard />
      </div>
    </div>
  );
}
