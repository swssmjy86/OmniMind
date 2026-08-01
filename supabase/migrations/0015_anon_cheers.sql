-- 0015 익명 응원(cheers) — 로그인 없이 남기는 짧은 응원 한마디. 계정 개념이 없어 user_id 없음.
-- 완전 익명 전환(2026-08-01)에서 유일하게 서버에 남는 사용자 상호작용. 읽기는 누구나(anon),
-- 쓰기는 서버(service_role, 검증 후 insert)만 — anon insert 정책을 열지 않아 스팸 표면을 줄인다.
create table if not exists public.cheers (
  id uuid primary key default gen_random_uuid(),
  message text not null,
  created_at timestamptz not null default now()
);

alter table public.cheers enable row level security;

-- 읽기 공개(anon 키로 목록 조회 가능). 쓰기 정책은 없음 → service_role만 insert.
drop policy if exists cheers_select_all on public.cheers;
create policy cheers_select_all on public.cheers for select using (true);

create index if not exists cheers_created_at_idx on public.cheers (created_at desc);
