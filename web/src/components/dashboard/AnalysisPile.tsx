"use client";

/**
 * Phase 3 — collapsible pile section. Replaces the flat scrolling feed at
 * the top of the dashboard. Each pile is closed by default; the count is
 * visible but never styled as a notification badge — saved-not-decided is
 * not "unread email", it's just saved.
 *
 * The user opens a pile when they want to look. Otherwise the dashboard
 * stays quiet — one thing visible, nothing else competing. Strategy.md §6.2
 */

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";
import type { Analysis, AnalysisState } from "@/lib/types";
import type { UserProfile } from "@/lib/types";
import AnalysisCard from "./AnalysisCard";

interface Props {
  title: string;
  subtitle?: string;
  analyses: Analysis[];
  profile: UserProfile | null;
  premiumTabsUnlocked: boolean;
  onDeleted: (id: string) => void;
  onStateChanged: (id: string, state: AnalysisState) => void;
  defaultOpen?: boolean;
}

export default function AnalysisPile({
  title,
  subtitle,
  analyses,
  profile,
  premiumTabsUnlocked,
  onDeleted,
  onStateChanged,
  defaultOpen = false,
}: Props) {
  const [open, setOpen] = useState(defaultOpen);
  const [openCardId, setOpenCardId] = useState<string | null>(null);

  if (analyses.length === 0) return null;

  return (
    <div style={{ marginTop: 8, fontFamily: "'DM Sans', sans-serif" }}>
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          width: "100%",
          background: "none",
          border: "none",
          padding: "10px 14px",
          display: "flex",
          alignItems: "center",
          gap: 10,
          cursor: "pointer",
          fontFamily: "inherit",
        }}
      >
        <motion.span
          animate={{ rotate: open ? 0 : -90 }}
          transition={{ duration: 0.18 }}
          style={{ display: "inline-flex", color: "#a8a29e" }}
        >
          <ChevronDown style={{ width: 14, height: 14 }} />
        </motion.span>
        <span style={{ fontSize: 13, color: "#57534e", fontWeight: 600 }}>
          {title}
        </span>
        <span style={{ fontSize: 12, color: "#a8a29e", fontWeight: 500 }}>
          ({analyses.length})
        </span>
        {subtitle && (
          <span style={{ fontSize: 11, color: "#a8a29e", marginLeft: "auto" }}>
            {subtitle}
          </span>
        )}
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="pile-body"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ height: { duration: 0.3, ease: [0.4, 0, 0.2, 1] }, opacity: { duration: 0.2 } }}
            style={{ overflow: "hidden" }}
          >
            <div style={{ display: "flex", flexDirection: "column", gap: 10, padding: "8px 0 4px" }}>
              {analyses.map((a) => (
                <AnalysisCard
                  key={a.id}
                  analysis={a}
                  isOpen={openCardId === a.id}
                  onToggle={() => setOpenCardId((p) => (p === a.id ? null : a.id))}
                  notionConnected={!!profile?.user.notion_access_token}
                  isPremium={!!profile?.user.premium}
                  premiumTabsUnlocked={premiumTabsUnlocked}
                  onDeleted={onDeleted}
                  onStateChanged={onStateChanged}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
