-- Create 'engines' table for automation pipelines
create table engines (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  title text not null,
  type text not null check (type in ('newsletter', 'thread', 'audio', 'report')),
  config jsonb not null default '{}'::jsonb,
  status text not null default 'active' check (status in ('active', 'paused', 'draft')),
  last_run_at timestamptz,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- RLS for engines
alter table engines enable row level security;

create policy "Users can view their own engines"
  on engines for select
  using (auth.uid() = user_id);

create policy "Users can insert their own engines"
  on engines for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own engines"
  on engines for update
  using (auth.uid() = user_id);

create policy "Users can delete their own engines"
  on engines for delete
  using (auth.uid() = user_id);


-- Create 'assets' table for generated content
create table assets (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  engine_id uuid references engines(id) on delete set null,
  title text not null,
  type text not null check (type in ('markdown', 'audio', 'image')),
  content text, -- Markdown content or file path
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now() not null
);

-- RLS for assets
alter table assets enable row level security;

create policy "Users can view their own assets"
  on assets for select
  using (auth.uid() = user_id);

create policy "Users can insert their own assets"
  on assets for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own assets"
  on assets for update
  using (auth.uid() = user_id);

create policy "Users can delete their own assets"
  on assets for delete
  using (auth.uid() = user_id);
