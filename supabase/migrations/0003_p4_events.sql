-- P4 성장 지표 events + RLS. (0002 이후 실행)
-- 실행: Supabase SQL Editor에 붙여넣고 Run.

-- 성장 이벤트 — 온보딩 완주·카드 생성/공유·유입 경로. 개인 식별 최소화(props에 유형 조합만).
create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  name text not null check (char_length(name) between 1 and 40),
  props jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists events_name_time on public.events(name, created_at);

alter table public.events enable row level security;

-- 기록(insert)만 공개 — 본인 것 또는 익명(비로그인 유입). 조회는 대시보드(service role) 전용.
drop policy if exists "events: insert own or anon" on public.events;
create policy "events: insert own or anon" on public.events
  for insert with check (user_id is null or auth.uid() = user_id);
