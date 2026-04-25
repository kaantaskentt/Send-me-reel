import OpenAI from "openai";
import { config } from "../config.js";
import type { ExtractedSubject } from "./subjectExtractor.js";

const openai = new OpenAI({ apiKey: config.openaiApiKey });

export interface SubjectResearch {
  subject: string;
  type: ExtractedSubject["type"];
  summary: string;
  canonicalUrl: string | null;
  sourceUrls: string[];
  snippets: string[];
  fetchedAt: string;
}

const RESEARCHER_PROMPT = `You research a named subject and return clean canonical context. The reader has saved a social-media post about this subject and we want to ground their experience with what the thing actually IS, not just what the post said about it.

Use the web_search tool to find:
- The canonical homepage / GitHub repo / official source
- A 1-2 sentence factual description of what it is
- Any specific identifying details (version numbers, benchmark scores, prices, dates) when relevant

Then output JSON with this exact shape (no markdown, no backticks):
{
  "summary": string,           // 1-2 sentences. Factual. What this thing IS, not "this is a post about X". <240 chars.
  "canonicalUrl": string|null, // The single best URL — official site, GitHub repo, or main reference. null if you couldn't find one.
  "sourceUrls": string[],      // Up to 3 URLs from the search results, in order of authority.
  "snippets": string[]         // Up to 3 short verbatim snippets (≤200 chars) from the search results.
}

Rules:
- Output ONLY the JSON object. No prose.
- Never invent URLs. Only include URLs the search returned.
- If the subject is ambiguous (e.g. multiple "Kimi" results), pick the AI/tech one when context implies it.
- If you can't confirm the subject exists / find anything reliable, return: { "summary": "", "canonicalUrl": null, "sourceUrls": [], "snippets": [] }
- Don't editorialise. No "powerful", "innovative", "key", "robust". Plain factual description.`;

/**
 * Research a subject using OpenAI's Responses API + web_search tool.
 * Returns null on failure — the verdict pipeline must continue without research.
 */
export async function researchSubject(
  subject: ExtractedSubject,
): Promise<SubjectResearch | null> {
  const query = buildSearchQuery(subject);

  try {
    const response = await openai.responses.create({
      model: "gpt-4.1",
      tools: [{ type: "web_search" }],
      input: [
        { role: "system", content: RESEARCHER_PROMPT },
        { role: "user", content: query },
      ],
      max_output_tokens: 600,
    });

    const text = extractOutputText(response);
    if (!text) return null;

    const parsed = parseJsonLoose(text);
    if (!parsed) return null;

    const summary = typeof parsed.summary === "string" ? parsed.summary.trim() : "";
    const canonicalUrl = typeof parsed.canonicalUrl === "string" ? parsed.canonicalUrl : null;
    const sourceUrls = Array.isArray(parsed.sourceUrls)
      ? parsed.sourceUrls.filter((u): u is string => typeof u === "string").slice(0, 3)
      : [];
    const snippets = Array.isArray(parsed.snippets)
      ? parsed.snippets.filter((s): s is string => typeof s === "string").slice(0, 3)
      : [];

    if (!summary && !canonicalUrl && sourceUrls.length === 0) {
      // Search returned nothing useful
      return null;
    }

    return {
      subject: subject.name,
      type: subject.type,
      summary,
      canonicalUrl,
      sourceUrls,
      snippets,
      fetchedAt: new Date().toISOString(),
    };
  } catch (err) {
    console.error("[subjectResearcher] failed:", err instanceof Error ? err.message : err);
    return null;
  }
}

function buildSearchQuery(subject: ExtractedSubject): string {
  const typeHint = {
    tool: "tool / open source project",
    model: "AI model",
    person: "person (AI / tech)",
    company: "company",
    concept: "concept / technique",
    repo: "GitHub repository",
  }[subject.type];

  const hint = subject.suggestedUrls.length > 0
    ? `\nThe post mentioned these URLs (treat as authoritative): ${subject.suggestedUrls.join(", ")}`
    : "";

  return `Research this subject: "${subject.name}" (${typeHint})${hint}\n\nUse web_search to find canonical context. Return the JSON object as specified.`;
}

function extractOutputText(response: { output_text?: string; output?: unknown }): string {
  // Responses API exposes a convenient `output_text` getter when only text was produced.
  if (typeof response.output_text === "string" && response.output_text.length > 0) {
    return response.output_text;
  }
  // Fallback: walk output items for text content.
  if (Array.isArray(response.output)) {
    const parts: string[] = [];
    for (const item of response.output as Array<{ type?: string; content?: unknown }>) {
      if (item?.type === "message" && Array.isArray(item.content)) {
        for (const c of item.content as Array<{ type?: string; text?: string }>) {
          if (c?.type === "output_text" && typeof c.text === "string") parts.push(c.text);
        }
      }
    }
    return parts.join("");
  }
  return "";
}

/**
 * Loose JSON parse — strips ```json fences if the model added them despite instruction.
 */
function parseJsonLoose(raw: string): Record<string, unknown> | null {
  let text = raw.trim();
  // Strip ```json … ``` fences if present
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) text = fence[1].trim();
  // Find the first {...} block
  const first = text.indexOf("{");
  const last = text.lastIndexOf("}");
  if (first === -1 || last === -1 || last <= first) return null;
  try {
    return JSON.parse(text.slice(first, last + 1));
  } catch {
    return null;
  }
}

/**
 * Format a SubjectResearch blob for injection into a system/user prompt.
 * Used by both the verdict generator and the premium chat surfaces.
 */
export function formatResearchForPrompt(research: SubjectResearch | null): string {
  if (!research || !research.summary) return "";

  const lines: string[] = [];
  lines.push(`--- SUBJECT RESEARCH (live web context, fetched ${research.fetchedAt}) ---`);
  lines.push(`Subject: ${research.subject}`);
  lines.push(`Type: ${research.type}`);
  if (research.canonicalUrl) lines.push(`Canonical: ${research.canonicalUrl}`);
  lines.push(`Summary: ${research.summary}`);
  if (research.snippets.length > 0) {
    lines.push(`\nSearch snippets (verbatim):`);
    for (const s of research.snippets) lines.push(`- ${s}`);
  }
  if (research.sourceUrls.length > 0) {
    lines.push(`\nSources: ${research.sourceUrls.join(", ")}`);
  }
  return lines.join("\n");
}
