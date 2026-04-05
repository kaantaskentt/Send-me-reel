"use client";

import { useState, useEffect } from "react";
import { ArrowLeft, Copy, Check, Save } from "lucide-react";
import Link from "next/link";

interface ContextData {
  role: string;
  goal: string;
  content_preferences: string;
  extended_context: string | null;
}

const AI_PROMPT = `I'm setting up my ContextDrop profile. ContextDrop is an AI that analyzes social media content (Reels, TikToks, articles) and gives me personalized insights based on who I am.

Please help me create a rich profile by asking me these questions one at a time. Wait for my answer before moving to the next question:

1. What's your role? (job title, experience level, industry)
2. What are you currently building or working on?
3. What tools and technologies do you use daily?
4. What are your top 3 learning priorities right now?
5. What type of content actually changes how you work? (tutorials, case studies, tool reviews, etc.)
6. Any specific topics the AI should always pay extra attention to?

After I answer all questions, compile everything into a clean profile that starts with "CONTEXTDROP PROFILE" — use short bullet points, no fluff.`;

export default function ContextEditor() {
  const [context, setContext] = useState<ContextData | null>(null);
  const [extendedContext, setExtendedContext] = useState("");
  const [role, setRole] = useState("");
  const [goal, setGoal] = useState("");
  const [preferences, setPreferences] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch("/api/context")
      .then((r) => r.json())
      .then((data) => {
        if (data.context) {
          setContext(data.context);
          setRole(data.context.role || "");
          setGoal(data.context.goal || "");
          setPreferences(data.context.content_preferences || "");
          setExtendedContext(data.context.extended_context || "");
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const copyPrompt = async () => {
    await navigator.clipboard.writeText(AI_PROMPT);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);

    await fetch("/api/context", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        role,
        goal,
        content_preferences: preferences,
        extended_context: extendedContext || null,
      }),
    });

    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  if (loading) {
    return (
      <div className="dark min-h-screen bg-[#0a0a0b] text-white flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="dark min-h-screen bg-[#0a0a0b] text-white">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#0a0a0b]/80 backdrop-blur-xl border-b border-zinc-800">
        <div className="flex items-center gap-3 px-4 py-3 max-w-3xl mx-auto">
          <Link
            href="/"
            className="p-2 -ml-2 text-zinc-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <span className="text-lg font-bold tracking-tight">
            <span className="text-blue-400">Context</span>Drop
          </span>
          <span className="text-sm text-zinc-500 ml-2">/ Your Profile</span>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8 space-y-8">
        {/* Hero */}
        <div>
          <h1 className="text-2xl font-bold mb-2">Make it personal</h1>
          <p className="text-zinc-400 text-sm leading-relaxed">
            The more ContextDrop knows about you, the better your verdicts get.
            Two people can send the same Reel and get completely different
            insights — one tailored to their AI agent project, the other to
            their marketing funnel.
          </p>
        </div>

        {/* Basic Profile */}
        <section className="space-y-4">
          <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider">
            Basic Profile
          </h2>
          <div className="space-y-3">
            <div>
              <label className="block text-xs text-zinc-500 mb-1">Role</label>
              <input
                type="text"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                placeholder="e.g. AI Engineer, Product Manager, CS Student..."
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-blue-500/50 transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs text-zinc-500 mb-1">
                Current Focus
              </label>
              <input
                type="text"
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
                placeholder="e.g. Building an AI-powered SaaS, Learning React..."
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-blue-500/50 transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs text-zinc-500 mb-1">
                Priority Topics
              </label>
              <input
                type="text"
                value={preferences}
                onChange={(e) => setPreferences(e.target.value)}
                placeholder="e.g. AI tools, startup growth, web development..."
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-blue-500/50 transition-colors"
              />
            </div>
          </div>
        </section>

        {/* Divider */}
        <div className="border-t border-zinc-800" />

        {/* Deep Profile */}
        <section className="space-y-4">
          <div>
            <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-1">
              Deep Profile (Optional)
            </h2>
            <p className="text-xs text-zinc-500 leading-relaxed">
              For even better personalization, have ChatGPT or Claude interview
              you and paste the result here.
            </p>
          </div>

          {/* Copy prompt card */}
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-zinc-300">
                  Step 1: Copy this prompt
                </p>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Paste it into ChatGPT or Claude. Answer the questions it asks
                  you.
                </p>
              </div>
              <button
                onClick={copyPrompt}
                className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 rounded-lg text-blue-400 text-xs font-medium transition-colors"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    Copy Prompt
                  </>
                )}
              </button>
            </div>
            <pre className="text-xs text-zinc-500 bg-zinc-950 rounded-lg p-3 overflow-x-auto whitespace-pre-wrap max-h-32 overflow-y-auto">
              {AI_PROMPT}
            </pre>
          </div>

          {/* Paste area */}
          <div>
            <p className="text-sm font-medium text-zinc-300 mb-2">
              Step 2: Paste the AI-generated profile here
            </p>
            <textarea
              value={extendedContext}
              onChange={(e) => setExtendedContext(e.target.value)}
              placeholder="Paste your CONTEXTDROP PROFILE here..."
              rows={10}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-blue-500/50 transition-colors resize-y"
            />
          </div>
        </section>

        {/* Save button */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleSave}
            disabled={saving || !role || !goal || !preferences}
            className="flex items-center gap-2 px-6 py-2.5 bg-blue-500 hover:bg-blue-400 disabled:bg-zinc-700 disabled:text-zinc-500 text-white font-medium rounded-full text-sm transition-colors"
          >
            {saving ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            {saving ? "Saving..." : "Save Profile"}
          </button>
          {saved && (
            <span className="text-sm text-emerald-400 animate-in fade-in">
              Profile saved! Your verdicts will now be more personalized.
            </span>
          )}
        </div>

        {/* Current profile preview */}
        {context && (
          <section className="space-y-3 pt-4 border-t border-zinc-800">
            <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider">
              Current Profile Preview
            </h2>
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 space-y-2 text-sm">
              <p>
                <span className="text-zinc-500">Role:</span>{" "}
                <span className="text-zinc-300">{context.role}</span>
              </p>
              <p>
                <span className="text-zinc-500">Focus:</span>{" "}
                <span className="text-zinc-300">{context.goal}</span>
              </p>
              <p>
                <span className="text-zinc-500">Priorities:</span>{" "}
                <span className="text-zinc-300">
                  {context.content_preferences}
                </span>
              </p>
              {context.extended_context && (
                <div className="pt-2 border-t border-zinc-800 mt-2">
                  <p className="text-zinc-500 text-xs mb-1">Deep Profile:</p>
                  <p className="text-zinc-400 text-xs whitespace-pre-wrap">
                    {context.extended_context}
                  </p>
                </div>
              )}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
