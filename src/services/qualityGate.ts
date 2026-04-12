import OpenAI from "openai";
import { config } from "../config.js";

const openai = new OpenAI({ apiKey: config.openaiApiKey });

export interface QualityInput {
  transcript: string | null;
  caption: string | null;
  visualSummary: string | null;
  platform: string;
  url: string;
}

export interface QualityDecision {
  proceed: boolean;
  strategy: "video" | "article" | "abort";
  reason: string;
}

const SYSTEM_PROMPT = `You're a content quality gate. You receive scraped data from a social media post and decide if it contains real, analyzable content.

Return JSON only:
{"proceed": true/false, "strategy": "video"|"article"|"abort", "reason": "..."}

Rules:
- If transcript + visual summary have real content about a topic → proceed: true, strategy: "video"
- If only caption has real content (image post, failed video extract) → proceed: true, strategy: "article"
- If content is a login page, auth wall, error page, rate limit page, cookie consent, or CAPTCHA → proceed: false, strategy: "abort"
- If all fields are empty or trivially short (<10 chars each) → proceed: false, strategy: "abort"
- If content is clearly platform UI (navigation menus, footer links, app store prompts) not user content → proceed: false, strategy: "abort"
- reason: one sentence explaining your decision, written for the end user (e.g. "Platform is blocking access — try again in a minute")`;

/**
 * Evaluate scraped content quality before generating a verdict.
 * Replaces all static content guards with a single AI decision.
 * Cost: ~$0.0001 per call. Latency: ~0.3s.
 */
export async function evaluateContent(input: QualityInput): Promise<QualityDecision> {
  // Fast path: if we clearly have good content, skip the AI call
  const transcriptLen = input.transcript?.trim().length || 0;
  const captionLen = input.caption?.trim().length || 0;
  const visualLen = input.visualSummary?.trim().length || 0;

  if (transcriptLen > 100 && visualLen > 50) {
    // Strong signal — both audio and visual have real content
    console.log(`[gate] Fast path: transcript=${transcriptLen} visual=${visualLen} → proceed`);
    return { proceed: true, strategy: "video", reason: "Strong content signal" };
  }

  // If everything is empty, fast abort — no need for AI
  if (transcriptLen === 0 && captionLen === 0 && visualLen === 0) {
    console.log(`[gate] Fast path: all empty → abort`);
    return { proceed: false, strategy: "abort", reason: "No content extracted from this link." };
  }

  // AI evaluation for ambiguous cases
  const parts: string[] = [];
  parts.push(`Platform: ${input.platform}`);
  parts.push(`URL: ${input.url}`);
  if (input.transcript) parts.push(`Transcript (first 200 chars): ${input.transcript.slice(0, 200)}`);
  if (input.caption) parts.push(`Caption (first 200 chars): ${input.caption.slice(0, 200)}`);
  if (input.visualSummary) parts.push(`Visual summary (first 200 chars): ${input.visualSummary.slice(0, 200)}`);

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      max_tokens: 80,
      temperature: 0,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: parts.join("\n") },
      ],
    });

    const text = response.choices[0]?.message?.content?.trim();
    if (!text) {
      // AI returned nothing — default to proceed (fail open, not closed)
      console.log(`[gate] AI returned empty — defaulting to proceed`);
      return { proceed: true, strategy: "video", reason: "Gate inconclusive — proceeding" };
    }

    const decision = JSON.parse(text) as QualityDecision;
    console.log(`[gate] Decision: proceed=${decision.proceed} strategy=${decision.strategy} reason="${decision.reason}"`);
    return decision;
  } catch (err) {
    // Gate failure should never block the pipeline — fail open
    console.error(`[gate] Error:`, err instanceof Error ? err.message : err);
    return { proceed: true, strategy: "video", reason: "Gate error — proceeding anyway" };
  }
}
