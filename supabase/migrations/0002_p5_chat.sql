-- P5 AI 챗 스키마 + RLS. (0001 이후 실행)
-- 실행: Supabase SQL Editor에 붙여넣고 Run.

-- 챗 메시지 — 동반자의 '기억'.
create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('user','assistant')),
  content text not null,
  source text check (source in ('llm','template')),
  created_at timestamptz not null default now()
);
create index if not exists chat_messages_user_time
  on public.chat_messages(user_id, created_at);

-- 일일 사용량 — 하루 10회 제한(쿼터 보호 + 프리미엄 판매 포인트).
create table if not exists public.usage_counters (
  user_id uuid not null references auth.users(id) on delete cascade,
  day date not null,
  chat_count int not null default 0,
  primary key (user_id, day)
);

alter table public.chat_messages enable row level security;
alter table public.usage_counters enable row level security;

drop policy if exists "own chat: select" on public.chat_messages;
drop policy if exists "own chat: insert" on public.chat_messages;
create policy "own chat: select" on public.chat_messages
  for select using (auth.uid() = user_id);
create policy "own chat: insert" on public.chat_messages
  for insert with check (auth.uid() = user_id);

drop policy if exists "own usage: select" on public.usage_counters;
drop policy if exists "own usage: insert" on public.usage_counters;
drop policy if exists "own usage: update" on public.usage_counters;
create policy "own usage: select" on public.usage_counters
  for select using (auth.uid() = user_id);
create policy "own usage: insert" on public.usage_counters
  for insert with check (auth.uid() = user_id);
create policy "own usage: update" on public.usage_counters
  for update using (auth.uid() = user_id);
