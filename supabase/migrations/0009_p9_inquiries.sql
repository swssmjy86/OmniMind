-- P9 1단계: 문의(§9.2). (0008 이후 실행)
-- 실행: Supabase SQL Editor에 붙여넣고 Run.
-- §6.1의 readings·reading_reviews는 2단계(내 사주 심층 풀이) 마이그레이션에서 만든다.

create table if not exists public.inquiries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,  -- 비로그인 문의 허용
  email text not null,
  subject text not null,
  body text not null,
  created_at timestamptz not null default now()
);

alter table public.inquiries enable row level security;

-- 쓰기는 서버 액션(service role)만 — 비로그인 문의를 받기 위해 anon insert 정책을 여는
-- 대신, 검증을 마친 서버만 쓰게 해 스팸 표면을 줄인다. 읽기는 본인 것만.
drop policy if exists "own inquiries: select" on public.inquiries;
create policy "own inquiries: select" on public.inquiries
  for select using (auth.uid() = user_id);
