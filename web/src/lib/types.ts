export interface User {
  id: string;
  telegram_id: number;
  telegram_username: string | null;
  first_name: string | null;
  onboarded: boolean;
  notion_access_token: string | null;
  notion_database_id: string | null;
}

export interface UserContext {
  role: string;
  goal: string;
  content_preferences: string;
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
  created_at: string;
  completed_at: string | null;
}

export interface ParsedVerdict {
  title: string;
  subtitle: string;
  explanation: string;
  howTo: string;
  realWorldUse?: string;
  link?: string;
  tags?: string[];
  raw: string;
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
