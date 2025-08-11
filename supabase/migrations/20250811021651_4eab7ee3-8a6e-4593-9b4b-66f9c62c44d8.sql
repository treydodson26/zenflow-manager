
-- Prompt A — Database prep: rate limits and threading

-- 1) Create per-user rate limit table
create table if not exists public.user_rate_limits (
  user_id uuid not null,
  window_start timestamptz not null default now(),
  request_count int not null default 0,
  constraint user_rate_limits_pkey primary key (user_id, window_start)
);

-- Enable RLS; no policies added so only the service role can access it.
alter table public.user_rate_limits enable row level security;

-- Remove any prior policies if they exist (keeping this table service-role only).
drop policy if exists "Allow select on user_rate_limits" on public.user_rate_limits;
drop policy if exists "Allow insert on user_rate_limits" on public.user_rate_limits;
drop policy if exists "Allow update on user_rate_limits" on public.user_rate_limits;
drop policy if exists "Allow delete on user_rate_limits" on public.user_rate_limits;

-- Helpful index for rate checks within a time window
create index if not exists idx_user_rate_limits_user_window
  on public.user_rate_limits (user_id, window_start desc);


-- 2) Add user_id to ai_threads and ai_messages for ownership scoping

alter table public.ai_threads add column if not exists user_id uuid;
alter table public.ai_messages add column if not exists user_id uuid;

-- Ensure RLS is enabled (idempotent)
alter table public.ai_threads enable row level security;
alter table public.ai_messages enable row level security;

-- Drop existing overly-permissive policies
drop policy if exists "Allow authenticated users to manage ai_threads" on public.ai_threads;
drop policy if exists "Allow authenticated users to manage ai_messages" on public.ai_messages;

-- New scoped policies:
-- Authenticated users can manage only their own rows, or legacy rows with user_id IS NULL (backward compatibility)
create policy "Authenticated users manage own ai_threads"
  on public.ai_threads
  for all
  to authenticated
  using (user_id = auth.uid() or user_id is null)
  with check (user_id = auth.uid() or user_id is null);

create policy "Authenticated users manage own ai_messages"
  on public.ai_messages
  for all
  to authenticated
  using (user_id = auth.uid() or user_id is null)
  with check (user_id = auth.uid() or user_id is null);


-- 3) Helpful indexes

-- For quickly listing a user's threads by recency
create index if not exists idx_ai_threads_user_created_at
  on public.ai_threads (user_id, created_at desc);

-- For rapidly loading a thread's messages in order
create index if not exists idx_ai_messages_thread_created_at
  on public.ai_messages (thread_id, created_at asc);
