-- 020_user_wiki.sql — Karpathy-style per-user LLM Wiki schema.
--
-- Sidecar memory layer that compiles durable user knowledge from existing
-- analyses, chat turns, and state events. Read-only with respect to the
-- existing pipeline: nothing here changes scraping, classification, or
-- verdict generation. See TEMP-DOCS/LLM_WIKI_MULTI_USER_IMPLEMENTATION_PLAN.md.
--
-- Hard rule: every row carries user_id. Cross-user joins are blocked at the
-- database via composite (id, user_id) FKs so a buggy query cannot leak.
-- RLS is enabled as defense-in-depth. The current app uses service-role keys
-- which bypass RLS, so app-layer user_id filters remain mandatory.

-- ---------------------------------------------------------------------------
-- Composite uniqueness on parent tables so wiki rows can FK by (id, user_id).
-- ---------------------------------------------------------------------------

alter table analyses
  add constraint analyses_id_user_id_key unique (id, user_id);

alter table chat_threads
  add constraint chat_threads_id_user_id_key unique (id, user_id);

-- chat_messages does not carry user_id directly; the parent thread does.
-- Wiki sources reference chat_message_id and rely on the thread join for
-- isolation, plus the explicit user_id column on user_wiki_sources.

-- ---------------------------------------------------------------------------
-- user_wiki_sources — immutable raw snapshots that feed the compiler.
-- ---------------------------------------------------------------------------

create table if not exists user_wiki_sources (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  source_kind text not null check (source_kind in (
    'analysis_completed',
    'chat_user_message',
    'chat_assistant_answer',
    'analysis_state_changed',
    'analysis_starred',
    'todo_created',
    'profile_updated',
    'manual_correction'
  )),
  analysis_id uuid,
  chat_thread_id uuid,
  chat_message_id uuid references chat_messages(id) on delete cascade,
  event_table text,
  event_id uuid,
  source_url text,
  title text,
  content_hash text not null,
  source_summary text,
  verdict_summary text,
  is_just_watch boolean not null default false,
  analysis_state text,
  payload jsonb not null,
  created_at timestamptz not null default now(),
  ingested_at timestamptz,
  status text not null default 'pending'
    check (status in ('pending', 'compiling', 'done', 'ignored', 'failed')),
  error_message text,
  -- Composite FKs enforce same-user across parent tables.
  constraint user_wiki_sources_analysis_user_fk
    foreign key (analysis_id, user_id)
    references analyses(id, user_id) on delete cascade,
  constraint user_wiki_sources_chat_thread_user_fk
    foreign key (chat_thread_id, user_id)
    references chat_threads(id, user_id) on delete cascade,
  -- Unique row identity for child composite FKs.
  constraint user_wiki_sources_id_user_id_key unique (id, user_id)
);

create unique index if not exists ux_user_wiki_sources_analysis
  on user_wiki_sources (user_id, source_kind, analysis_id)
  where analysis_id is not null;
create unique index if not exists ux_user_wiki_sources_chat_message
  on user_wiki_sources (user_id, source_kind, chat_message_id)
  where chat_message_id is not null;
create index if not exists idx_user_wiki_sources_user_status_created
  on user_wiki_sources (user_id, status, created_at);
create index if not exists idx_user_wiki_sources_user_hash
  on user_wiki_sources (user_id, content_hash);

-- ---------------------------------------------------------------------------
-- user_wiki_folders — dynamic per-user folder tree.
-- ---------------------------------------------------------------------------

create table if not exists user_wiki_folders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  parent_id uuid,
  parent_user_id uuid,
  slug text not null,
  path text not null,
  title text not null,
  description text,
  folder_type text check (folder_type in (
    'background',
    'goals',
    'working_style',
    'current_projects',
    'preferences',
    'topic',
    'tool',
    'concept',
    'source_cluster',
    'archive',
    'custom'
  )),
  canonical_key text,
  sort_order integer not null default 0,
  frontmatter jsonb not null default '{}',
  created_by text not null default 'compiler',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Same-user parent enforcement.
  constraint user_wiki_folders_parent_user_fk
    foreign key (parent_id, parent_user_id)
    references user_wiki_folders(id, user_id) on delete cascade,
  constraint user_wiki_folders_parent_user_match
    check ((parent_id is null and parent_user_id is null)
        or (parent_id is not null and parent_user_id = user_id)),
  constraint user_wiki_folders_id_user_id_key unique (id, user_id)
);

create unique index if not exists ux_user_wiki_folders_user_path
  on user_wiki_folders (user_id, path);
create unique index if not exists ux_user_wiki_folders_user_parent_slug
  on user_wiki_folders (user_id, parent_id, slug)
  where parent_id is not null;
create unique index if not exists ux_user_wiki_folders_user_root_slug
  on user_wiki_folders (user_id, slug)
  where parent_id is null;
