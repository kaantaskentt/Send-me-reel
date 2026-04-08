"use client";

import { useState } from "react";
import type { UserProfile } from "@/lib/types";
import NotionSetup from "./NotionSetup";
import { User, Zap, ExternalLink } from "lucide-react";

interface Props {
  profile: UserProfile;
}

export default function ProfileSidebar({ profile }: Props) {
  const { user, context, credits } = profile;
  const [notionConnected, setNotionConnected] = useState(!!user.notion_access_token);
  const [showSetup, setShowSetup] = useState(false);

  const maxCredits = 10;
  const creditPct = Math.min(100, Math.round(((credits?.balance ?? 0) / maxCredits) * 100));
  const initials = (user.first_name ?? user.telegram_username ?? "?")
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="space-y-6">
      {/* Avatar + name */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white text-sm font-bold shrink-0 shadow-[0_0_0_1px_rgba(59,130,246,0.3)]">
          {initials}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-zinc-100 truncate">
            {user.first_name || user.telegram_username || "User"}
          </p>
          {user.telegram_username && (
            <p className="text-xs text-zinc-500 truncate">@{user.telegram_username}</p>
          )}
        </div>
      </div>

      {/* Context */}
      {context && (
        <div className="space-y-2.5">
          {context.role && (
            <div>
              <p className="text-[10px] text-zinc-600 uppercase tracking-widest font-medium mb-0.5">Role</p>
              <p className="text-xs text-zinc-300">{context.role}</p>
            </div>
          )}
          {context.goal && (
            <div>
              <p className="text-[10px] text-zinc-600 uppercase tracking-widest font-medium mb-0.5">Focus</p>
              <p className="text-xs text-zinc-300 leading-relaxed">{context.goal}</p>
            </div>
          )}
        </div>
      )}

      <div className="border-t border-zinc-800" />

      {/* Credits */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-yellow-400" />
            <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-medium">Credits</p>
          </div>
          <p className="text-xs font-semibold text-zinc-200">{credits?.balance ?? 0} left</p>
        </div>
        <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-blue-500 to-emerald-400 transition-all duration-500"
            style={{ width: `${creditPct}%` }}
          />
        </div>
        <p className="text-[10px] text-zinc-600 mt-1.5">{credits?.lifetime_used ?? 0} used lifetime</p>
      </div>

      <div className="border-t border-zinc-800" />

      {/* Notion */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <div className={`w-1.5 h-1.5 rounded-full ${notionConnected ? "bg-emerald-400" : "bg-zinc-600"}`} />
          <p className="text-xs text-zinc-400">
            Notion {notionConnected ? "connected" : "not connected"}
          </p>
        </div>
        {notionConnected && (
          <p className="text-[11px] text-zinc-600 mb-2">Workspace connected</p>
        )}
        {!notionConnected && !showSetup && (
          <button
            onClick={() => setShowSetup(true)}
            className="text-xs text-blue-400 hover:text-blue-300 transition-colors font-medium"
          >
            Connect Notion →
          </button>
        )}
        {showSetup && !notionConnected && (
          <NotionSetup onConnected={() => { setNotionConnected(true); setShowSetup(false); }} />
        )}
      </div>

      <div className="border-t border-zinc-800" />

      {/* Links */}
      <div className="space-y-1">
        <a href="/context" className="flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 transition-colors py-0.5 font-medium">
          <User className="w-3 h-3" /> Edit profile
        </a>
        <a href="https://t.me/contextdrop2027bot" target="_blank" rel="noopener noreferrer"
          className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 transition-colors py-0.5">
          <ExternalLink className="w-3 h-3" /> Open bot
        </a>
      </div>
    </div>
  );
}
