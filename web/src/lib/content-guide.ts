import type { Analysis } from "./types";

export type ContentChoice = {
  id: string;
  label: string;
  detail: string;
  kind: "ask" | "prepare_task";
  request: string;
  mode: "research" | "build" | "automate" | "create";
  executor: "browser" | "terminal";
};
export type ContentGuide = {
  version: 3;
  analysisId: string;
  title: string;
  summary: string;
  choices: ContentChoice[];
  evidence: number[];
};

export const contentGuideSchema = {
  type: "object", additionalProperties: false,
  required: ["title", "summary", "choices", "evidence"],
  properties: {
    title: { type: "string" }, summary: { type: "string" },
    choices: { type: "array", minItems: 3, maxItems: 3, items: {
      type: "object", additionalProperties: false,
      required: ["label", "detail", "kind", "request", "mode", "executor"],
      properties: {
        label: { type: "string" }, detail: { type: "string" },
        kind: { type: "string", enum: ["ask", "prepare_task"] }, request: { type: "string" },
        mode: { type: "string", enum: ["research", "build", "automate", "create"] },
        executor: { type: "string", enum: ["browser", "terminal"] },
      },
    } },
    evidence: { type: "array", items: { type: "integer" }, maxItems: 3 },
  },
};

function line(value: unknown, max: number): string {
  if (typeof value !== "string" || !value.trim() || value.length > max || /[\n\r<>]|https?:\/\//i.test(value)) throw new Error("Invalid content choice");
  return value.trim();
}

/** Choices describe possible outcomes, never permissions or executable commands. */
export function parseContentGuide(value: unknown, analysis: Pick<Analysis, "id" | "frame_descriptions">): ContentGuide {
  if (!value || typeof value !== "object") throw new Error("Missing content guide");
  const data = value as Record<string, unknown>;
  if (data.version !== undefined && data.version !== 3) throw new Error("Old guide version");
  if (data.analysisId !== undefined && data.analysisId !== analysis.id) throw new Error("Wrong guide source");
  if (!Array.isArray(data.choices) || data.choices.length !== 3) throw new Error("Expected three choices");
  const labels = new Set<string>();
  const choices = data.choices.map((item, index): ContentChoice => {
    if (!item || typeof item !== "object") throw new Error("Invalid choice");
    const label = line(item.label, 48);
    if (labels.has(label.toLowerCase())) throw new Error("Repeated choice");
    labels.add(label.toLowerCase());
    if (!["ask", "prepare_task"].includes(item.kind) || !["research", "build", "automate", "create"].includes(item.mode) || !["browser", "terminal"].includes(item.executor)) throw new Error("Unsupported choice");
    const request = line(item.request, 900);
    if (request.length < 8) throw new Error("Missing choice intent");
    return { id: `choice-${index + 1}`, label, detail: line(item.detail, 100), kind: item.kind, request, mode: item.mode, executor: item.executor };
  });
  if (!Array.isArray(data.evidence) || data.evidence.length > 3 || data.evidence.some(index => !Number.isInteger(index) || index < 0 || index >= (analysis.frame_descriptions?.length ?? 0))) throw new Error("Invalid guide evidence");
  return { version: 3, analysisId: analysis.id, title: line(data.title, 88), summary: line(data.summary, 180), choices, evidence: [...new Set(data.evidence as number[])] };
}
