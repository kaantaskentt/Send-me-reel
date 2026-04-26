/**
 * Apr 26 — agentic understanding layer audit.
 *
 * Pulls N existing analyses (raw scraped data + their currently stored
 * verdict), re-runs them through the NEW pipeline (subject extractor →
 * web research → Pass 1 + Pass 2), and writes the results to a markdown
 * file for review.
 *
 * No PII is exposed — we only read source_url, platform, transcript,
 * visual_summary, caption, metadata, verdict.
 *
 * Usage:
 *   npx tsx scripts/audit-new-pipeline.ts                    # 30 most recent (default)
 *   npx tsx scripts/audit-new-pipeline.ts --limit=10         # limit to 10
 *   npx tsx scripts/audit-new-pipeline.ts --chat=5           # simulate Chat on 5 of them
 *
 * Env: SUPABASE_URL, SUPABASE_SERVICE_KEY, OPENAI_API_KEY
 */

import "dotenv/config";
import { writeFile } from "node:fs/promises";
import { createClient } from "@supabase/supabase-js";
import OpenAI from "openai";
import { extractSubject } from "../src/services/subjectExtractor.js";
import { researchSubject, formatResearchForPrompt, type SubjectResearch } from "../src/services/subjectResearcher.js";
import { generateVerdict, renderForTelegram } from "../src/services/verdictGenerator.js";
import { HUMANIZER_RULES } from "../src/services/humanizerRules.js";
import type { Platform } from "../src/pipeline/types.js";

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY!;
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

const limitArg = process.argv.find((a) => a.startsWith("--limit="));
const chatArg = process.argv.find((a) => a.startsWith("--chat="));
const LIMIT = limitArg ? parseInt(limitArg.split("=")[1], 10) : 30;
const CHAT_COUNT = chatArg ? parseInt(chatArg.split("=")[1], 10) : 6;

interface AnalysisRow {
  id: string;
  source_url: string;
  platform: string;
  transcript: string | null;
  visual_summary: string | null;
  caption: string | null;
  metadata: Record<string, unknown> | null;
  verdict: string | null;
  created_at: string;
}

interface AuditEntry {
  index: number;
  url: string;
  platform: string;
  oldVerdict: string;
  subject: { name: string; type: string; confidence: number } | null;
  research: SubjectResearch | null;
  newVerdict: string;
  newVerdictTelegram: string;
  durationMs: { extract: number; research: number; verdict: number; total: number };
  chatTurn?: { question: string; answer: string; usedSearch: boolean; durationMs: number };
}

const SAMPLE_QUESTIONS = [
  "What's the smallest thing I could try?",
  "How do I install this?",
  "Is there a free version?",
  "What's the latest version?",
  "What would I miss if I just skimmed this?",
  "Give me a prompt I can paste into Claude Code.",
];

const CHAT_SYSTEM_PROMPT = `You're a friend who knows what the saved post is about — and you can look things up on the web when the reader's question reaches past what's in the source.

You don't know who the reader is. Don't assume their profession. Talk about the SUBJECT, not about them.

This is a conversation, not a report. Tight answers. Two or three short paragraphs at most for substantive questions, one paragraph for simple ones.

WHEN TO USE web_search:
- Reader asks for the latest version, current price, or live status.
- Reader asks "where is X" / "how do I install X" and the source didn't include it.
- A specific URL or fact would make the answer materially better and isn't in context.

WHEN NOT TO use web_search:
- Question is fully answerable from the existing context.
- General opinion / "what do you think" — answer from your read.

Guidelines:
- Be specific.
- If the answer isn't in the content AND a search wouldn't help, say so plainly: "wasn't covered."
- If implementable, give the exact first step / command / URL.
- Never invent links, prices, or features.

${HUMANIZER_RULES}`;

