-- Add status column to assets table
alter table assets add column if not exists status text not null default 'pending' check (status in ('pending', 'processing', 'completed', 'failed'));

-- Add index for better query performance
create index if not exists idx_assets_status on assets(status);
create index if not exists idx_assets_user_status on assets(user_id, status);
