-- Ticket B: store classifier output per analysis.
-- Both nullable so existing rows stay valid.
alter table analyses
  add column if not exists content_type text,
  add column if not exists action_lane  text;
