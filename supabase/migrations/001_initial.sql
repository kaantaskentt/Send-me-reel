create extension if not exists "uuid-ossp";

-- Users
create table users (
  id uuid primary key default uuid_generate_v4(),
  telegram_id bigint unique not null,
  telegram_username text,
  first_name text,
  onboarded boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- User context profiles (from onboarding)
create table user_contexts (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references users(id) on delete cascade,
  role text not null,
  goal text not null,
  content_preferences text not null,
  raw_answers jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Credit balances
create table credits (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references users(id) on delete cascade,
  balance integer not null default 10,
  lifetime_used integer not null default 0,
  updated_at timestamptz not null default now()
);

-- Content analyses
create table analyses (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references users(id) on delete cascade,
  source_url text not null,
  platform text not null,
  status text not null default 'pending'
    check (status in ('pending', 'scraping', 'transcribing', 'analyzing', 'generating', 'done', 'failed')),
  transcript text,
  frame_descriptions jsonb,
  visual_summary text,
  caption text,
  metadata jsonb,
  verdict text,
  verdict_intent text check (verdict_intent in ('learn', 'apply', 'ignore')),
  credits_charged integer not null default 1,
  error_message text,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

-- Indexes
create index idx_users_telegram_id on users(telegram_id);
create index idx_user_contexts_user on user_contexts(user_id);
create index idx_credits_user on credits(user_id);
create index idx_analyses_user on analyses(user_id);
create index idx_analyses_status on analyses(status);

-- Auto-update updated_at
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger users_updated_at before update on users
  for each row execute function update_updated_at();
create trigger user_contexts_updated_at before update on user_contexts
  for each row execute function update_updated_at();
create trigger credits_updated_at before update on credits
  for each row execute function update_updated_at();
