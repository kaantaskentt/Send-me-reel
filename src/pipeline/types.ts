export type Platform = "instagram" | "tiktok" | "x" | "linkedin" | "youtube" | "article" | "unknown";

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

export type ContentCategory =
  | "named_tool"
  | "creator_review"
  | "tutorial"
  | "technique"
  | "product"
  | "recipe"
  | "place"
  | "exercise"
  | "practice"
  | "advice"
  | "concept"
  | "commentary"
  | "story"
  | "entertainment";

export type ActionLane =
  | "open_it"
  | "shop_this"
  | "save_for_later"
  | "chat_about"
  | "just_a_watch"
  | "the_takeaway";

export interface ClassifierResult {
  category: ContentCategory;
  action_lane: ActionLane;
  confidence: number;
  needs_search: boolean;
}
