"use client";

import { useState } from "react";

export default function NotionSetup({ onConnected }: { onConnected: () => void }) {
  const [token, setToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleConnect = async () => {
    if (!token.trim()) return;
    setLoading(true);
    setError("");

    const res = await fetch("/api/notion", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: token.trim() }),
    });

    const data = await res.json();

    if (!res.ok) {
      setError(data.error || "Failed to connect");
      setLoading(false);
      return;
    }

    setLoading(false);
    onConnected();
  };

  return (
    <div className="space-y-3">
      <p className="text-xs text-zinc-400">
        1. Go to{" "}
        <a
          href="https://www.notion.so/my-integrations"
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-400 underline"
        >
          notion.so/my-integrations
        </a>
      </p>
      <p className="text-xs text-zinc-400">
        2. Create an integration, copy the token
      </p>
      <p className="text-xs text-zinc-400">
        3. Share a Notion page with your integration
      </p>
      <p className="text-xs text-zinc-400">4. Paste the token below</p>

      <input
        type="password"
        value={token}
        onChange={(e) => setToken(e.target.value)}
        placeholder="ntn_..."
        className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-blue-500/50"
      />

      {error && <p className="text-xs text-red-400">{error}</p>}

      <button
        onClick={handleConnect}
        disabled={loading || !token.trim()}
        className="w-full py-2 px-3 bg-blue-500 hover:bg-blue-400 disabled:bg-zinc-700 disabled:text-zinc-500 text-white text-sm font-medium rounded-lg transition-colors"
      >
        {loading ? "Connecting..." : "Connect Notion"}
      </button>
    </div>
  );
}
