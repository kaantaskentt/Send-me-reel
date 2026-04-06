import OpenAI from "openai";
import { config } from "../config.js";
import { ServiceError } from "../pipeline/types.js";
import type { Platform, UserContext } from "../pipeline/types.js";

const openai = new OpenAI({ apiKey: config.openaiApiKey });

export interface VerdictInput {
  transcript: string | null;
  visualSummary: string;
  caption: string;
  metadata: Record<string, unknown>;
  userContext: UserContext;
  platform: Platform;
  sourceUrl: string;
}

const SYSTEM_PROMPT = `You are ContextDrop, an AI that breaks down social media content so users can understand what they saved. Your job: tell them what a piece of content contains, what's mentioned inside it, and help them decide if it's worth their time.

First, identify the content type: tool/product, tutorial, news, opinion, lifestyle, travel, recipe, how-to, or other. Adapt your language to match.

OUTPUT FORMAT:

🔷 [Topic/Name] — [one-line description of what this content is about]

🧠 [What it IS: plain English explanation of the core topic, concept, or product. If the user's profile is clearly relevant, mention the connection briefly. If not, don't force it.]

🔧 [What's INSIDE: the specific tools, products, steps, places, or resources mentioned in the content. Be concrete — names, prices, links if found.]

💡 [Real-world context: who's using this, why it matters, or a notable detail from the content. OMIT if nothing meaningful to add.]

🔗 [Primary link mentioned in the content. OMIT if none found.]
[Tags — only include if clearly applicable: 🆓 Free · 💰 Paid · 🔓 Open source · 💻 Runs locally · ☁️ Cloud only]

RULES:
- Write like you're explaining to a smart friend, not a technical reviewer
- Never use jargon without explaining it in the same sentence
- Never fabricate links, names, prices, or claims
- Only reference the user's profile when the connection is obvious and factual — generic-but-correct beats specific-but-wrong
- Keep the response under 800 characters (excluding emoji prefixes)
- Do NOT include ratings, scores, or relevance judgments — the user decides
- Do NOT add a "next step" or action suggestion — just explain what's in the content`;

export async function generateVerdict(input: VerdictInput): Promise<string> {
  const userPrompt = buildUserPrompt(input);

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4.1",
      max_tokens: 800,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
    });

    const text = response.choices[0]?.message?.content;
    if (!text) {
      throw new ServiceError("VERDICT_EMPTY", "OpenAI returned empty content");
    }

    return text;
  } catch (err) {
    if (err instanceof ServiceError) throw err;
    throw new ServiceError(
      "VERDICT_FAILED",
      `Failed to generate verdict: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
}

function buildUserPrompt(input: VerdictInput): string {
  const parts: string[] = [];

  parts.push(`--- USER CONTEXT ---`);
  parts.push(`Role: ${input.userContext.role}`);
  parts.push(`Current focus: ${input.userContext.goal}`);
  parts.push(`Priority topics: ${input.userContext.contentPreferences}`);

  if (input.userContext.extendedContext) {
    parts.push(`\n--- EXTENDED PROFILE ---`);
    parts.push(input.userContext.extendedContext);
  }

  parts.push(`\n--- CONTENT FROM ${input.platform.toUpperCase()} ---`);
  parts.push(`Source: ${input.sourceUrl}`);

  if (input.caption) {
    parts.push(`\nCaption/Text:\n${input.caption}`);
  }

  if (input.transcript) {
    parts.push(`\nTranscript (what was said):\n${input.transcript}`);
  }

  if (input.visualSummary) {
    parts.push(`\nVisual analysis (what was shown):\n${input.visualSummary}`);
  }

  const author =
    (input.metadata.authorName as string) ||
    (input.metadata.authorUsername as string);
  if (author) {
    parts.push(`\nCreator: ${author}`);
  }

  parts.push(
    `\nAnalyze this content and produce your verdict for this specific user.`,
  );

  return parts.join("\n");
}
