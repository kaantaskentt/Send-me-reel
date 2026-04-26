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

const EXTRACTOR_PROMPT = `You read scraped social-media content and identify the SPECIFIC named thing the post is ABOUT.

THE GOLDEN RULE — prefer SPECIFIC over FAMOUS:

When a post is structured as "FAMOUS_BRAND launched/released X" or "FAMOUS_PERSON on TOPIC", the subject is X / TOPIC — NOT the famous brand or person. The famous name is just the speaker or publisher.

- "Anthropic launched the Claude Certified Architect program" → subject is "Claude Certified Architect", NOT "Anthropic"
- "Elon Musk announces TerraFab chip factory" → subject is "TerraFab", NOT "Elon Musk"
- "Sam Altman on founder clarity in 25 words" → subject is "Founder clarity in 25 words" (concept), NOT "Sam Altman"
- "Vibeyard, an open-source live-browser for Claude Code" → subject is "Vibeyard", NOT "Claude Code"

If the parent brand IS the subject (e.g. a news clip about Anthropic itself, a profile of Sam Altman, a company launch), then yes, the brand/person is the subject — but that's the exception, not the default.

Output JSON with this exact shape:
{
  "name": string,
  "type": "tool"|"model"|"person"|"company"|"concept"|"repo",
  "confidence": number,
  "suggestedUrls": string[]
}

When to return null (confidence 0, name ""):
- The post is generic motivational content or vague advice with no named thing.
- The post is news, event coverage, or a creative/visual piece (recipe, art, sport, athletic, music, ticket page) where any named brand or person is just BACKDROP — not the subject as a tool/product/concept.
- Examples that should return null: a food show called "Square Sambos" (the post is the recipe, not Square the fintech), a warehouse-fire news clip mentioning Kimberly-Clark, a yo-yo trick video, a climbing video, a ticket-sale page.

Examples:
- "Kimi K2.6 by Moonshot AI, SWE-Bench Pro 58.6..." → { "name": "Kimi K2.6", "type": "model", "confidence": 0.95, "suggestedUrls": [] }
- "Anthropic just launched the Claude Certified Architect program" → { "name": "Claude Certified Architect", "type": "concept", "confidence": 0.9, "suggestedUrls": [] }
- "Caveman walkthrough, github.com/JuliusBrussee/caveman" → { "name": "Caveman", "type": "tool", "confidence": 0.9, "suggestedUrls": ["https://github.com/JuliusBrussee/caveman"] }
- "Sam Altman: top founders explain their startups in under 25 words" → { "name": "Founder clarity in under 25 words", "type": "concept", "confidence": 0.7, "suggestedUrls": [] }
- "Elon Musk announces TerraFab — $20B chip factory" → { "name": "TerraFab", "type": "concept", "confidence": 0.7, "suggestedUrls": [] }
- Generic "5 productivity tips for founders" → { "name": "", "type": "concept", "confidence": 0.0, "suggestedUrls": [] }
- News clip about a warehouse arson at Kimberly-Clark → { "name": "", "type": "concept", "confidence": 0.0, "suggestedUrls": [] }
- Recipe video, art video, sports clip, ticket page → { "name": "", "type": "concept", "confidence": 0.0, "suggestedUrls": [] }

Rules:
- Prefer the specific announcement / feature / program / model / topic over the parent brand or person.
- If the post is news, event coverage, or creative content where any brand mention is incidental, return null.
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
