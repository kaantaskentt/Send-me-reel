export type Platform = "instagram" | "tiktok" | "x" | "article" | "unknown";

export interface ScrapedVideo {
  videoUrl: string;
  caption: string;
  authorName: string;
  authorUsername: string;
  likes: number;
  views: number;
  hashtags: string[];
  metadata: Record<string, unknown>;
}

export interface ScrapedArticle {
  title: string;
  text: string;
  url: string;
  metadata: Record<string, unknown>;
}

export interface FrameAnalysis {
  timestampSec: number;
  description: string;
}

export interface PipelineResult {
  analysisId: string;
  verdict: string;
  platform: Platform;
  transcript: string | null;
  visualSummary: string;
  caption: string;
  metadata: Record<string, unknown>;
}

export interface UserContext {
  role: string;
  goal: string;
  contentPreferences?: string;
  extendedContext?: string;
}

export class ServiceError extends Error {
  constructor(
    public code: string,
    message: string,
    public retryable: boolean = false,
  ) {
    super(message);
    this.name = "ServiceError";
  }
}