async function simulateChatTurn(
  analysis: AnalysisRow,
  research: SubjectResearch | null,
  newVerdict: string,
  question: string,
): Promise<{ answer: string; usedSearch: boolean; durationMs: number }> {
  const contextParts: string[] = ["\n--- CONTENT BEING DISCUSSED ---"];
  contextParts.push(`Platform: ${analysis.platform}`);
  contextParts.push(`URL: ${analysis.source_url}`);
  contextParts.push(`AI Verdict: ${newVerdict}`);
  if (analysis.transcript) contextParts.push(`Transcript: ${analysis.transcript.slice(0, 4000)}`);
  if (analysis.visual_summary) contextParts.push(`Visual summary: ${analysis.visual_summary.slice(0, 1500)}`);
  if (analysis.caption) contextParts.push(`Creator's caption: ${analysis.caption}`);
  const research_text = formatResearchForPrompt(research);
  if (research_text) contextParts.push(`\n${research_text}`);

  const t0 = Date.now();
  let usedSearch = false;
  let answer = "";

  const result = await openai.responses.create({
    model: "gpt-4.1",
    tools: [{ type: "web_search" }],
    input: [
      { role: "system", content: `${CHAT_SYSTEM_PROMPT}\n\n${contextParts.join("\n")}` },
      { role: "user", content: question },
    ],
    max_output_tokens: 800,
    stream: true,
  });

  for await (const event of result) {
    if (event.type === "response.output_text.delta") {
      answer += (event as { delta?: string }).delta ?? "";
    } else if (
      event.type === "response.web_search_call.in_progress" ||
      event.type === "response.web_search_call.searching"
    ) {
      usedSearch = true;
    }
  }

  return { answer: answer.trim(), usedSearch, durationMs: Date.now() - t0 };
}

