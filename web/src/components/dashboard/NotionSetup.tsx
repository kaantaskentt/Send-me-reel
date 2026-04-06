"use client";

const NOTION_CLIENT_ID = "33ad872b-594c-81bd-86f2-0037cd6b0623";

export default function NotionSetup({ onConnected }: { onConnected: () => void }) {
  const redirectUri = `${window.location.origin}/api/auth/notion/callback`;
  const authUrl = `https://api.notion.com/v1/oauth/authorize?client_id=${NOTION_CLIENT_ID}&response_type=code&owner=user&redirect_uri=${encodeURIComponent(redirectUri)}`;

  // Check if we just came back from Notion OAuth
  if (typeof window !== "undefined") {
    const params = new URLSearchParams(window.location.search);
    if (params.get("notion") === "connected") {
      onConnected();
    }
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-zinc-400">
        Connect your Notion workspace to save analyses directly to a database.
      </p>
      <a
        href={authUrl}
        className="w-full py-2 px-3 bg-blue-500 hover:bg-blue-400 text-white text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
      >
        <svg width="16" height="16" viewBox="0 0 100 100" fill="currentColor">
          <path d="M6.017 4.313l55.333-4.087c6.797-.583 8.543-.19 12.817 2.917l17.663 12.443c2.913 2.14 3.883 2.723 3.883 5.053v68.243c0 4.277-1.553 6.807-6.99 7.193L24.467 99.967c-4.08.193-6.023-.39-8.16-3.113L3.3 79.94c-2.333-3.113-3.3-5.443-3.3-8.167V11.113c0-3.497 1.553-6.413 6.017-6.8z" />
        </svg>
        Connect Notion
      </a>
      <p className="text-xs text-zinc-500 text-center">
        One click — takes 5 seconds
      </p>
    </div>
  );
}
