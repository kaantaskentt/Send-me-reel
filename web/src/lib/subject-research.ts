/**
 * Apr 26 — agentic understanding layer.
 *
 * Mirrors the bot's `src/services/subjectResearcher.ts`. Both projects need to
 * read the `subject_research` JSONB column off `analyses` and format it for
 * prompt injection in a consistent way.
 */

export type SubjectType = "tool" | "model" | "person" | "company" | "concept" | "repo";

export interface SubjectResearch {
  subject: string;
  type: SubjectType;
  summary: string;
  canonicalUrl: string | null;
  sourceUrls: string[];
  snippets: string[];
  fetchedAt: string;
}

/**
 * Format a subject_research blob for inclusion in a system or user prompt.
 * Returns "" when the blob is null or empty.
 */
export function formatSubjectResearchForPrompt(
  research: SubjectResearch | null | undefined,
): string {
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
