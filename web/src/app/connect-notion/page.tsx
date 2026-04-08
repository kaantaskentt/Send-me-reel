"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function ConnectNotionContent() {
  const searchParams = useSearchParams();
  const analysisId = searchParams.get("analysisId") || "";

  const clientId = "33ad872b-594c-81bd-86f2-0037cd6b0623";
  const redirectUri = `${window.location.origin}/api/auth/notion/callback`;

  const notionAuthUrl = new URL("https://api.notion.com/v1/oauth/authorize");
  notionAuthUrl.searchParams.set("client_id", clientId);
  notionAuthUrl.searchParams.set("response_type", "code");
  notionAuthUrl.searchParams.set("owner", "user");
  notionAuthUrl.searchParams.set("redirect_uri", redirectUri);
  if (analysisId) {
    notionAuthUrl.searchParams.set("state", analysisId);
  }

  return (
    <div className="min-h-screen bg-[#0a0a0b] text-white flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center space-y-8">
        <div className="text-6xl">
          {"\ud83d\udcd3"}
        </div>

        <div className="space-y-3">
          <h1 className="text-2xl font-bold">
            Save to Notion
          </h1>
          <p className="text-zinc-400">
            Notion will ask you to select a page.
            Pick <span className="text-white font-medium">any page</span> — we&apos;ll
            create a ContextDrop folder inside it.
          </p>
        </div>

        <div className="bg-zinc-900 rounded-xl p-5 text-left space-y-4">
          <div className="flex items-start gap-3">
            <span className="text-blue-400 font-bold text-sm mt-0.5">1</span>
            <p className="text-sm text-zinc-300">
              Select <span className="text-white">a page</span> where ContextDrop can save
            </p>
          </div>
          <div className="flex items-start gap-3">
            <span className="text-blue-400 font-bold text-sm mt-0.5">2</span>
            <p className="text-sm text-zinc-300">
              Tap <span className="text-white">&quot;Allow access&quot;</span>
            </p>
          </div>
          <div className="flex items-start gap-3">
            <span className="text-blue-400 font-bold text-sm mt-0.5">3</span>
            <p className="text-sm text-zinc-300">
              We&apos;ll create a ContextDrop folder there — your analyses save automatically
            </p>
          </div>
        </div>

        <p className="text-xs text-zinc-500">
          We only access the page you select. Nothing else in your workspace is touched.
        </p>

        <a
          href={notionAuthUrl.toString()}
          className="block w-full py-3 px-4 bg-blue-500 hover:bg-blue-400 text-white font-semibold rounded-lg transition-colors text-center"
        >
          Continue to Notion
        </a>

        <p className="text-xs text-zinc-600">
          Takes about 10 seconds
        </p>
      </div>
    </div>
  );
}

export default function ConnectNotionPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#0a0a0b] text-white flex items-center justify-center">
        <p className="text-zinc-400">Loading...</p>
      </div>
    }>
      <ConnectNotionContent />
    </Suspense>
  );
}
