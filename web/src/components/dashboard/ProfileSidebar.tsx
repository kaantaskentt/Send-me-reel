"use client";

import type { User, UserContext, Credits } from "@/lib/types";

interface Props {
  user: User;
  context: UserContext | null;
  credits: Credits;
}

export default function ProfileSidebar({ user, context, credits }: Props) {
  const initial = (user.first_name?.[0] || "U").toUpperCase();
  const creditPercent = Math.min(100, (credits.balance / 10) * 100);

  return (
    <div className="space-y-6">
      {/* Avatar + name */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-blue-400 font-bold text-sm">
          {initial}
        </div>
        <div>
          <p className="font-semibold text-sm">{user.first_name || "User"}</p>
          {user.telegram_username && (
            <p className="text-xs text-zinc-500">@{user.telegram_username}</p>
          )}
        </div>
      </div>

      {/* Role + Focus */}
      {context && (
        <div className="space-y-2">
          <div>
            <p className="text-xs text-zinc-500 mb-0.5">Role</p>
            <p className="text-sm text-zinc-300">{context.role}</p>
          </div>
          <div>
            <p className="text-xs text-zinc-500 mb-0.5">Focus</p>
            <p className="text-sm text-zinc-300">{context.goal}</p>
          </div>
        </div>
      )}

      {/* Credits */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <p className="text-xs text-zinc-500">Credits</p>
          <p className="text-xs font-medium text-zinc-300">
            {credits.balance} remaining
          </p>
        </div>
        <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-500 rounded-full transition-all"
            style={{ width: `${creditPercent}%` }}
          />
        </div>
        <p className="text-xs text-zinc-600 mt-1">
          {credits.lifetime_used} used lifetime
        </p>
      </div>

      {/* Notion status */}
      <div className="flex items-center gap-2">
        <div
          className={`w-2 h-2 rounded-full ${
            user.notion_access_token ? "bg-emerald-400" : "bg-zinc-600"
          }`}
        />
        <span className="text-xs text-zinc-400">
          Notion {user.notion_access_token ? "connected" : "not connected"}
        </span>
      </div>

      {/* Links */}
      <div className="space-y-1 pt-2 border-t border-zinc-800">
        <a
          href="https://t.me/contextdrop2027bot?start=reset"
          className="block text-xs text-zinc-500 hover:text-zinc-300 transition-colors py-1"
        >
          Update profile in Telegram
        </a>
        <a
          href="https://t.me/contextdrop2027bot?start=notion"
          className="block text-xs text-zinc-500 hover:text-zinc-300 transition-colors py-1"
        >
          {user.notion_access_token
            ? "Reconnect Notion"
            : "Connect Notion"}
        </a>
      </div>
    </div>
  );
}