create index if not exists idx_user_wiki_folders_user_parent_sort
  on user_wiki_folders (user_id, parent_id, sort_order);
create index if not exists idx_user_wiki_folders_user_type
  on user_wiki_folders (user_id, folder_type);
create index if not exists idx_user_wiki_folders_canonical
  on user_wiki_folders (canonical_key)
  where canonical_key is not null;

-- ---------------------------------------------------------------------------
-- user_wiki_pages — compiled wiki pages for one user.
-- ---------------------------------------------------------------------------

create table if not exists user_wiki_pages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  folder_id uuid,
  folder_user_id uuid,
  slug text not null,
  path text not null,
  title text not null,
  page_type text not null check (page_type in (
    'index',
    'log',
    'timeline',
    'user_profile',
    'background',
    'goals',
    'working_style',
    'project',
    'preference',
    'concept',
    'tool',
    'product',
    'place',
    'recipe',
    'practice',
    'person',
    'question',
    'decision',
    'contradiction'
  )),
  summary text,
  body_md text not null,
  frontmatter jsonb not null default '{}',
  confidence numeric,
  status text not null default 'active'
    check (status in ('active', 'archived', 'forgotten')),
  revision integer not null default 1,
  last_compiled_from_source_id uuid,
  last_compiled_from_source_user_id uuid,
  search_tsv tsvector generated always as (
    to_tsvector('english',
      coalesce(title, '') || ' ' ||
      coalesce(summary, '') || ' ' ||
      coalesce(body_md, ''))
  ) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_wiki_pages_folder_user_fk
    foreign key (folder_id, folder_user_id)
    references user_wiki_folders(id, user_id) on delete set null,
  constraint user_wiki_pages_folder_user_match
    check ((folder_id is null and folder_user_id is null)
        or (folder_id is not null and folder_user_id = user_id)),
  constraint user_wiki_pages_last_source_user_fk
    foreign key (last_compiled_from_source_id, last_compiled_from_source_user_id)
    references user_wiki_sources(id, user_id) on delete set null,
  constraint user_wiki_pages_last_source_user_match
    check ((last_compiled_from_source_id is null
              and last_compiled_from_source_user_id is null)
        or (last_compiled_from_source_id is not null
              and last_compiled_from_source_user_id = user_id)),
  constraint user_wiki_pages_id_user_id_key unique (id, user_id)
);

create unique index if not exists ux_user_wiki_pages_user_path
  on user_wiki_pages (user_id, path);
create unique index if not exists ux_user_wiki_pages_user_folder_slug
  on user_wiki_pages (user_id, folder_id, slug)
  where folder_id is not null;
create unique index if not exists ux_user_wiki_pages_user_root_slug
  on user_wiki_pages (user_id, slug)
  where folder_id is null;
create index if not exists idx_user_wiki_pages_user_type_updated
  on user_wiki_pages (user_id, page_type, updated_at desc);
create index if not exists idx_user_wiki_pages_user_folder_updated
  on user_wiki_pages (user_id, folder_id, updated_at desc);
create index if not exists idx_user_wiki_pages_search
  on user_wiki_pages using gin (search_tsv);

-- ---------------------------------------------------------------------------
-- user_wiki_page_sources — many-to-many provenance.
-- ---------------------------------------------------------------------------

create table if not exists user_wiki_page_sources (
  page_id uuid not null,
  source_id uuid not null,
  user_id uuid not null references users(id) on delete cascade,
  quote text,
  source_span jsonb,
  created_at timestamptz not null default now(),
  primary key (page_id, source_id),
  constraint user_wiki_page_sources_page_user_fk
    foreign key (page_id, user_id)
    references user_wiki_pages(id, user_id) on delete cascade,
  constraint user_wiki_page_sources_source_user_fk
    foreign key (source_id, user_id)
    references user_wiki_sources(id, user_id) on delete cascade
);

create index if not exists idx_user_wiki_page_sources_user_source
  on user_wiki_page_sources (user_id, source_id);
create index if not exists idx_user_wiki_page_sources_user_page
  on user_wiki_page_sources (user_id, page_id);

-- ---------------------------------------------------------------------------
-- user_wiki_links — typed graph edges between pages.
-- ---------------------------------------------------------------------------

create table if not exists user_wiki_links (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  from_page_id uuid not null,
  to_page_id uuid not null,
  relation text not null check (relation in (
    'mentions',
    'uses',
    'similar_to',
    'contradicts',
    'supports',
    'preferred_over',
    'belongs_to_project',
    'answered_by',
    'next_step_for'
  )),
  evidence_source_id uuid,
  evidence_source_user_id uuid,
  created_at timestamptz not null default now(),
  constraint user_wiki_links_from_user_fk
    foreign key (from_page_id, user_id)
    references user_wiki_pages(id, user_id) on delete cascade,
  constraint user_wiki_links_to_user_fk
    foreign key (to_page_id, user_id)
    references user_wiki_pages(id, user_id) on delete cascade,
  constraint user_wiki_links_evidence_user_fk
    foreign key (evidence_source_id, evidence_source_user_id)
    references user_wiki_sources(id, user_id) on delete set null,
  constraint user_wiki_links_evidence_user_match
    check ((evidence_source_id is null and evidence_source_user_id is null)
        or (evidence_source_id is not null
              and evidence_source_user_id = user_id)),
  constraint user_wiki_links_no_self_loop
    check (from_page_id <> to_page_id)
);

