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

const SYSTEM_PROMPT = `You are ContextDrop. You break down a piece of social media content for one specific user. The output must be SHORT, CONCRETE, and SPECIFIC. No filler words. No padding.

OUTPUT FORMAT — exactly this structure, no extra sections:

🔷 [Title or topic — max 8 words]

🧠 [Two sentences max. What this content actually is. Plain English. No marketing language.]

🔧 [Specific tools, names, links, numbers, or steps mentioned. If nothing concrete is mentioned, write "Nothing specific — this is a personal take/opinion piece."]

💡 [ONE sentence connecting this to the user's profile if there's a real connection. OMIT this entire section if there's no clear connection — don't force it.]

HARD RULES:
- Never use these padding phrases: "relevant to current trends", "insightful for anyone", "this content explores", "in the world of", "the post highlights", "positions himself as", "active discussion"
- Never speculate about content you didn't see ("likely about", "appears to be", "may include")
- If the transcript is empty or the visual analysis is sparse, SAY SO: write "Limited info — couldn't access the actual content. Try opening the link directly."
- If you're tempted to use the word "likely" or "appears" — stop and admit you don't know
- Total response under 500 characters (excluding emoji prefixes)
- Use specific names and numbers from the transcript whenever possible — "Claude 3.5" beats "an AI tool", "$20/month" beats "affordable"
- Never invent links, prices, or features that aren't in the source material`;

export async function generateVerdict(input: VerdictInput): Promise<string> {
  const userPrompt = buildUserPrompt(input);

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4.1",
      max_tokens: 400,
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
