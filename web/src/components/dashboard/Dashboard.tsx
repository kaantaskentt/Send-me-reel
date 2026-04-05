"use client";

import { useState, useEffect, useCallback } from "react";
import type { UserProfile, Analysis, AnalysisFeedResponse } from "@/lib/types";
import ProfileSidebar from "./ProfileSidebar";
import StatsBar from "./StatsBar";
import FilterBar from "./FilterBar";
import SearchBar from "./SearchBar";
import AnalysisCard from "./AnalysisCard";
import AnalysisDetail from "./AnalysisDetail";
import EmptyState from "./EmptyState";
import { Menu, X } from "lucide-react";

interface Props {
  userId: string;
  username: string;
}

export default function Dashboard({ userId, username }: Props) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [analyses, setAnalyses] = useState<Analysis[]>([]);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedAnalysis, setSelectedAnalysis] = useState<Analysis | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Filters
  const [intent, setIntent] = useState("all");
  const [platform, setPlatform] = useState("all");
  const [search, setSearch] = useState("");

  // Fetch profile
  useEffect(() => {
    fetch("/api/user")
      .then((r) => r.json())
      .then(setProfile)
      .catch(console.error);
  }, []);

  // Fetch analyses
  const fetchAnalyses = useCallback(
    async (pageNum: number, append = false) => {
      setLoading(true);
      const params = new URLSearchParams({
        page: String(pageNum),
        limit: "20",
      });
      if (intent !== "all") params.set("intent", intent);
      if (platform !== "all") params.set("platform", platform);
      if (search) params.set("search", search);

      const res = await fetch(`/api/analyses?${params}`);
      const data: AnalysisFeedResponse = await res.json();

      setAnalyses((prev) => (append ? [...prev, ...data.analyses] : data.analyses));
      setTotal(data.total);
      setHasMore(data.hasMore);
      setLoading(false);
    },
    [intent, platform, search],
  );

  useEffect(() => {
    setPage(1);
    fetchAnalyses(1);
  }, [fetchAnalyses]);

  // Fetch detail
  useEffect(() => {
    if (!selectedId) {
      setSelectedAnalysis(null);
      return;
    }
    fetch(`/api/analyses/${selectedId}`)
      .then((r) => r.json())
      .then(setSelectedAnalysis)
      .catch(console.error);
  }, [selectedId]);

  const loadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchAnalyses(nextPage, true);
  };

  // Stats
  const learnCount = analyses.filter((a) => a.verdict_intent === "learn").length;
  const applyCount = analyses.filter((a) => a.verdict_intent === "apply").length;

  return (
    <div className="dark min-h-screen bg-[#0a0a0b] text-white">
      {/* Top bar */}
      <header className="sticky top-0 z-50 bg-[#0a0a0b]/80 backdrop-blur-xl border-b border-zinc-800">
        <div className="flex items-center justify-between px-4 py-3 max-w-7xl mx-auto">
          <span className="text-lg font-bold tracking-tight">
            <span className="text-blue-400">Context</span>Drop
          </span>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="lg:hidden p-2 text-zinc-400 hover:text-white"
          >
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto flex">
        {/* Sidebar — desktop always, mobile toggle */}
        <aside
          className={`${
            sidebarOpen ? "block" : "hidden"
          } lg:block w-full lg:w-72 shrink-0 border-r border-zinc-800 p-4 lg:sticky lg:top-14 lg:h-[calc(100vh-3.5rem)] overflow-y-auto`}
        >
          {profile && (
            <ProfileSidebar
              user={profile.user}
              context={profile.context}
              credits={profile.credits}
            />
          )}
        </aside>

        {/* Main content */}
        <main className="flex-1 min-w-0">
          {selectedAnalysis ? (
            <AnalysisDetail
              analysis={selectedAnalysis}
              onBack={() => setSelectedId(null)}
            />
          ) : (
            <div className="p-4 space-y-4">
              <StatsBar total={total} learnCount={learnCount} applyCount={applyCount} />

              <SearchBar value={search} onChange={setSearch} />

              <FilterBar
                intent={intent}
                onIntentChange={setIntent}
                platform={platform}
                onPlatformChange={setPlatform}
              />

              {analyses.length === 0 && !loading ? (
                <EmptyState />
              ) : (
                <div className="space-y-3">
                  {analyses.map((a) => (
                    <AnalysisCard
                      key={a.id}
                      analysis={a}
                      onClick={() => setSelectedId(a.id)}
                    />
                  ))}

                  {hasMore && (
                    <button
                      onClick={loadMore}
                      className="w-full py-3 text-sm text-zinc-400 hover:text-white transition-colors"
                    >
                      Load more
                    </button>
                  )}
                </div>
              )}

              {loading && (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="h-28 bg-zinc-900 rounded-xl animate-pulse"
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
