/** JSON-only boundary between the hosted web code and the local media worker. */
export interface UploadInspectionRequest {
  uploadRoot: string;
  uploadId: string;
  question: string;
  startSec?: number;
  endSec?: number;
  pageStart?: number;
  pageEnd?: number;
}

export interface UploadedObservation {
  page?: number;
  timestampSec?: number;
  description: string;
  onScreenText: string[];
  urls: string[];
  tools: string[];
  speech: string;
  uncertain: boolean;
}
export interface UploadedEvidence { summary: string; observations: UploadedObservation[]; limitations: string[] }
export interface UploadInspectionResult {
  status: "complete";
  sourceUrl: string;
  provider: "gemini";
  model: string;
  evidence: UploadedEvidence;
  usage: {
    promptTokenCount: number;
    candidatesTokenCount: number;
    thoughtsTokenCount: number;
    cachedContentTokenCount: number;
    totalTokenCount: number;
  };
  range: { startSec?: number; endSec?: number; pageStart?: number; pageEnd?: number };
  warnings: string[];
  coverage: string;
  mode?: "static";
  fps?: number;
  resolution?: "high";
}
export type UploadInspectionResponse =
  | { version: 1; ok: true; result: UploadInspectionResult }
  | { version: 1; ok: false; error: { code: string; message: string } };

export function parseUploadInspectionRequest(value: unknown): UploadInspectionRequest {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Invalid inspection request.");
  const input = value as Record<string, unknown>;
  const fields = ["uploadRoot", "uploadId", "question", "startSec", "endSec", "pageStart", "pageEnd"];
  if (Object.keys(input).some(key => !fields.includes(key)) ||
      typeof input.uploadRoot !== "string" || !input.uploadRoot || input.uploadRoot.length > 4096 || input.uploadRoot.includes("\0") ||
      typeof input.uploadId !== "string" || !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(input.uploadId) ||
      typeof input.question !== "string" || !input.question.trim() || input.question.length > 2000 ||
      ["startSec", "endSec", "pageStart", "pageEnd"].some(key => input[key] !== undefined && (typeof input[key] !== "number" || !Number.isFinite(input[key])))) {
    throw new Error("Invalid inspection request.");
  }
  return input as unknown as UploadInspectionRequest;
}
