create table if not exists form_submissions (
  id uuid primary key,
  kind text not null,
  locale text not null,
  source text not null,
  page_url text not null,
  context_label text not null default '',
  context_value text not null default '',
  name text not null default '',
  email text not null default '',
  phone text not null default '',
  preferred_time text not null default '',
  amount text not null default '',
  business text not null default '',
  contribution_method text not null default '',
  message text not null default '',
  payload jsonb not null default '{}'::jsonb,
  email_sent boolean not null default false,
  email_error text,
  created_at timestamptz not null default now()
);

create index if not exists form_submissions_created_at_idx on form_submissions (created_at desc);
create index if not exists form_submissions_kind_idx on form_submissions (kind);

grant select, insert, update on table form_submissions to capapvl_app;
