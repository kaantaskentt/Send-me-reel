"use client";

import { useState, useEffect, useCallback } from "react";
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
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4 space-y-3 animate-pulse">
      <div className="flex items-center gap-2">
        <div className="w-4 h-4 rounded bg-zinc-800" />
        <div className="h-3 w-12 rounded bg-zinc-800" />
        <div className="h-3 w-16 rounded bg-zinc-800 ml-auto" />
      </div>
      <div className="h-4 w-3/4 rounded bg-zinc-800" />
      <div className="h-3 w-full rounded bg-zinc-800" />
    </div>
  );
}

export default function Dashboard() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [analyses, setAnalyses] = useState<Analysis[]>([]);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState<string | null>(null);
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

  const loadMore = () => {
    const next = page + 1;
    setPage(next);
    fetchAnalyses(next, true);
  };

  const handleToggle = (id: string) => {
    setOpenId((prev) => (prev === id ? null : id));
  };

  const handleDeleted = (id: string) => {
    setAnalyses((prev) => prev.filter((a) => a.id !== id));
    setTotal((t) => t - 1);
    if (openId === id) setOpenId(null);
  };

  const clearFilters = () => {
    setIntent("all");
    setPlatform("all");
    setSearch("");
  };

  const learnCount = analyses.filter((a) => a.verdict_intent === "learn").length;
  const applyCount = analyses.filter((a) => a.verdict_intent === "apply").length;

  return (
    <div className="dark min-h-screen bg-[#09090b] text-white font-sans">
      {/* Top bar */}
      <header className="sticky top-0 z-50 bg-[#09090b]/80 backdrop-blur-xl border-b border-zinc-800/80">
        <div className="flex items-center justify-between px-4 h-14 max-w-7xl mx-auto">
          <a href="/" className="text-base font-bold tracking-tight">
            <span className="text-blue-400">Context</span>Drop
          </a>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="lg:hidden p-2 text-zinc-500 hover:text-white transition-colors rounded-lg hover:bg-zinc-800"
          >
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto flex">
        {/* Sidebar */}
        <aside
          className={`${
            sidebarOpen ? "block" : "hidden"
          } lg:block w-full lg:w-64 xl:w-72 shrink-0 border-r border-zinc-800/60 px-5 py-6 lg:sticky lg:top-14 lg:h-[calc(100vh-3.5rem)] overflow-y-auto`}
        >
          {profile ? (
            <ProfileSidebar profile={profile} />
          ) : (
            <div className="space-y-4 animate-pulse">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-zinc-800" />
                <div className="space-y-1.5 flex-1">
                  <div className="h-3 bg-zinc-800 rounded w-3/4" />
                  <div className="h-2.5 bg-zinc-800 rounded w-1/2" />
                </div>
              </div>
              <div className="h-2 bg-zinc-800 rounded" />
              <div className="h-2 bg-zinc-800 rounded w-5/6" />
            </div>
          )}
        </aside>

        {/* Feed */}
        <main className="flex-1 min-w-0 px-4 lg:px-8 py-6">
          <div className="max-w-2xl mx-auto space-y-5">
            {/* Stats */}
            <StatsBar total={total} learnCount={learnCount} applyCount={applyCount} />

            {/* Search */}
            <SearchBar value={search} onChange={setSearch} />

            {/* Filters */}
            <FilterBar intent={intent} onIntentChange={setIntent} platform={platform} onPlatformChange={setPlatform} />

            {/* Result count */}
            {search && !loading && (
              <p className="text-xs text-zinc-500">
                {total} result{total !== 1 ? "s" : ""} for &ldquo;{search}&rdquo;
              </p>
            )}

            {/* Cards */}
            {loading && analyses.length === 0 ? (
              <div className="space-y-3">
                {[1, 2, 3, 4].map((i) => <CardSkeleton key={i} />)}
              </div>
            ) : analyses.length === 0 ? (
              <EmptyState isFiltered={isFiltered} onClearFilters={clearFilters} />
            ) : (
              <motion.div layout className="space-y-3">
                <AnimatePresence initial={false}>
                  {analyses.map((a, i) => (
                    <motion.div
                      key={a.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.04, duration: 0.2 }}
                    >
                      <AnalysisCard
                        analysis={a}
                        isOpen={openId === a.id}
                        onToggle={() => handleToggle(a.id)}
                        notionConnected={!!profile?.user.notion_access_token}
                        onDeleted={handleDeleted}
                      />
                    </motion.div>
                  ))}
                </AnimatePresence>

                {/* Load more */}
                {hasMore && (
                  <div className="pt-2">
                    <button
                      onClick={loadMore}
                      disabled={loading}
                      className="w-full py-3 text-sm text-zinc-500 hover:text-zinc-300 border border-zinc-800 hover:border-zinc-700 rounded-xl transition-all disabled:opacity-50"
                    >
                      {loading ? "Loading…" : "Load more"}
                    </button>
                  </div>
                )}

                {/* Loading more skeletons */}
                {loading && analyses.length > 0 && (
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => <CardSkeleton key={`sk-${i}`} />)}
                  </div>
                )}
              </motion.div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
