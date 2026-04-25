import OpenAI from "openai";
import { config } from "../config.js";

const openai = new OpenAI({ apiKey: config.openaiApiKey });

export type VerticalDecision = {
  inVertical: boolean;
  confidence: number; // 0–1
  reason: string;     // 1-line, surfaced to user when refused
};

const SYSTEM_PROMPT = `You are a URL vertical classifier for a product called ContextDrop.

ContextDrop is built for AI / tech / business / productivity content. Anything else (recipes, fashion, sports, entertainment, fitness, lifestyle, travel) is out of scope.

INPUT: a URL and (optionally) a small snippet of caption text.

OUTPUT: exactly one JSON object on a single line, no markdown, no commentary. Keys:
  in_vertical    — boolean. true if the URL is likely AI / tech / business / productivity content.
  confidence     — number from 0 to 1.
  reason         — short string. If in_vertical is false, name the apparent topic ("cooking content", "fashion reel", etc.) for the user-facing redirect message. If true, leave empty.

CALIBRATION:
- Err generous on the borderline. Productivity tips, business advice, marketing, design, no-code/maker content, software, podcasts about work, founder stories — all in_vertical:true.
- AI tools, LLMs, agents, prompts, MCPs, automations — clearly in_vertical:true.
- Recipes, fitness routines, fashion lookbooks, sports highlights, makeup, home decor, vacation vlogs, dance, comedy skits, music videos, celebrity gossip — in_vertical:false.
- News politics, philosophy, science non-tech — borderline; default to in_vertical:true unless clearly entertainment-coded.
- If the URL is ambiguous (no signal in the URL or caption), default to in_vertical:true with confidence 0.3 — let the analysis run.
- Only return in_vertical:false with confidence > 0.7 when you are clearly seeing non-vertical signals.

Do not output anything except the JSON line.`;

export async function classifyUrl(url: string, captionHint?: string): Promise<VerticalDecision> {
  const userMsg = captionHint
    ? `URL: ${url}\nCaption (partial): ${captionHint.slice(0, 300)}`
    : `URL: ${url}`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      max_tokens: 80,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userMsg },
      ],
    });

    const text = response.choices[0]?.message?.content?.trim();
    if (!text) {
      // Classifier failed silently — err generous, let analysis run.
      return { inVertical: true, confidence: 0, reason: "classifier returned empty" };
    }

    // Strip any code fences the model might add despite instructions
    const cleaned = text.replace(/^```(?:json)?\s*|\s*```$/g, "").trim();
    const parsed = JSON.parse(cleaned) as {
      in_vertical: boolean;
      confidence: number;
      reason: string;
    };

    return {
      inVertical: parsed.in_vertical,
      confidence: parsed.confidence,
      reason: parsed.reason ?? "",
    };
  } catch {
    // Any failure → let the analysis run. Better to occasionally analyse a
    // recipe than to refuse a borderline AI/business reel.
    return { inVertical: true, confidence: 0, reason: "classifier error" };
  }
}

/**
 * Decision threshold: only refuse when the classifier is BOTH out-of-vertical
 * AND confidence > 0.7. The asymmetry is deliberate — false positives (refusing
 * a borderline good link) cost much more than false negatives (analysing the
 * occasional recipe). transformation-plan §5.
 */
export function shouldRefuse(decision: VerticalDecision): boolean {
  return !decision.inVertical && decision.confidence > 0.7;
}
