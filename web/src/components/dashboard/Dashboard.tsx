"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { Menu, X } from "lucide-react";
import type { Analysis, AnalysisFeedResponse, UserProfile, AnalysisState } from "@/lib/types";
import { getAnalysisState } from "@/lib/types";
import { parseVerdict } from "@/lib/verdict-parser";
import ProfileSidebar from "./ProfileSidebar";
import SearchBar from "./SearchBar";
import EmptyState from "./EmptyState";
import PasteLinkInput from "./PasteLinkInput";
import WeekHero from "./WeekHero";
import AnalysisPile from "./AnalysisPile";

// Phase 3 — platform-only filter. The intent filter (Learn/Apply) is retired
// in favour of the user-action axis (saved/tried/set_aside) at the pile level.
function PlatformFilter({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const options = [
    { value: "all", label: "All" },
    { value: "instagram", label: "Instagram" },
    { value: "tiktok", label: "TikTok" },
    { value: "x", label: "X" },
    { value: "linkedin", label: "LinkedIn" },
    { value: "youtube", label: "YouTube" },
    { value: "article", label: "Article" },
  ];
  return (
    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          style={{
            padding: "5px 12px",
            fontSize: 12,
            fontWeight: 600,
            color: value === o.value ? "#1c1917" : "#a8a29e",
            background: value === o.value ? "#fff" : "transparent",
            border: `1px solid ${value === o.value ? "#e7e2d9" : "transparent"}`,
            borderRadius: 100,
            cursor: "pointer",
            fontFamily: "'DM Sans', sans-serif",
            transition: "all 0.15s",
          }}
        >
          {o.label}
        </button>
      ))}
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
  // expandId still routes to the matching pile/card via the openCardId inside
  // AnalysisPile when the user navigates to /dashboard?expand=<id>. Phase 3
  // doesn't deep-link the hero — anything in the hero is already maximally visible.
  void expandId;

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

  const isFiltered = platform !== "all" || search !== "";

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
  const clearFilters = () => { setPlatform("all"); setSearch(""); };

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

  // Phase 3 — bucket by state and pick the hero.
  // Hero priority: most recent saved-not-decided analysis from the last 7
  // days that has a 🌱 action line. Falls back to most recent saved-not-decided.
  // Heuristic intentionally rough — tunes against tried-it data in Phase 6+.
  const { hero, savedRest, tried, setAside } = useMemo(() => {
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const buckets = { saved: [] as Analysis[], tried: [] as Analysis[], setAside: [] as Analysis[] };
    for (const a of analyses) {
      const s = getAnalysisState(a);
      if (s === "tried") buckets.tried.push(a);
      else if (s === "set_aside") buckets.setAside.push(a);
      else buckets.saved.push(a);
    }
    // Hero pick — newest-first iteration; first match wins.
    let pick: Analysis | null = null;
    let fallback: Analysis | null = null;
    for (const a of buckets.saved) {
      const created = new Date(a.created_at).getTime();
      if (created < sevenDaysAgo) continue;
      if (!fallback) fallback = a;
      if (!a.verdict) continue;
      const parsed = parseVerdict(a.verdict);
      if (parsed.action && !parsed.noHomework) {
        pick = a;
        break;
      }
    }
    const heroPick = pick ?? fallback;
    const rest = heroPick ? buckets.saved.filter((a) => a.id !== heroPick.id) : buckets.saved;
    return { hero: heroPick, savedRest: rest, tried: buckets.tried, setAside: buckets.setAside };
  }, [analyses]);

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

            {/* Phase 3 hero — "this week's one thing". Replaces the old StatsBar
                + intent filter + flat feed at the top. The user lands and sees
                ONE thing. (transformation-plan §8) */}
            {hero && (
              <WeekHero analysis={hero} onStateChanged={handleStateChanged} />
            )}

            {/* Search + platform filter — kept because finding a specific saved
                link by platform is a real use, not a judgement axis. */}
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <SearchBar value={search} onChange={setSearch} />
              <PlatformFilter value={platform} onChange={setPlatform} />
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
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {/* Three piles, all collapsed by default. Counts visible but
                    never styled as notification badges. (transformation-plan §8) */}
                <AnalysisPile
                  title="Still saved"
                  analyses={savedRest}
                  profile={profile}
                  premiumTabsUnlocked={!!(profile as { premium_tabs_unlocked?: boolean } | null)?.premium_tabs_unlocked}
                  onDeleted={handleDeleted}
                  onStateChanged={handleStateChanged}
                />
                <AnalysisPile
                  title="Tried"
                  subtitle="things you actually tried"
                  analyses={tried}
                  profile={profile}
                  premiumTabsUnlocked={!!(profile as { premium_tabs_unlocked?: boolean } | null)?.premium_tabs_unlocked}
                  onDeleted={handleDeleted}
                  onStateChanged={handleStateChanged}
                />
                <AnalysisPile
                  title="Set aside"
                  subtitle="watched, no homework"
                  analyses={setAside}
                  profile={profile}
                  premiumTabsUnlocked={!!(profile as { premium_tabs_unlocked?: boolean } | null)?.premium_tabs_unlocked}
                  onDeleted={handleDeleted}
                  onStateChanged={handleStateChanged}
                />

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
