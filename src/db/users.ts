import { supabase } from "./client.js";
import type { UserContext } from "../pipeline/types.js";
import type { UserStance } from "../services/verdictGenerator.js";

export interface DbUser {
  id: string;
  telegram_id: number;
  telegram_username: string | null;
  first_name: string | null;
  onboarded: boolean;
  created_at: string;
  notion_access_token: string | null;
  notion_workspace_id: string | null;
  notion_workspace_name: string | null;
  notion_database_id: string | null;
  stance?: UserStance | null;
  intention?: string | null;
  pattern_to_stop?: string | null;
}

export async function getOrCreate(
  telegramId: number,
  username?: string,
  firstName?: string,
): Promise<{ user: DbUser; isNew: boolean }> {
  // Try to find existing user
  const { data: existing } = await supabase
    .from("users")
    .select("*")
    .eq("telegram_id", telegramId)
    .single();

  if (existing) {
    // Update username/firstName if they've changed
    const updates: Record<string, string> = {};
    if (username && existing.telegram_username !== username)
      updates.telegram_username = username;
    if (firstName && existing.first_name !== firstName)
      updates.first_name = firstName;

    if (Object.keys(updates).length > 0) {
      await supabase
        .from("users")
        .update(updates)
        .eq("telegram_id", telegramId);
      Object.assign(existing, updates);
    }

    return { user: existing as DbUser, isNew: false };
  }

  // Create new user
  const { data: newUser, error } = await supabase
    .from("users")
    .insert({
      telegram_id: telegramId,
      telegram_username: username ?? null,
      first_name: firstName ?? null,
    })
    .select()
    .single();

  if (error) throw new Error(`Failed to create user: ${error.message}`);

  // Create initial credits (50 free)
  await supabase.from("credits").insert({ user_id: newUser.id });

  return { user: newUser as DbUser, isNew: true };
}

export async function getByTelegramId(telegramId: number): Promise<DbUser | null> {
  const { data } = await supabase
    .from("users")
    .select("*")
    .eq("telegram_id", telegramId)
    .single();

  return data as DbUser | null;
}

export async function setOnboarded(userId: string, onboarded: boolean): Promise<void> {
  await supabase.from("users").update({ onboarded }).eq("id", userId);
}

export async function setFirstName(userId: string, firstName: string): Promise<void> {
  await supabase.from("users").update({ first_name: firstName }).eq("id", userId);
}

// Phase 4 stance + reflection ──────────────────────────────────────────────
// Stance is the only signal we use for verdict tone calibration. Intention
// and pattern_to_stop are personal reflection notes the user keeps for
// themselves; we never reference them by content in verdicts.

export async function setStance(userId: string, stance: UserStance): Promise<void> {
  await supabase.from("users").update({ stance }).eq("id", userId);
}

export async function getStance(userId: string): Promise<UserStance | null> {
  const { data } = await supabase
    .from("users")
    .select("stance")
    .eq("id", userId)
    .single();
  return (data?.stance as UserStance | null) ?? null;
}

export async function setIntention(userId: string, intention: string | null): Promise<void> {
  await supabase.from("users").update({ intention }).eq("id", userId);
}

export async function setPatternToStop(userId: string, pattern: string | null): Promise<void> {
  await supabase.from("users").update({ pattern_to_stop: pattern }).eq("id", userId);
}

export async function upsertContext(
  userId: string,
  context: UserContext,
  rawAnswers?: Record<string, string>,
): Promise<void> {
  const { data: existing } = await supabase
    .from("user_contexts")
    .select("id")
    .eq("user_id", userId)
    .single();

  const row = {
    user_id: userId,
    role: context.role,
    goal: context.goal,
    content_preferences: context.contentPreferences ?? null,
    raw_answers: rawAnswers ?? {},
  };

  if (existing) {
    await supabase.from("user_contexts").update(row).eq("id", existing.id);
  } else {
    await supabase.from("user_contexts").insert(row);
  }
}

export async function getContext(userId: string): Promise<UserContext | null> {
  const { data } = await supabase
    .from("user_contexts")
    .select("role, goal, content_preferences, extended_context")
    .eq("user_id", userId)
    .single();

  if (!data) return null;
  return {
    role: data.role,
    goal: data.goal,
    contentPreferences: data.content_preferences ?? undefined,
    extendedContext: data.extended_context ?? undefined,
  };
}

export async function updateExtendedContext(
  userId: string,
  extendedContext: string,
): Promise<void> {
  const { data: existing } = await supabase
    .from("user_contexts")
    .select("id")
    .eq("user_id", userId)
    .single();

  if (existing) {
    await supabase
      .from("user_contexts")
      .update({ extended_context: extendedContext })
      .eq("id", existing.id);
  }
}

export async function saveNotionToken(
  telegramId: number,
  token: string,
  workspaceId: string,
  workspaceName: string,
  databaseId: string,
): Promise<void> {
  await supabase
    .from("users")
    .update({
      notion_access_token: token,
      notion_workspace_id: workspaceId,
      notion_workspace_name: workspaceName,
      notion_database_id: databaseId,
    })
    .eq("telegram_id", telegramId);
}

export async function getNotionInfo(
  userId: string,
): Promise<{ token: string; databaseId: string } | null> {
  const { data } = await supabase
    .from("users")
    .select("notion_access_token, notion_database_id")
    .eq("id", userId)
    .single();

  if (!data?.notion_access_token || !data?.notion_database_id) return null;
  return {
    token: data.notion_access_token,
    databaseId: data.notion_database_id,
  };
}
