-- IA 4단계: 풀이 후기(P9 §5.2·§6.1). (0010 이후 실행)
-- 실행: Supabase SQL Editor에 붙여넣고 Run.

create table if not exists public.reading_reviews (
  id uuid primary key default gen_random_uuid(),
  reading_id uuid not null references public.readings(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  rating int not null check (rating between 1 and 5),
  comment text check (char_length(comment) <= 200),
  created_at timestamptz not null default now(),
  unique (reading_id)                 -- 풀이 1건당 후기 1개
);

alter table public.reading_reviews enable row level security;

-- 본인 행만 select/insert. 공개 노출은 서버 admin 집계로만(익명 필드) — anon 정책 없음.
-- update/delete 정책도 없음: 후기는 불변(정정은 새 풀이에 새 후기).
drop policy if exists "own reviews: select" on public.reading_reviews;
create policy "own reviews: select" on public.reading_reviews
  for select using (auth.uid() = user_id);
drop policy if exists "own reviews: insert" on public.reading_reviews;
create policy "own reviews: insert" on public.reading_reviews
  for insert with check (auth.uid() = user_id);
