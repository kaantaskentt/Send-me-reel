"use client";

interface Props { isFiltered: boolean; onClearFilters: () => void; }

export default function EmptyState({ isFiltered, onClearFilters }: Props) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "64px 24px", textAlign: "center", fontFamily: "'DM Sans', sans-serif" }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>{isFiltered ? "🔍" : "📭"}</div>
      <h3 style={{ fontSize: 18, fontWeight: 700, color: "#1c1917", marginBottom: 8, marginTop: 0 }}>
        {isFiltered ? "No results found" : "Your feed is empty"}
      </h3>
      <p style={{ fontSize: 14, color: "#a8a29e", maxWidth: 320, lineHeight: 1.6, marginBottom: 20 }}>
        {isFiltered
          ? "Try adjusting your filters or search query."
          : "Send a video link to the bot on Telegram or WhatsApp to get started."}
      </p>
      {isFiltered ? (
        <button onClick={onClearFilters}
          style={{ fontSize: 13, fontWeight: 700, color: "#f97316", background: "#fff7ed", border: "1px solid #fed7aa", padding: "10px 20px", borderRadius: 100, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>
          Clear filters
        </button>
      ) : (
        <a href="https://t.me/contextdrop2027bot" target="_blank" rel="noopener noreferrer"
          style={{ fontSize: 13, fontWeight: 700, color: "#fff", background: "#f97316", border: "none", padding: "10px 20px", borderRadius: 100, cursor: "pointer", textDecoration: "none", fontFamily: "'DM Sans', sans-serif" }}>
          📱 Open Telegram bot
        </a>
      )}
    </div>
  );
}
