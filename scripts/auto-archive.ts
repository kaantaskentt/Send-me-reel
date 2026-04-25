/**
 * Phase 2 auto-archive sweep.
 *
 * Sets set_aside_at on any completed analysis older than 30 days that has
 * never been resolved (tried_at IS NULL AND set_aside_at IS NULL).
 *
 * Why: old saves accumulate guilt. Auto-release on the user's behalf is
 * the soft permission to let go. (strategy.md §11.3, transformation-plan §7)
 *
 * Run modes:
 *   npx tsx scripts/auto-archive.ts --dry-run    # report only, no writes
 *   npx tsx scripts/auto-archive.ts              # actually archive
 *
 * Schedule: nightly cron (Railway scheduled job, recommended 03:00 UTC).
 */

import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
if (!supabaseUrl || !supabaseKey) {
  console.error("Missing SUPABASE_URL / SUPABASE_SERVICE_KEY");
  process.exit(1);
}
const supabase = createClient(supabaseUrl, supabaseKey);

const DRY_RUN = process.argv.includes("--dry-run");
const STALE_DAYS = 30;

async function main() {
  const cutoff = new Date(Date.now() - STALE_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const now = new Date().toISOString();

  console.log(
    `[auto-archive] cutoff: ${cutoff} (analyses older than ${STALE_DAYS} days)`,
  );
  console.log(`[auto-archive] mode: ${DRY_RUN ? "DRY-RUN" : "WRITE"}`);

  const baseQuery = supabase
    .from("analyses")
    .select("id, user_id, source_url, created_at", { count: "exact" })
    .eq("status", "done")
    .lt("created_at", cutoff)
    .is("tried_at", null)
    .is("set_aside_at", null);

  if (DRY_RUN) {
    const { data, count, error } = await baseQuery.limit(50);
    if (error) {
      console.error("[auto-archive] query error:", error);
      process.exit(1);
    }
    console.log(`[auto-archive] would archive ${count ?? 0} analyses (showing up to 50):`);
    for (const row of data ?? []) {
      console.log(`  ${row.created_at}  ${row.id.slice(0, 8)}  ${row.source_url}`);
    }
    return;
  }

  const { data, error } = await supabase
    .from("analyses")
    .update({ set_aside_at: now })
    .eq("status", "done")
    .lt("created_at", cutoff)
    .is("tried_at", null)
    .is("set_aside_at", null)
    .select("id");

  if (error) {
    console.error("[auto-archive] update error:", error);
    process.exit(1);
  }

  const archived = data?.length ?? 0;
  console.log(`[auto-archive] archived ${archived} analyses`);
}

main().catch((err) => {
  console.error("[auto-archive] failed:", err);
  process.exit(1);
});
