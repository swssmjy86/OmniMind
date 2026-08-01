-- 0015 익명 응원(cheers) — 로그인 없이 남기는 짧은 응원 한마디. 계정 개념이 없어 user_id 없음.
-- 완전 익명 전환(2026-08-01)에서 유일하게 서버에 남는 사용자 상호작용. 읽기는 누구나(anon SELECT),
-- 쓰기는 서버 액션(service_role, 검증 후 insert)만 한다 — anon insert 정책을 열지 않아 클라이언트가
-- 임의 형식으로 직접 쓰는 것을 막고 서버 검증(길이·공백)을 강제한다.
-- 주의: 이 서버 액션(submitCheer)은 누구나 호출 가능하고 아직 요청 빈도 제한(rate limit)이 없다.
-- 공개 응원 벽이라 대량 스팸 여지가 남아 있으며, IP 기준 스로틀·간이 신고/숨김은 후속 과제다.
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
