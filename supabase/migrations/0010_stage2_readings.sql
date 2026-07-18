-- IA 2단계: 풀이 캐싱(P9 §6.1·§6.2) — "같은 해석을 두 번 생성하지 않는다". (0009 이후 실행)
-- 실행: Supabase SQL Editor에 붙여넣고 Run.
-- reading_reviews(후기)는 4단계 마이그레이션에서 만든다.

create table if not exists public.readings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  product text not null,              -- "chongun" | (3단계) "career" | "love" | ...
  input_hash text not null,           -- 입력(프로필·대운 간지) 해시 — 바뀌면 재생성
  context_version int not null,       -- PROFILE_CONTEXT_VERSION — 낮으면 재계산 대상
  sections jsonb not null,
  created_at timestamptz not null default now(),
  unique (user_id, product, input_hash)
);

alter table public.readings enable row level security;

-- 본인 행만 select/insert(P9 §6.1). 갱신·삭제는 열지 않는다 — 캐시는 불변, 새 입력은 새 행.
drop policy if exists "own readings: select" on public.readings;
create policy "own readings: select" on public.readings
  for select using (auth.uid() = user_id);
drop policy if exists "own readings: insert" on public.readings;
create policy "own readings: insert" on public.readings
  for insert with check (auth.uid() = user_id);
