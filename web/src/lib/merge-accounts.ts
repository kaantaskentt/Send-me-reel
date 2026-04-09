import { getSupabase } from "./supabase";

/**
 * Merges a Telegram-only account into an existing web/email account.
 * Transfers analyses, credits, context, and Notion tokens — then deletes the orphan.
 *
 * IMPORTANT: Data is transferred BEFORE deleting the orphan, because
 * analyses have ON DELETE CASCADE on user_id.
 */
export async function mergeAccounts(
  keepUserId: string,
  mergeFromUserId: string,
): Promise<{ merged: boolean }> {
  if (keepUserId === mergeFromUserId) return { merged: false };

  const db = getSupabase();

  // Fetch both users
  const [{ data: keepUser }, { data: mergeFromUser }] = await Promise.all([
    db.from("users").select("*").eq("id", keepUserId).single(),
    db.from("users").select("*").eq("id", mergeFromUserId).single(),
  ]);

  if (!keepUser || !mergeFromUser) return { merged: false };

  // Don't overwrite if keepUser already has a different telegram_id
  if (keepUser.telegram_id && keepUser.telegram_id !== mergeFromUser.telegram_id) {
    return { merged: false };
  }

  // 1. Add telegram identity to kept user
  //    IMPORTANT: telegram_id has a UNIQUE constraint — must clear it on the orphan first
  if (!keepUser.telegram_id && mergeFromUser.telegram_id) {
    await db
      .from("users")
      .update({ telegram_id: null, telegram_username: null })
      .eq("id", mergeFromUserId);

    await db
      .from("users")
      .update({
        telegram_id: mergeFromUser.telegram_id,
        telegram_username: mergeFromUser.telegram_username,
      })
      .eq("id", keepUserId);
  }

  // 2. Copy Notion tokens if kept user doesn't have them
  if (!keepUser.notion_access_token && mergeFromUser.notion_access_token) {
    await db
      .from("users")
      .update({
        notion_access_token: mergeFromUser.notion_access_token,
        notion_workspace_id: mergeFromUser.notion_workspace_id,
        notion_workspace_name: mergeFromUser.notion_workspace_name,
        notion_database_id: mergeFromUser.notion_database_id,
      })
      .eq("id", keepUserId);
  }

  // 3. Copy first_name and onboarded status if needed
  const userUpdates: Record<string, unknown> = {};
  if (!keepUser.first_name && mergeFromUser.first_name) {
    userUpdates.first_name = mergeFromUser.first_name;
  }
  if (!keepUser.onboarded && mergeFromUser.onboarded) {
    userUpdates.onboarded = true;
  }
  if (Object.keys(userUpdates).length > 0) {
    await db.from("users").update(userUpdates).eq("id", keepUserId);
  }

  // 4. Reassign all analyses (MUST happen before deleting orphan — CASCADE would delete them)
  await db
    .from("analyses")
    .update({ user_id: keepUserId })
    .eq("user_id", mergeFromUserId);

  // 5. Merge credits
  const [{ data: mergeFromCredits }, { data: keepCredits }] = await Promise.all([
    db.from("credits").select("balance, lifetime_used").eq("user_id", mergeFromUserId).single(),
    db.from("credits").select("balance, lifetime_used").eq("user_id", keepUserId).single(),
  ]);

  if (mergeFromCredits && keepCredits) {
    // Both have credits — add them together
    await db
      .from("credits")
      .update({
        balance: keepCredits.balance + mergeFromCredits.balance,
        lifetime_used: keepCredits.lifetime_used + mergeFromCredits.lifetime_used,
      })
      .eq("user_id", keepUserId);
  } else if (mergeFromCredits && !keepCredits) {
    // keepUser has no credits row — reassign the orphan's credits row
    await db
      .from("credits")
      .update({ user_id: keepUserId })
      .eq("user_id", mergeFromUserId);
  }

  // 6. Copy context if kept user has none
  const { data: keepContext } = await db
    .from("user_contexts")
    .select("id")
    .eq("user_id", keepUserId)
    .single();

  if (!keepContext) {
    const { data: mergeFromContext } = await db
      .from("user_contexts")
      .select("role, goal, content_preferences, extended_context, raw_answers")
      .eq("user_id", mergeFromUserId)
      .single();

    if (mergeFromContext) {
      await db.from("user_contexts").insert({
        user_id: keepUserId,
        role: mergeFromContext.role,
        goal: mergeFromContext.goal,
        content_preferences: mergeFromContext.content_preferences,
        extended_context: mergeFromContext.extended_context,
        raw_answers: mergeFromContext.raw_answers,
      });
    }
  }

  // 7. Delete the orphan user — CASCADE cleans up their credits & context
  //    (analyses already reassigned, so they survive)
  await db.from("users").delete().eq("id", mergeFromUserId);

  console.log(`[merge] Merged user ${mergeFromUserId} into ${keepUserId}`);
  return { merged: true };
}