create unique index if not exists ux_user_wiki_links_user_edge
  on user_wiki_links (user_id, from_page_id, to_page_id, relation);
create index if not exists idx_user_wiki_links_user_from
  on user_wiki_links (user_id, from_page_id);
create index if not exists idx_user_wiki_links_user_to
  on user_wiki_links (user_id, to_page_id);

-- ---------------------------------------------------------------------------
-- user_wiki_jobs — async compile queue.
-- ---------------------------------------------------------------------------

create table if not exists user_wiki_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  source_id uuid,
  source_user_id uuid,
  job_type text not null check (job_type in (
    'compile_source',
    'compile_chat_turn',
    'refresh_index',
    'lint_user_wiki',
    'backfill_user'
  )),
  status text not null default 'pending'
    check (status in ('pending', 'running', 'done', 'failed', 'ignored')),
  attempt_count integer not null default 0,
  locked_at timestamptz,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_wiki_jobs_source_user_fk
    foreign key (source_id, source_user_id)
    references user_wiki_sources(id, user_id) on delete cascade,
  constraint user_wiki_jobs_source_user_match
    check ((source_id is null and source_user_id is null)
        or (source_id is not null and source_user_id = user_id))
);

create index if not exists idx_user_wiki_jobs_pending
  on user_wiki_jobs (created_at)
  where status = 'pending';
create index if not exists idx_user_wiki_jobs_user_status_created
  on user_wiki_jobs (user_id, status, created_at);

-- ---------------------------------------------------------------------------
-- updated_at triggers (uses fn from 001_initial.sql).
-- ---------------------------------------------------------------------------

drop trigger if exists user_wiki_folders_updated_at on user_wiki_folders;
create trigger user_wiki_folders_updated_at
  before update on user_wiki_folders
  for each row execute function update_updated_at();

drop trigger if exists user_wiki_pages_updated_at on user_wiki_pages;
create trigger user_wiki_pages_updated_at
  before update on user_wiki_pages
  for each row execute function update_updated_at();

drop trigger if exists user_wiki_jobs_updated_at on user_wiki_jobs;
create trigger user_wiki_jobs_updated_at
  before update on user_wiki_jobs
  for each row execute function update_updated_at();

-- chat_messages has no user_id column, so composite FKs can't bind a
-- chat_message_id to user_id directly. This trigger walks
-- chat_message_id -> chat_threads.user_id and rejects cross-user inserts.
create or replace function user_wiki_sources_validate_chat_message()
returns trigger language plpgsql as $$
declare
  msg_thread uuid;
  thread_user uuid;
begin
  if new.chat_message_id is not null then
    select thread_id into msg_thread
      from chat_messages where id = new.chat_message_id;
    if msg_thread is null then
      raise exception 'chat_message_id % not found', new.chat_message_id;
    end if;
    select user_id into thread_user
      from chat_threads where id = msg_thread;
    if thread_user is null or thread_user <> new.user_id then
      raise exception 'chat_message_id % does not belong to user %',
        new.chat_message_id, new.user_id;
    end if;
    if new.chat_thread_id is not null and new.chat_thread_id <> msg_thread then
      raise exception 'chat_thread_id % does not match chat_message thread %',
        new.chat_thread_id, msg_thread;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists user_wiki_sources_validate_chat_message_trg on user_wiki_sources;
create trigger user_wiki_sources_validate_chat_message_trg
  before insert or update on user_wiki_sources
  for each row execute function user_wiki_sources_validate_chat_message();

-- ---------------------------------------------------------------------------
-- RLS — defense-in-depth. Service role still bypasses; app must keep its
-- own user_id filters. Policies are written for a future Supabase Auth path.
-- ---------------------------------------------------------------------------

alter table user_wiki_sources enable row level security;
alter table user_wiki_folders enable row level security;
alter table user_wiki_pages enable row level security;
alter table user_wiki_page_sources enable row level security;
alter table user_wiki_links enable row level security;
alter table user_wiki_jobs enable row level security;

create policy user_wiki_sources_owner on user_wiki_sources
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy user_wiki_folders_owner on user_wiki_folders
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy user_wiki_pages_owner on user_wiki_pages
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy user_wiki_page_sources_owner on user_wiki_page_sources
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy user_wiki_links_owner on user_wiki_links
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy user_wiki_jobs_owner on user_wiki_jobs
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
