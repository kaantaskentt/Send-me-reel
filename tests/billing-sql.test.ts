import assert from "node:assert/strict";
import test, { before, after } from "node:test";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";

const db = new PGlite();
let telegramId = 1;

before(async () => {
  // Use the actual base schema. uuid-ossp is not bundled in this WASM build;
  // substitute PostgreSQL's built-in UUID generator for equivalent test defaults.
  const initial = (await readFile(new URL("../supabase/migrations/001_initial.sql", import.meta.url), "utf8"))
    .replace('create extension if not exists "uuid-ossp";', "")
    .replaceAll("uuid_generate_v4()", "gen_random_uuid()");
  await db.exec(initial);
  await db.exec(await readFile(new URL("../supabase/migrations/008_web_analysis_source.sql", import.meta.url), "utf8"));
  await db.exec(await readFile(new URL("../supabase/migrations/013_analyses_attempt_count.sql", import.meta.url), "utf8"));
  await db.exec("CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;");
  await db.exec(await readFile(new URL("../supabase/migrations/022_atomic_analysis_billing.sql", import.meta.url), "utf8"));
  // Supabase grants its backend role table access independently of function EXECUTE.
  await db.exec("GRANT USAGE ON SCHEMA public TO service_role; GRANT SELECT, INSERT, UPDATE ON public.credits, public.analyses TO service_role;");
});
after(async () => { await db.close(); });

async function account(balance = 1) {
  const id = randomUUID();
  await db.query("INSERT INTO users (id, telegram_id) VALUES ($1, $2)", [id, telegramId++]);
  await db.query("INSERT INTO credits (user_id, balance) VALUES ($1, $2)", [id, balance]);
  return id;
}
async function balance(user: string) {
  return (await db.query<{ balance: number; lifetime_used: number }>("SELECT balance, lifetime_used FROM credits WHERE user_id = $1", [user])).rows[0];
}
async function reserve(user: string, id = randomUUID(), url = "https://youtube.com/watch?v=example", note: string | null = null, source = "web") {
  return (await db.query<{ id: string }>("SELECT public.create_analysis_with_credit($1::uuid, $2::text, 'youtube', $3::text, $4::text, $5::uuid) AS id", [user, url, note, source, id])).rows[0].id;
}
async function refund(id: string) {
  return (await db.query<{ refunded: boolean }>("SELECT public.refund_analysis_credit($1::uuid) AS refunded", [id])).rows[0].refunded;
}

test("SQL: reservation and queued analysis are committed together, with an audit timestamp", async () => {
  const user = await account(2);
  const id = await reserve(user, undefined, undefined, "  reproduce this  ", "telegram");
  assert.deepEqual(await balance(user), { balance: 1, lifetime_used: 1 });
  const row = (await db.query<{ status: string; source: string; credits_charged: number; credits_reserved_at: Date; metadata: { userNote: string } }>("SELECT status, source, credits_charged, credits_reserved_at, metadata FROM analyses WHERE id=$1", [id])).rows[0];
  assert.equal(row.status, "pending");
  assert.equal(row.source, "telegram");
  assert.equal(row.credits_charged, 1);
  assert.ok(row.credits_reserved_at);
  assert.equal(row.metadata.userNote, "reproduce this");
});

test("SQL: insufficient balance does not create an analysis", async () => {
  const user = await account(0);
  await assert.rejects(reserve(user), /INSUFFICIENT_CREDITS/);
  assert.deepEqual(await balance(user), { balance: 0, lifetime_used: 0 });
  const rows = (await db.query("SELECT id FROM analyses WHERE user_id=$1", [user])).rows;
  assert.equal(rows.length, 0);
});

test("SQL: failed analysis insertion rolls its credit reservation back", async () => {
  const user = await account(1);
  await db.exec("ALTER TABLE analyses ADD CONSTRAINT reject_test_insert CHECK (source_url NOT LIKE '%reject-insert%')");
  try {
    await assert.rejects(reserve(user, undefined, "https://youtube.com/reject-insert"), /reject_test_insert/);
    assert.deepEqual(await balance(user), { balance: 1, lifetime_used: 0 });
  } finally { await db.exec("ALTER TABLE analyses DROP CONSTRAINT reject_test_insert"); }
});

test("SQL: retrying an idempotency key returns the existing analysis without charging twice", async () => {
  const user = await account(1);
  const id = randomUUID();
  assert.equal(await reserve(user, id), id);
  assert.equal(await reserve(user, id), id); // balance is already zero
  assert.deepEqual(await balance(user), { balance: 0, lifetime_used: 1 });
  await assert.rejects(reserve(user, id, "https://youtube.com/watch?v=different"), /ANALYSIS_ID_CONFLICT/);
  assert.deepEqual(await balance(user), { balance: 0, lifetime_used: 1 });
});

test("SQL: a terminal failed analysis is refunded exactly once", async () => {
  const user = await account(1);
  const id = await reserve(user);
  await assert.rejects(refund(id), /ANALYSIS_NOT_REFUNDABLE/);
  assert.deepEqual(await balance(user), { balance: 0, lifetime_used: 1 });
  await db.query("UPDATE analyses SET status='failed' WHERE id=$1", [id]);
  assert.equal(await refund(id), true);
  assert.equal(await refund(id), false);
  assert.deepEqual(await balance(user), { balance: 1, lifetime_used: 0 });
  assert.ok((await db.query("SELECT credits_refunded_at FROM analyses WHERE id=$1", [id])).rows[0].credits_refunded_at);
});

test("SQL: queued duplicate refund requests credit the balance only once", async () => {
  const user = await account(1);
  const id = await reserve(user);
  await db.query("UPDATE analyses SET status='failed' WHERE id=$1", [id]);
  // PGlite serializes a single connection. This exercises replay, not production
  // multi-connection contention; a live Postgres concurrency test remains required.
  const results = await Promise.all(Array.from({ length: 8 }, () => refund(id)));
  assert.equal(results.filter(Boolean).length, 1);
  assert.deepEqual(await balance(user), { balance: 1, lifetime_used: 0 });
});

test("SQL: invalid parameters and legacy analyses do not mutate balances", async () => {
  const user = await account(1);
  await assert.rejects(reserve(user, undefined, undefined, "a".repeat(4001)), /INVALID_ANALYSIS_INPUT/);
  await assert.rejects(reserve(user, undefined, undefined, null, "unknown"), /INVALID_ANALYSIS_INPUT/);
  const legacyId = randomUUID();
  await db.query("INSERT INTO analyses (id,user_id,source_url,platform,status) VALUES ($1,$2,'https://youtube.com/legacy','youtube','failed')", [legacyId, user]);
  await assert.rejects(refund(legacyId), /LEGACY_ANALYSIS_REQUIRES_BILLING_REVIEW/);
  assert.deepEqual(await balance(user), { balance: 1, lifetime_used: 0 });
  await assert.rejects(db.query("INSERT INTO credits (user_id,balance) VALUES ($1,100)", [user]), /credits_one_balance_per_user/);
});

test("SQL: only the backend role can execute the billing RPCs", async () => {
  const user = await account(1);
  for (const role of ["anon", "authenticated"]) {
    await db.exec(`SET ROLE ${role}`);
    try { await assert.rejects(reserve(user), /permission denied for function/); }
    finally { await db.exec("RESET ROLE"); }
  }
  await db.exec("SET ROLE service_role");
  try { assert.ok(await reserve(user)); }
  finally { await db.exec("RESET ROLE"); }
});
