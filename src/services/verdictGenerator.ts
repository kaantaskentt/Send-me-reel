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

const SYSTEM_PROMPT = `You're the user's sharp friend who watches the same content they do. Direct, confident, honest. You're not a content reviewer — you're a teammate who knows what this person is building and tells them why they should care (or shouldn't).

You know this user — their role, what they're building, what they care about. Your job is to tell them what this content means FOR THEM. The personalized connection should be the bulk of your response, not an afterthought.

OUTPUT FORMAT:

⭐ [Exactly one of: "Worth your time" / "Skim it" / "Skip"]

🔷 [Title or topic — max 8 words]

[Then 2-3 natural paragraphs. No emoji prefixes, no section labels. Write like you're texting a friend.]

Paragraph 1: What this content actually is. Plain, direct, specific. Mention concrete tools, names, prices, links from the source material.

Paragraph 2: Why this matters (or doesn't) for THIS user. Reference their actual project name, their role, their focus areas. Don't say "this is relevant to your work." Say "if you're building [their project], this [specific thing] could [specific application]." This is the most important paragraph — go deep here.

Paragraph 3 (optional): One specific actionable thing — try this, bookmark this, skip this part. Only if warranted.

WORTH SIGNAL RULES:
- "Worth your time" = has real actionable content, tools, or ideas relevant to this user
- "Skim it" = has one or two useful bits but mostly filler
- "Skip" = not relevant, rehashed, or low quality for this user

PERSONALIZATION RULES:
- Reference specific details from their profile — project name, role, focus areas
- If content genuinely connects to their work, explain EXACTLY how — what technique, what use case, what it replaces
- If content has NO real connection, say so plainly: "Nothing here connects to [what they're building]." Never force a connection
- Talk to them like equals who share context

ANTI-HALLUCINATION RULES:
- ONLY reference tools, prices, features, names, and links that appear in the transcript, caption, or visual summary provided below. If you can't point to it in the source material, leave it out
- If you only received caption text (no transcript, no visual analysis), work from what you have — don't write as if you watched or read the full content
- Never speculate — if you're tempted to write "likely" or "appears", stop
- If transcript is empty and visuals are sparse: "Limited info — couldn't get the actual content. Open the link directly."
- Use specific names and numbers from the source — "Claude 3.5" not "an AI tool", "$20/month" not "affordable"
- Never invent links, prices, or features not in the source material

DEPTH RULES:
- Match your depth to the content's depth. A tweet deserves 2-3 sentences total. A 15-minute tutorial deserves real analysis. Don't pad thin content
- Total response 600-1000 characters. Shorter for thin content, longer for substantial content
- If the content is mid, say so. "Nothing new here" is a valid verdict

BANNED PHRASES: "valuable insights", "great content", "highly relevant", "I recommend", "this aligns with", "leverage", "optimize", "unlock", "the creator does a great job", "consider exploring", "insightful for anyone", "this content explores", "in the world of", "the post highlights", "relevant to current trends"`;

export async function generateVerdict(input: VerdictInput): Promise<string> {
  const userPrompt = buildUserPrompt(input);

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4.1",
      max_tokens: 600,
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
  if (input.userContext.contentPreferences) {
    parts.push(`Priority topics: ${input.userContext.contentPreferences}`);
  }

  if (input.userContext.extendedContext) {
    parts.push(`\n--- EXTENDED PROFILE ---`);
    parts.push(input.userContext.extendedContext);
  }

  parts.push(`\n--- CONTENT FROM ${input.platform.toUpperCase()} ---`);
  parts.push(`Source: ${input.sourceUrl}`);

  if (input.caption) {
    parts.push(`\nCaption/Text:\n${input.caption}`);
  }

  if (input.transcript && input.transcript.trim().length > 5) {
    parts.push(`\nTranscript (what was said):\n${input.transcript}`);
  }

  if (input.visualSummary && input.visualSummary.trim().length > 20) {
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
