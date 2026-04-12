import { redirect } from "next/navigation";
import { Suspense } from "react";
import { verifyToken } from "@/lib/auth";
import { getSupabase } from "@/lib/supabase";
import ClaimContent from "@/components/claim/ClaimContent";

interface Props {
  searchParams: Promise<{ token?: string }>;
}

/**
 * Claim page — shown when a Telegram-only user clicks the bot's "View Dashboard"
 * button for the first time. Forces them to sign up with Google so their
 * dashboard data is permanently saved.
 *
 * Without this step, users would lose all their data the moment they cleared
 * cookies or signed out (Demi feedback, Apr 2026).
 */
export default async function ClaimPage({ searchParams }: Props) {
  const { token } = await searchParams;

  if (!token) {
    redirect("/login?error=missing_token");
  }

  // Verify the token is valid before showing the page
  const payload = await verifyToken(token);
  if (!payload) {
    redirect("/login?error=expired_token");
  }

  // Fetch the user to display their stats (e.g., "Save your 7 analyses")
  const db = getSupabase();
  const { data: user } = await db
    .from("users")
    .select("id, first_name, telegram_username, email")
    .eq("id", payload.sub)
    .single();

  if (!user) {
    redirect("/login?error=account_not_found");
  }

  // If the user already has an email, they don't need to claim — just log in
  if (user.email) {
    redirect(`/auth?token=${token}`);
  }

  // Count their analyses to make the value proposition concrete
  const { count } = await db
    .from("analyses")
    .select("id", { count: "exact", head: true })
    .eq("user_id", payload.sub)
    .eq("status", "done");

  return (
    <Suspense>
      <ClaimContent
        token={token}
        firstName={user.first_name || user.telegram_username || "there"}
        analysisCount={count || 0}
      />
    </Suspense>
  );
}
