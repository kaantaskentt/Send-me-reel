import OpenAI from "openai";
import { config } from "../config.js";

const openai = new OpenAI({ apiKey: config.openaiApiKey });

export type SubjectType = "tool" | "model" | "person" | "company" | "concept" | "repo";

export interface ExtractedSubject {
  name: string;
  type: SubjectType;
  confidence: number;
  suggestedUrls: string[];
}

export interface ExtractorInput {
  caption: string;
  transcript: string | null;
  visualSummary: string;
  platform: string;
  sourceUrl: string;
  metadata: Record<string, unknown>;
}

const EXTRACTOR_PROMPT = `You read scraped social-media content and identify what specific named thing the post is ABOUT.

Output JSON with this exact shape:
{
  "name": string,                   // The exact name of the subject (e.g. "Kimi K2.6", "Vibeyard", "Sam Altman")
  "type": "tool"|"model"|"person"|"company"|"concept"|"repo",
  "confidence": number,             // 0.0-1.0 — how sure you are this post is about a specific named subject
  "suggestedUrls": string[]         // any explicit URLs from the post that point to the canonical thing (github, official site)
}

If the post is generic motivational content, vague advice, or otherwise has no clear named subject, set confidence to 0 and name to "".

Examples:
- Post says "Kimi K2.6 by Moonshot AI..." → { "name": "Kimi K2.6", "type": "model", "confidence": 0.95, "suggestedUrls": [] }
- Post is a Caveman walkthrough mentioning github.com/JuliusBrussee/caveman → { "name": "Caveman", "type": "tool", "confidence": 0.9, "suggestedUrls": ["https://github.com/JuliusBrussee/caveman"] }
- Post is Sam Altman talking about how to start an AI company → { "name": "Sam Altman", "type": "person", "confidence": 0.85, "suggestedUrls": [] }
- Post is generic "5 productivity tips for founders" → { "name": "", "type": "concept", "confidence": 0.0, "suggestedUrls": [] }

Rules:
- Pick the SUBJECT, not the source. A reel ABOUT Kimi → subject is Kimi, not the reel author.
- If the post mentions multiple things, pick the one most central to the message.
- Confidence ≥ 0.6 means "yes, web search this." Below means "skip enrichment."
- Never invent URLs. Only include URLs that explicitly appear in the source text.
- Output ONLY valid JSON. No markdown, no backticks, no explanation.`;

export async function extractSubject(
  input: ExtractorInput,
): Promise<ExtractedSubject | null> {
  const sourceText = buildSourceText(input);

  // If we have nothing to work with, don't bother calling the model
  if (sourceText.trim().length < 20) {
    return null;
  }

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      max_tokens: 200,
      temperature: 0,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: EXTRACTOR_PROMPT },
        { role: "user", content: sourceText },
      ],
    });

    const text = response.choices[0]?.message?.content;
    if (!text) return null;

    const parsed = JSON.parse(text) as Partial<ExtractedSubject>;
    if (
      typeof parsed.name !== "string" ||
      typeof parsed.confidence !== "number" ||
      typeof parsed.type !== "string"
    ) {
      return null;
    }

    if (parsed.confidence < 0.6 || parsed.name.trim().length === 0) {
      return null;
    }

    return {
      name: parsed.name.trim(),
      type: parsed.type as SubjectType,
      confidence: parsed.confidence,
      suggestedUrls: Array.isArray(parsed.suggestedUrls) ? parsed.suggestedUrls.filter((u) => typeof u === "string") : [],
    };
  } catch (err) {
    console.error("[subjectExtractor] failed:", err instanceof Error ? err.message : err);
    return null;
  }
}

function buildSourceText(input: ExtractorInput): string {
  const parts: string[] = [`Platform: ${input.platform}`, `URL: ${input.sourceUrl}`];

  if (input.caption) parts.push(`\nCaption:\n${input.caption.slice(0, 1500)}`);
  if (input.transcript && input.transcript.length > 5) {
    parts.push(`\nTranscript:\n${input.transcript.slice(0, 2000)}`);
  }
  if (input.visualSummary && input.visualSummary.length > 20) {
    parts.push(`\nVisuals:\n${input.visualSummary.slice(0, 1000)}`);
  }
  const author = (input.metadata.authorName as string) || (input.metadata.authorUsername as string);
  if (author) parts.push(`\nCreator: ${author}`);

  return parts.join("\n");
}
