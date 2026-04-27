-- 018_chat_threads.sql — persistent chat sessions and messages.
-- Threads live per (user_id, analysis_id). Messages cascade.
-- FTS via tsvector + GIN so "what did I ask about Mem0 last week" works.

create table if not exists chat_threads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  analysis_id uuid references analyses(id) on delete set null,
  title text,
  archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_chat_threads_user_updated
  on chat_threads (user_id, updated_at desc);
create index if not exists idx_chat_threads_user_analysis
  on chat_threads (user_id, analysis_id);

create table if not exists chat_messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references chat_threads(id) on delete cascade,
  role text not null check (role in ('user', 'assistant', 'system')),
  content text not null,
  created_at timestamptz not null default now(),
  -- Generated FTS column. English stemmer is fine — most chat is mixed casual.
  content_tsv tsvector generated always as (to_tsvector('english', content)) stored
);

create index if not exists idx_chat_messages_thread_created
  on chat_messages (thread_id, created_at);
create index if not exists idx_chat_messages_fts
  on chat_messages using gin (content_tsv);

-- Auto-bump chat_threads.updated_at on every UPDATE (uses fn from 001).
drop trigger if exists chat_threads_updated_at on chat_threads;
create trigger chat_threads_updated_at
  before update on chat_threads
  for each row execute function update_updated_at();

-- Bump the parent thread's updated_at when a new message lands. Required so
-- the sidebar can sort "last active" without a sub-query.
create or replace function bump_chat_thread_on_message()
  returns trigger language plpgsql as $$
begin
  update chat_threads
    set updated_at = now()
    where id = new.thread_id;
  return new;
end;
$$;

drop trigger if exists chat_messages_bump_thread on chat_messages;
create trigger chat_messages_bump_thread
  after insert on chat_messages
  for each row execute function bump_chat_thread_on_message();
