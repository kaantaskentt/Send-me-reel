"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X } from "lucide-react";
import type { Analysis, AnalysisFeedResponse, UserProfile, AnalysisState } from "@/lib/types";
import { getAnalysisState } from "@/lib/types";
import { parseVerdict } from "@/lib/verdict-parser";
import ProfileSidebar from "./ProfileSidebar";
import SearchBar from "./SearchBar";
import EmptyState from "./EmptyState";
import PasteLinkInput from "./PasteLinkInput";
import WeekHero from "./WeekHero";
import AnalysisCard from "./AnalysisCard";

// Apr 25 redesign — small filter-chip primitive, used for state + platform.
// State filter is the primary axis; platform is secondary (one click further).
function FilterChips({
  value,
  onChange,
  options,
  size = "md",
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string; count?: number }[];
  size?: "md" | "sm";
}) {
  const px = size === "sm" ? 10 : 12;
  const fz = size === "sm" ? 11 : 12;
  return (
    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
      {options.map((o) => {
        const active = value === o.value;
        return (
          <button
            key={o.value}
            onClick={() => onChange(o.value)}
            style={{
              padding: `5px ${px}px`,
              fontSize: fz,
              fontWeight: 600,
              color: active ? "#1c1917" : "#a8a29e",
              background: active ? "#fff" : "transparent",
              border: `1px solid ${active ? "#e7e2d9" : "transparent"}`,
              borderRadius: 100,
              cursor: "pointer",
              fontFamily: "'DM Sans', sans-serif",
              transition: "all 0.15s",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            {o.label}
            {typeof o.count === "number" && (
              <span style={{ fontSize: 10, color: active ? "#a8a29e" : "#c4bdb5", fontWeight: 500 }}>
                {o.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

function CardSkeleton() {
  return (
    <div style={{ borderRadius: 16, border: "1px solid #e7e2d9", background: "#fff", padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ width: 16, height: 16, borderRadius: 4, background: "#f0ebe4" }} />
        <div style={{ height: 10, width: 48, borderRadius: 100, background: "#f0ebe4" }} />
        <div style={{ height: 10, width: 60, borderRadius: 100, background: "#f0ebe4", marginLeft: "auto" }} />
      </div>
      <div style={{ height: 14, width: "70%", borderRadius: 100, background: "#f5f1eb" }} />
      <div style={{ height: 11, width: "90%", borderRadius: 100, background: "#f5f1eb" }} />
    </div>
  );
}

export default function Dashboard() {
  const searchParams = useSearchParams();
  const expandId = searchParams.get("expand");

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [analyses, setAnalyses] = useState<Analysis[]>([]);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  // expandId — /dashboard?expand=<id> from Telegram links opens that card.
  useEffect(() => {
    if (expandId && analyses.some((a) => a.id === expandId)) {
      setOpenCardId(expandId);
    }
  }, [expandId, analyses]);

  // Lock body scroll when mobile sidebar is open
  useEffect(() => {
    if (sidebarOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [sidebarOpen]);
  const [platform, setPlatform] = useState("all");
  const [search, setSearch] = useState("");
  // Apr 25 redesign — single chronological feed with state filter chips
  // replacing the three-pile structure. "All" by default = the user lands on
  // their full feed, just as Kaan asked.
  const [stateFilter, setStateFilter] = useState<"all" | AnalysisState>("all");
  const [openCardId, setOpenCardId] = useState<string | null>(null);

  // Hero card — dismissible with a localStorage flag. Once hidden, stays hidden
  // across sessions until the user clicks "show this week's pick" in the chip row.
  const [heroDismissed, setHeroDismissed] = useState<boolean>(false);
  useEffect(() => {
    try {
      const flag = typeof window !== "undefined" && localStorage.getItem("cd_hero_dismissed");
      if (flag === "1") setHeroDismissed(true);
    } catch { /* ignore */ }
  }, []);
  const dismissHero = () => {
    setHeroDismissed(true);
    try { localStorage.setItem("cd_hero_dismissed", "1"); } catch { /* ignore */ }
  };
  const restoreHero = () => {
    setHeroDismissed(false);
    try { localStorage.removeItem("cd_hero_dismissed"); } catch { /* ignore */ }
  };

  const isFiltered = platform !== "all" || search !== "" || stateFilter !== "all";

  useEffect(() => {
    fetch("/api/user").then((r) => r.json()).then(setProfile).catch(console.error);
  }, []);

  const fetchAnalyses = useCallback(async (pageNum: number, append = false) => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(pageNum), limit: "50" });
    if (platform !== "all") params.set("platform", platform);
    if (search) params.set("search", search);
    const res = await fetch(`/api/analyses?${params}`);
    const data: AnalysisFeedResponse = await res.json();
    setAnalyses((prev) => append ? [...prev, ...data.analyses] : data.analyses);
    setTotal(data.total);
    setHasMore(data.hasMore);
    setLoading(false);
  }, [platform, search]);

  useEffect(() => {
    setPage(1);
    fetchAnalyses(1);
  }, [fetchAnalyses]);

  const loadMore = () => { const next = page + 1; setPage(next); fetchAnalyses(next, true); };
  const handleDeleted = (id: string) => {
    setAnalyses((prev) => prev.filter((a) => a.id !== id));
    setTotal((t) => t - 1);
  };
  const clearFilters = () => { setPlatform("all"); setSearch(""); setStateFilter("all"); };

  // Phase 3 — local optimistic state changes. When a user toggles tried/set-aside,
  // the parent updates the analysis in-place so it re-buckets visually.
  const handleStateChanged = useCallback((id: string, state: AnalysisState) => {
    const now = new Date().toISOString();
    setAnalyses((prev) => prev.map((a) => {
      if (a.id !== id) return a;
      return {
        ...a,
        tried_at: state === "tried" ? now : null,
        set_aside_at: state === "set_aside" ? now : null,
      };
    }));
  }, []);

  // Apr 25 redesign — pick the hero candidate (most recent saved-not-decided
  // with an action line, last 7 days). Filter the main feed by stateFilter
  // chip choice. Counts feed the chip badges.
  const { hero, feed, counts } = useMemo(() => {
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const c = { all: analyses.length, saved: 0, tried: 0, set_aside: 0 };
    let heroPick: Analysis | null = null;
    let heroFallback: Analysis | null = null;

    for (const a of analyses) {
      const s = getAnalysisState(a);
      if (s === "tried") c.tried++;
      else if (s === "set_aside") c.set_aside++;
      else c.saved++;

      // Hero pick: most recent saved-not-decided in last 7d with an action.
      if (s === "saved") {
        const created = new Date(a.created_at).getTime();
        if (created >= sevenDaysAgo) {
          if (!heroFallback) heroFallback = a;
          if (!heroPick && a.verdict) {
            const parsed = parseVerdict(a.verdict);
            if (parsed.action && !parsed.noHomework) heroPick = a;
          }
        }
      }
    }

    const heroAnalysis = heroPick ?? heroFallback;

    // Feed = all analyses passing the active state filter, in chronological
    // (newest-first) order — the API already returns in that order.
    const filteredFeed = stateFilter === "all"
      ? analyses
      : analyses.filter((a) => getAnalysisState(a) === stateFilter);

    return { hero: heroAnalysis, feed: filteredFeed, counts: c };
  }, [analyses, stateFilter]);

  return (
    <div style={{ minHeight: "100vh", background: "#faf8f5", fontFamily: "'DM Sans', sans-serif" }}>
      <style>{`
        @media (max-width: 1023px) {
          .cd-sidebar { display: none !important; }
          .cd-sidebar.open { display: block !important; position: fixed !important; top: 56px !important; left: 0 !important; bottom: 0 !important; z-index: 40 !important; width: 280px !important; box-shadow: 8px 0 24px rgba(0,0,0,0.1) !important; }
          .cd-menu-btn { display: flex !important; }
          .cd-overlay { display: block !important; }
        }
        @media (min-width: 1024px) { .cd-sidebar { display: block !important; } .cd-menu-btn { display: none !important; } }
      `}</style>

      <header style={{ position: "sticky", top: 0, zIndex: 50, background: "rgba(250,248,245,0.88)", backdropFilter: "blur(16px)", borderBottom: "1px solid #e7e2d9" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "0 1.25rem", height: 56, maxWidth: 1280, margin: "0 auto" }}>
          <button className="cd-menu-btn" onClick={() => setSidebarOpen(!sidebarOpen)}
            style={{ display: "none", padding: 8, background: "none", border: "1px solid #e7e2d9", borderRadius: 10, cursor: "pointer", color: "#78716c", alignItems: "center", flexShrink: 0 }}>
            {sidebarOpen ? <X style={{ width: 18, height: 18 }} /> : <Menu style={{ width: 18, height: 18 }} />}
          </button>
          <a href="/" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 28, height: 28, borderRadius: 8, background: "#f97316", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <svg width="12" height="12" viewBox="0 0 14 14" fill="none"><path d="M2.5 7L6 10.5L11.5 3.5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </div>
            <span style={{ fontSize: 16, fontWeight: 800, letterSpacing: "-0.02em", fontFamily: "'DM Sans', sans-serif", color: "#1c1917" }}>
              Context<span style={{ color: "#f97316" }}>Drop</span>
            </span>
          </a>
        </div>
      </header>

      <div style={{ maxWidth: 1280, margin: "0 auto", display: "flex" }}>
        {/* Mobile overlay */}
        {sidebarOpen && (
          <div
            onClick={() => setSidebarOpen(false)}
            style={{ position: "fixed", inset: 0, top: 56, background: "rgba(0,0,0,0.2)", zIndex: 35, display: "none" }}
            className="cd-overlay"
          />
        )}
        <aside className={`cd-sidebar${sidebarOpen ? " open" : ""}`}
          style={{ width: 260, flexShrink: 0, borderRight: "1px solid #e7e2d9", padding: "1.5rem 1.25rem", position: "sticky", top: 56, height: "calc(100vh - 56px)", overflowY: "auto", background: "#fff" }}>
          {profile ? <ProfileSidebar profile={profile} /> : (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: "#f0ebe4" }} />
                <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
                  <div style={{ height: 12, background: "#f0ebe4", borderRadius: 100, width: "75%" }} />
                  <div style={{ height: 10, background: "#f5f1eb", borderRadius: 100, width: "50%" }} />
                </div>
              </div>
              <div style={{ height: 8, background: "#f5f1eb", borderRadius: 100 }} />
              <div style={{ height: 8, background: "#f5f1eb", borderRadius: 100, width: "85%" }} />
            </div>
          )}
        </aside>

        <main style={{ flex: 1, minWidth: 0, padding: "1.5rem", maxWidth: 720 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <PasteLinkInput onAnalyzed={() => fetchAnalyses(1)} />

            {/* Apr 25 redesign — dismissible hero. The user said the
                "this week's pick" placement felt weird and the feature
                might not even matter. Compromise: keep it (it's the one
                guided moment), but let them × it away. Once dismissed,
                a tiny "show this week's pick" link appears in the chip
                bar so it's restorable without being in the way. */}
            <AnimatePresence initial={false} mode="wait">
              {hero && !heroDismissed && (
                <motion.div
                  key={`hero-${hero.id}`}
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.25 }}
                  style={{ position: "relative" }}
                >
                  <WeekHero analysis={hero} onStateChanged={handleStateChanged} />
                  <button
                    onClick={dismissHero}
                    aria-label="Hide this week's pick"
                    title="Hide"
                    style={{
                      position: "absolute",
                      top: 12,
                      right: 12,
                      width: 28,
                      height: 28,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      background: "rgba(255,255,255,0.7)",
                      border: "1px solid #e7e2d9",
                      borderRadius: 100,
                      cursor: "pointer",
                      color: "#78716c",
                      backdropFilter: "blur(6px)",
                    }}
                  >
                    <X style={{ width: 14, height: 14 }} />
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* State filter — primary axis. "All" is the default so the
                user lands on their feed, not a sub-pile. Counts feed the
                chip badges but stay quiet (small, muted). */}
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  flexWrap: "wrap",
                  gap: 8,
                }}
              >
                <FilterChips
                  value={stateFilter}
                  onChange={(v) => setStateFilter(v as "all" | AnalysisState)}
                  options={[
                    { value: "all", label: "All", count: counts.all },
                    { value: "saved", label: "Saved", count: counts.saved },
                    { value: "tried", label: "Tried", count: counts.tried },
                    { value: "set_aside", label: "Set aside", count: counts.set_aside },
                  ]}
                />
                {hero && heroDismissed && (
                  <button
                    onClick={restoreHero}
                    style={{
                      fontSize: 11,
                      color: "#a8a29e",
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      padding: "4px 8px",
                      fontFamily: "'DM Sans', sans-serif",
                      textDecoration: "underline",
                    }}
                  >
                    show this week&apos;s pick
                  </button>
                )}
              </div>

              <SearchBar value={search} onChange={setSearch} />

              {/* Platform filter — secondary axis. Only shown when there's
                  enough variety to matter (>1 platform present). */}
              <FilterChips
                size="sm"
                value={platform}
                onChange={setPlatform}
                options={[
                  { value: "all", label: "All platforms" },
                  { value: "instagram", label: "Instagram" },
                  { value: "tiktok", label: "TikTok" },
                  { value: "youtube", label: "YouTube" },
                  { value: "twitter", label: "X" },
                  { value: "linkedin", label: "LinkedIn" },
                  { value: "article", label: "Article" },
                ]}
              />
            </div>

            {search && !loading && (
              <p style={{ fontSize: 12, color: "#a8a29e", margin: 0 }}>
                {total} result{total !== 1 ? "s" : ""} for &ldquo;{search}&rdquo;
              </p>
            )}

            {loading && analyses.length === 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>{[1,2,3].map((i) => <CardSkeleton key={i} />)}</div>
            ) : analyses.length === 0 ? (
              <EmptyState isFiltered={isFiltered} onClearFilters={clearFilters} />
            ) : feed.length === 0 ? (
              <div
                style={{
                  padding: "32px 20px",
                  textAlign: "center",
                  fontSize: 13,
                  color: "#a8a29e",
                  fontFamily: "'DM Sans', sans-serif",
                  background: "#fff",
                  border: "1px dashed #e7e2d9",
                  borderRadius: 16,
                }}
              >
                {stateFilter === "tried"
                  ? "Nothing tried yet."
                  : stateFilter === "set_aside"
                  ? "Nothing set aside yet."
                  : stateFilter === "saved"
                  ? "No saved items here."
                  : "No matches."}
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <AnimatePresence initial={false}>
                  {feed.map((a) => (
                    <motion.div
                      key={a.id}
                      layout
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                    >
                      <AnalysisCard
                        analysis={a}
                        notionConnected={!!profile?.user.notion_access_token}
                        isPremium={!!profile?.user.premium}
                        premiumTabsUnlocked={!!(profile as { premium_tabs_unlocked?: boolean } | null)?.premium_tabs_unlocked}
                        isOpen={openCardId === a.id}
                        onToggle={() => setOpenCardId((cur) => (cur === a.id ? null : a.id))}
                        onDeleted={handleDeleted}
                        onStateChanged={handleStateChanged}
                      />
                    </motion.div>
                  ))}
                </AnimatePresence>

                {hasMore && (
                  <div style={{ paddingTop: 12 }}>
                    <button onClick={loadMore} disabled={loading}
                      style={{ width: "100%", padding: 12, fontSize: 13, fontWeight: 600, color: "#a8a29e", background: "#fff", border: "1px solid #e7e2d9", borderRadius: 12, cursor: "pointer", fontFamily: "DM Sans, sans-serif" }}>
                      {loading ? "Loading…" : "Load older"}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
