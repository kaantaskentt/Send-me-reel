alter table users
  add column if not exists notion_access_token text,
  add column if not exists notion_workspace_id text,
  add column if not exists notion_workspace_name text,
  add column if not exists notion_database_id text;
