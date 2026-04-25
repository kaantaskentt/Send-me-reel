/**
 * Read-only Supabase schema inspector.
 *
 * Shows the actual columns + indexes on the live DB so we can reconcile
 * against what migrations 014 and 015 will add. Service-key auth, no writes.
 *
 * Usage:
 *   npx tsx scripts/inspect-schema.ts
 */

import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_KEY;
if (!url || !key) {
  console.error("Missing SUPABASE_URL / SUPABASE_SERVICE_KEY in .env");
  process.exit(1);
}
const supabase = createClient(url, key);

interface ColumnRow {
  table_name: string;
  column_name: string;
  data_type: string;
  is_nullable: string;
  column_default: string | null;
}

const TARGET_TABLES = ["analyses", "users", "user_contexts", "credits", "analysis_todos"];

async function querySql(sql: string) {
  // Supabase exposes pg_meta via rest. We use a simple workaround: a temporary
  // RPC isn't always available, so we issue raw queries through a Postgres
  // metadata endpoint by selecting from information_schema.
  // Use the service key directly with the postgrest rest-of-the-information_schema
  // pattern: GET to /rest/v1/<unprivileged-view>... actually information_schema
  // is not exposed by default through PostgREST.
  //
  // Fallback: use the .from("..._info") helpers if any exist, else fall back to
  // reading actual rows and inferring columns. Below is the simpler path.
  void sql;
  throw new Error("not used — see introspect()");
}

async function introspect() {
  console.log("\n══════════════════════════════════════════════════════════════════════");
  console.log("  ContextDrop schema inspector — live DB");
  console.log(`  ${url}`);
  console.log("══════════════════════════════════════════════════════════════════════\n");

  for (const table of TARGET_TABLES) {
    // Pull one row with all columns. For empty tables we still get the column
    // shape via the response headers / null row. Easier fallback: select with
    // limit 1, then list keys we got back.
    const { data, error, status } = await supabase.from(table).select("*").limit(1);
    if (error) {
      console.log(`▸ ${table}  (error ${status}: ${error.message})`);
      console.log("");
      continue;
    }
    const sample = data?.[0];
    if (sample) {
      const cols = Object.keys(sample).sort();
      console.log(`▸ ${table}  (${cols.length} columns, sample row id: ${sample.id?.toString().slice(0, 8) ?? "n/a"})`);
      for (const c of cols) {
        const v = sample[c];
        const t = v === null ? "NULL" : typeof v === "object" ? "object/array" : typeof v;
        const preview = v === null ? "" : typeof v === "string" ? v.slice(0, 30) : String(v).slice(0, 30);
        console.log(`    ${c.padEnd(28)} ${t.padEnd(12)} ${preview}`);
      }
    } else {
      // Empty table — try a "select * from <table> where false" via a count
      // request to at least verify the table exists.
      const { count, error: countErr } = await supabase
        .from(table)
        .select("*", { count: "exact", head: true });
      if (countErr) {
        console.log(`▸ ${table}  (error: ${countErr.message})`);
      } else {
        console.log(`▸ ${table}  (table exists, 0 rows — column probe skipped)`);
      }
    }
    console.log("");
  }

  // ── Check the specific Phase 2 + 4 columns we need to know about ──
  console.log("──────────────────────────────────────────────────────────────────────");
  console.log("  Phase 2 / 4 columns — does the live schema have them?");
  console.log("──────────────────────────────────────────────────────────────────────\n");

  const checks: { table: string; col: string; phase: string }[] = [
    { table: "analyses", col: "tried_at", phase: "Phase 2 (mig 014)" },
    { table: "analyses", col: "set_aside_at", phase: "Phase 2 (mig 014)" },
    { table: "analyses", col: "verdict_intent", phase: "legacy (kept for back-compat)" },
    { table: "analyses", col: "attempt_count", phase: "Apr 21 mig 013" },
    { table: "analyses", col: "updated_at", phase: "Apr 21 mig 013" },
    { table: "users", col: "stance", phase: "Phase 4 (mig 015)" },
    { table: "users", col: "intention", phase: "Phase 4 (mig 015)" },
    { table: "users", col: "pattern_to_stop", phase: "Phase 4 (mig 015)" },
    { table: "users", col: "first_name", phase: "existing" },
    { table: "users", col: "notion_access_token", phase: "existing" },
  ];

  for (const c of checks) {
    // Probe by selecting the specific column. If it doesn't exist, we get an error.
    const { error } = await supabase.from(c.table).select(c.col).limit(1);
    const present = !error;
    const mark = present ? "✓ present" : "✗ MISSING";
    const note = present ? "" : `  ← needs ${c.phase}`;
    console.log(`  ${mark}  ${c.table}.${c.col}${note}`);
  }
  console.log("");
}

introspect().catch((err) => {
  console.error("inspect failed:", err);
  process.exit(1);
});
