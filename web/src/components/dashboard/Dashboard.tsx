"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X } from "lucide-react";
import type { Analysis, AnalysisFeedResponse, UserProfile } from "@/lib/types";
import AnalysisCard from "./AnalysisCard";
import ProfileSidebar from "./ProfileSidebar";
import StatsBar from "./StatsBar";
import FilterBar from "./FilterBar";
import SearchBar from "./SearchBar";
import EmptyState from "./EmptyState";

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
  const [openId, setOpenId] = useState<string | null>(expandId);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [intent, setIntent] = useState("all");
  const [platform, setPlatform] = useState("all");
  const [search, setSearch] = useState("");

  const isFiltered = intent !== "all" || platform !== "all" || search !== "";

  useEffect(() => {
    fetch("/api/user").then((r) => r.json()).then(setProfile).catch(console.error);
  }, []);

  const fetchAnalyses = useCallback(async (pageNum: number, append = false) => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(pageNum), limit: "20" });
    if (intent !== "all") params.set("intent", intent);
    if (platform !== "all") params.set("platform", platform);
    if (search) params.set("search", search);
    const res = await fetch(`/api/analyses?${params}`);
    const data: AnalysisFeedResponse = await res.json();
    setAnalyses((prev) => append ? [...prev, ...data.analyses] : data.analyses);
    setTotal(data.total);
    setHasMore(data.hasMore);
    setLoading(false);
  }, [intent, platform, search]);

  useEffect(() => {
    setPage(1);
    setOpenId(null);
    fetchAnalyses(1);
  }, [fetchAnalyses]);

  const loadMore = () => { const next = page + 1; setPage(next); fetchAnalyses(next, true); };
  const handleToggle = (id: string) => setOpenId((prev) => (prev === id ? null : id));
  const handleDeleted = (id: string) => {
    setAnalyses((prev) => prev.filter((a) => a.id !== id));
    setTotal((t) => t - 1);
    if (openId === id) setOpenId(null);
  };
  const clearFilters = () => { setIntent("all"); setPlatform("all"); setSearch(""); };

  const learnCount = analyses.filter((a) => a.verdict_intent === "learn").length;
  const applyCount = analyses.filter((a) => a.verdict_intent === "apply").length;

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
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <StatsBar total={total} learnCount={learnCount} applyCount={applyCount} />
            <SearchBar value={search} onChange={setSearch} />
            <FilterBar intent={intent} onIntentChange={setIntent} platform={platform} onPlatformChange={setPlatform} />

            {search && !loading && (
              <p style={{ fontSize: 12, color: "#a8a29e" }}>{total} result{total !== 1 ? "s" : ""} for &ldquo;{search}&rdquo;</p>
            )}

            {loading && analyses.length === 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>{[1,2,3,4].map((i) => <CardSkeleton key={i} />)}</div>
            ) : analyses.length === 0 ? (
              <EmptyState isFiltered={isFiltered} onClearFilters={clearFilters} />
            ) : (
              <motion.div layout style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <AnimatePresence initial={false}>
                  {analyses.map((a, i) => (
                    <motion.div key={a.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04, duration: 0.2 }}>
                      <AnalysisCard analysis={a} isOpen={openId === a.id} onToggle={() => handleToggle(a.id)} notionConnected={!!profile?.user.notion_access_token} isPremium={!!profile?.user.premium} onDeleted={handleDeleted} />
                    </motion.div>
                  ))}
                </AnimatePresence>
                {hasMore && (
                  <div style={{ paddingTop: 8 }}>
                    <button onClick={loadMore} disabled={loading}
                      style={{ width: "100%", padding: 12, fontSize: 13, fontWeight: 600, color: "#a8a29e", background: "#fff", border: "1px solid #e7e2d9", borderRadius: 12, cursor: "pointer", fontFamily: "DM Sans, sans-serif" }}>
                      {loading ? "Loading…" : "Load more"}
                    </button>
                  </div>
                )}
                {loading && analyses.length > 0 && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>{[1,2,3].map((i) => <CardSkeleton key={`sk-${i}`} />)}</div>
                )}
              </motion.div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
