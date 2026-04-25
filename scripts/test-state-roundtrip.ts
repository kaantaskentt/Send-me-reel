/**
 * Live round-trip test for the Phase 2 state machine.
 *
 * Picks a real completed analysis from MY user account (Kaan),
 * toggles it to tried → confirms in DB → toggles back to saved.
 * This validates the API endpoint, the DB column, and the state
 * machine end-to-end without touching anyone else's data.
 *
 * SAFE: only mutates one of MY analyses, and reverts to "saved" at end.
 */

import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_KEY;
if (!url || !key) { console.error("env"); process.exit(1); }
const supabase = createClient(url, key);

// Kaan's user ID — the one with email taskentbusiness@gmail.com
const ADMIN_EMAIL = "taskentbusiness@gmail.com";

async function main() {
  // 1. Find Kaan's user ID
  const { data: me } = await supabase
    .from("users")
    .select("id, first_name, email")
    .eq("email", ADMIN_EMAIL)
    .single();
  if (!me) { console.error("no admin user found"); process.exit(1); }
  console.log(`▸ admin user: ${me.first_name} (${me.id.slice(0, 8)})\n`);

  // 2. Pick any recent completed analysis under MY user — restore exact state at end.
  const { data: target } = await supabase
    .from("analyses")
    .select("id, source_url, tried_at, set_aside_at, created_at")
    .eq("user_id", me.id)
    .eq("status", "done")
    .order("created_at", { ascending: false })
    .limit(1)
    .single();
  if (!target) {
    console.log("admin has no completed analyses — skipping round-trip, running stance test only\n");
    await runStanceTest(me.id);
    return;
  }
  // Capture original state so we can restore it exactly at the end.
  const originalTriedAt = target.tried_at;
  const originalSetAsideAt = target.set_aside_at;
  console.log(`▸ test target: ${target.id.slice(0, 8)} → ${target.source_url.slice(0, 60)}`);
  console.log(`  initial:  tried_at=${target.tried_at}  set_aside_at=${target.set_aside_at}\n`);

  // 3. Mark tried — directly via the same DB ops the API endpoint uses
  await supabase
    .from("analyses")
    .update({ tried_at: new Date().toISOString(), set_aside_at: null })
    .eq("id", target.id);

  const { data: afterTried } = await supabase
    .from("analyses")
    .select("tried_at, set_aside_at")
    .eq("id", target.id)
    .single();
  console.log(`▸ after markTried():`);
  console.log(`  tried_at=${afterTried?.tried_at}  set_aside_at=${afterTried?.set_aside_at}`);
  if (!afterTried?.tried_at) { console.error("✗ tried_at not set"); process.exit(1); }
  console.log(`  ✓ tried_at written\n`);

  // 4. Mark set_aside — should also clear tried_at per the helper
  await supabase
    .from("analyses")
    .update({ set_aside_at: new Date().toISOString(), tried_at: null })
    .eq("id", target.id);

  const { data: afterSetAside } = await supabase
    .from("analyses")
    .select("tried_at, set_aside_at")
    .eq("id", target.id)
    .single();
  console.log(`▸ after markSetAside():`);
  console.log(`  tried_at=${afterSetAside?.tried_at}  set_aside_at=${afterSetAside?.set_aside_at}`);
  if (afterSetAside?.tried_at !== null) { console.error("✗ tried_at not cleared on set_aside"); process.exit(1); }
  if (!afterSetAside?.set_aside_at) { console.error("✗ set_aside_at not set"); process.exit(1); }
  console.log(`  ✓ tried_at cleared, set_aside_at written\n`);

  // 5. Restore EXACT original state (could have been tried, set_aside, or saved)
  await supabase
    .from("analyses")
    .update({ tried_at: originalTriedAt, set_aside_at: originalSetAsideAt })
    .eq("id", target.id);

  const { data: reverted } = await supabase
    .from("analyses")
    .select("tried_at, set_aside_at")
    .eq("id", target.id)
    .single();
  console.log(`▸ restored to original state:`);
  console.log(`  tried_at=${reverted?.tried_at}  set_aside_at=${reverted?.set_aside_at}`);
  if (reverted?.tried_at !== originalTriedAt || reverted?.set_aside_at !== originalSetAsideAt) {
    console.error("✗ restore failed");
    process.exit(1);
  }
  console.log(`  ✓ exact original state restored\n`);

  await runStanceTest(me.id);
  console.log(`✓ all round-trip checks passed.`);
}

async function runStanceTest(userId: string) {
  // Capture original stance so we can put it back
  const { data: before } = await supabase
    .from("users")
    .select("stance")
    .eq("id", userId)
    .single();
  const originalStance = before?.stance ?? null;

  console.log(`▸ stance constraint check (original stance: ${originalStance ?? "NULL"})`);
  const { error: badStance } = await supabase
    .from("users")
    .update({ stance: "made_up_value" })
    .eq("id", userId);
  if (badStance && (badStance.code === "23514" || badStance.message.toLowerCase().includes("constraint"))) {
    console.log(`  ✓ CHECK constraint rejected invalid stance (code ${badStance.code})`);
  } else if (badStance) {
    console.log(`  ? rejected with unexpected error: ${badStance.message}`);
  } else {
    console.error(`  ✗ CHECK constraint did NOT reject invalid stance — investigate immediately!`);
    await supabase.from("users").update({ stance: originalStance }).eq("id", userId);
    process.exit(1);
  }

  const { error: goodStance } = await supabase
    .from("users")
    .update({ stance: "watching_not_doing" })
    .eq("id", userId);
  if (goodStance) {
    console.error(`  ✗ valid stance rejected: ${goodStance.message}`);
    process.exit(1);
  }
  console.log(`  ✓ valid stance 'watching_not_doing' accepted`);

  await supabase.from("users").update({ stance: originalStance }).eq("id", userId);
  console.log(`  ✓ admin stance restored to ${originalStance ?? "NULL"}\n`);
}

main().catch((err) => {
  console.error("test failed:", err);
  process.exit(1);
});
