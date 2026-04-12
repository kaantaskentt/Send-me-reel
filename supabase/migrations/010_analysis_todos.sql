-- To-do items attached to analyses
create table analysis_todos (
  id uuid primary key default uuid_generate_v4(),
  analysis_id uuid not null references analyses(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  title text not null,
  completed boolean not null default false,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create index idx_analysis_todos_analysis on analysis_todos(analysis_id);
create index idx_analysis_todos_user on analysis_todos(user_id);
