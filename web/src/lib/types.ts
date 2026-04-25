export interface User {
  id: string;
  telegram_id: number;
  telegram_username: string | null;
  first_name: string | null;
  onboarded: boolean;
  premium: boolean;
  notion_access_token: string | null;
  notion_workspace_name: string | null;
  notion_database_id: string | null;
}

export interface UserContext {
  role: string;
  goal: string;
  content_preferences?: string;
  extended_context?: string;
}

export interface Credits {
  balance: number;
  lifetime_used: number;
}

export interface Analysis {
  id: string;
  user_id: string;
  source_url: string;
  platform: string;
  status: string;
  transcript: string | null;
  frame_descriptions: unknown[] | null;
  visual_summary: string | null;
  caption: string | null;
  metadata: Record<string, unknown> | null;
  verdict: string | null;
  verdict_intent: string | null;
  credits_charged: number;
  error_message: string | null;
  action_items: {
    insights?: { text: string }[];
    resources?: { name: string; description: string; link?: string; price?: string }[];
    for_you?: { text: string }[];
    try_this?: { title: string; description: string }[];
    // Legacy format fallback
    [key: string]: unknown;
  } | null;
  created_at: string;
  completed_at: string | null;
}

export interface Todo {
  id: string;
  title: string;
  completed: boolean;
  position: number;
  created_at: string;
  completed_at: string | null;
}

export type WorthSignal = "worth_your_time" | "skim_it" | "skip" | null;

export interface ParsedVerdict {
  title: string;
  body: string;
  forYou?: string;
  worthSignal?: WorthSignal;
  raw: string;

  // New-format fields (📍 / 🌱 / 🍵 / 🪜). All undefined for legacy verdicts.
  isNewFormat?: boolean;
  description?: string; // 📍 paragraph (the 2-sentence "what this is")
  action?: string;      // 🌱 line content (the small thing to try)
  noHomework?: boolean; // true if the verdict resolved to 🍵 Just a watch
  deeper?: string;      // 🪜 line content (the optional next layer)
}

export interface UserProfile {
  user: User;
  context: UserContext | null;
  credits: Credits;
}

export interface AnalysisFeedResponse {
  analyses: Analysis[];
  total: number;
  hasMore: boolean;
}