async function main() {
  const supabase = createClient(supabaseUrl, supabaseKey);

  console.log(`Fetching ${LIMIT} most-recent completed analyses…`);
  const { data: rows, error } = await supabase
    .from("analyses")
    .select("id, source_url, platform, transcript, visual_summary, caption, metadata, verdict, created_at")
    .eq("status", "done")
    .not("verdict", "is", null)
    .order("created_at", { ascending: false })
    .limit(LIMIT);

  if (error) throw new Error(`Supabase error: ${error.message}`);
  if (!rows || rows.length === 0) {
    console.log("No analyses found.");
    return;
  }

  console.log(`Pulled ${rows.length} analyses. Running new pipeline on each…\n`);

  const entries: AuditEntry[] = [];
  let i = 0;
  for (const r of rows as AnalysisRow[]) {
    i++;
    console.log(`[${i}/${rows.length}] ${r.platform} :: ${r.source_url.slice(0, 60)}…`);
    const total0 = Date.now();

    let subject = null;
    let research = null;
    let newVerdict = "";
    let extractMs = 0;
    let researchMs = 0;
    let verdictMs = 0;

    try {
      const t1 = Date.now();
      subject = await extractSubject({
        caption: r.caption ?? "",
        transcript: r.transcript,
        visualSummary: r.visual_summary ?? "",
        platform: r.platform,
        sourceUrl: r.source_url,
        metadata: r.metadata ?? {},
      });
      extractMs = Date.now() - t1;

      if (subject) {
        const t2 = Date.now();
        research = await researchSubject(subject);
        researchMs = Date.now() - t2;
      }

      const t3 = Date.now();
      newVerdict = await generateVerdict({
        transcript: r.transcript,
        visualSummary: r.visual_summary ?? "",
        caption: r.caption ?? "",
        metadata: r.metadata ?? {},
        userContext: { role: "", goal: "" },
        platform: r.platform as Platform,
        sourceUrl: r.source_url,
        subjectResearch: research,
      });
      verdictMs = Date.now() - t3;
    } catch (err) {
      console.error(`  failed: ${err instanceof Error ? err.message : err}`);
      newVerdict = `[FAILED: ${err instanceof Error ? err.message : err}]`;
    }

    const entry: AuditEntry = {
      index: i,
      url: r.source_url,
      platform: r.platform,
      oldVerdict: r.verdict ?? "",
      subject: subject ? { name: subject.name, type: subject.type, confidence: subject.confidence } : null,
      research,
      newVerdict,
      newVerdictTelegram: newVerdict.startsWith("[FAILED") ? "" : renderForTelegram(newVerdict),
      durationMs: { extract: extractMs, research: researchMs, verdict: verdictMs, total: Date.now() - total0 },
    };

    // Simulate chat on the first CHAT_COUNT analyses
    if (i <= CHAT_COUNT && !newVerdict.startsWith("[FAILED")) {
      const question = SAMPLE_QUESTIONS[(i - 1) % SAMPLE_QUESTIONS.length];
      try {
        console.log(`  -> chat: "${question}"`);
        const chat = await simulateChatTurn(r as AnalysisRow, research, newVerdict, question);
        entry.chatTurn = { question, ...chat };
      } catch (err) {
        console.error(`  chat failed: ${err instanceof Error ? err.message : err}`);
      }
    }

    entries.push(entry);
  }

  // Aggregate stats
  const subjectFound = entries.filter((e) => e.subject).length;
  const researchSucceeded = entries.filter((e) => e.research).length;
  const verdictFailed = entries.filter((e) => e.newVerdict.startsWith("[FAILED")).length;
  const chatUsedSearch = entries.filter((e) => e.chatTurn?.usedSearch).length;
  const chatTotal = entries.filter((e) => e.chatTurn).length;
  const avgTotalMs = Math.round(entries.reduce((s, e) => s + e.durationMs.total, 0) / entries.length);

  console.log("\n===== AGGREGATE =====");
  console.log(`Total analyses:           ${entries.length}`);
  console.log(`Subject found:            ${subjectFound}/${entries.length}`);
  console.log(`Research succeeded:       ${researchSucceeded}/${entries.length}`);
  console.log(`Verdict failed:           ${verdictFailed}`);
  console.log(`Chat used web_search:     ${chatUsedSearch}/${chatTotal}`);
  console.log(`Avg pipeline duration:    ${avgTotalMs}ms`);

  // Write the markdown report
  const md: string[] = [];
  md.push(`# Pipeline audit — ${new Date().toISOString()}`);
  md.push(``);
  md.push(`**${entries.length} analyses re-run through the new pipeline.**`);
  md.push(``);
  md.push(`## Aggregate`);
  md.push(``);
  md.push(`| Metric | Value |`);
  md.push(`|---|---|`);
  md.push(`| Total analyses | ${entries.length} |`);
  md.push(`| Subject identified (≥0.6 conf) | ${subjectFound} (${Math.round(100 * subjectFound / entries.length)}%) |`);
  md.push(`| Research returned data | ${researchSucceeded} (${Math.round(100 * researchSucceeded / entries.length)}%) |`);
  md.push(`| Verdict generation failed | ${verdictFailed} |`);
  md.push(`| Chat used web_search | ${chatUsedSearch}/${chatTotal} |`);
  md.push(`| Avg pipeline duration | ${avgTotalMs}ms |`);
  md.push(``);

  for (const e of entries) {
    md.push(`---`);
    md.push(``);
    md.push(`## #${e.index} · ${e.platform}`);
    md.push(``);
    md.push(`**URL:** ${e.url}`);
    md.push(``);
    md.push(`**Subject extracted:** ${e.subject ? `\`${e.subject.name}\` (${e.subject.type}, conf ${e.subject.confidence.toFixed(2)})` : "_none — pipeline used post content alone_"}`);
    md.push(``);
    if (e.research) {
      md.push(`**Research summary:** ${e.research.summary}`);
      md.push(``);
      if (e.research.canonicalUrl) md.push(`**Canonical URL:** ${e.research.canonicalUrl}`);
      md.push(``);
    }
    md.push(`### Old verdict (currently stored)`);
    md.push(``);
    md.push("```");
    md.push(e.oldVerdict);
    md.push("```");
    md.push(``);
    md.push(`### New verdict`);
    md.push(``);
    md.push("```");
    md.push(e.newVerdict);
    md.push("```");
    md.push(``);
    md.push(`### What Telegram would show`);
    md.push(``);
    md.push("```");
    md.push(e.newVerdictTelegram);
    md.push("```");
    md.push(``);
    md.push(`**Timings:** extract ${e.durationMs.extract}ms · research ${e.durationMs.research}ms · verdict ${e.durationMs.verdict}ms · total ${e.durationMs.total}ms`);
    md.push(``);

    if (e.chatTurn) {
      md.push(`### Simulated Chat turn`);
      md.push(``);
      md.push(`> **You:** ${e.chatTurn.question}`);
      md.push(``);
      md.push(`${e.chatTurn.usedSearch ? "🔍 _the assistant used web_search before answering_" : "_(no web search needed)_"}`);
      md.push(``);
      md.push(e.chatTurn.answer);
      md.push(``);
    }
  }

  const outPath = "audit-results.md";
  await writeFile(outPath, md.join("\n"), "utf8");
  console.log(`\nReport written to ${outPath}`);
}

main().catch((err) => {
  console.error("Audit failed:", err);
  process.exit(1);
});
