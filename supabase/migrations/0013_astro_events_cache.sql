-- 천문현상(KASI AstroEventInfoService) 전역 캐시 — 날짜당 1행, 사용자 무관.
-- 실행: Supabase 대시보드 SQL Editor에 붙여넣고 Run.
--
-- interpretations 테이블은 user_id not null이라 재사용할 수 없다(이 데이터는 사용자와
-- 무관하게 그날 하루 전체에 동일). templates 테이블과 같은 이유로 RLS를 걸지 않는다
-- (비민감·전역 공개 데이터, 쓰기는 서버(service role)에서만 일어난다).
create table if not exists public.astro_events_cache (
  target_date date primary key,
  events jsonb not null,           -- AstroEvent[] — 비어 있으면 그날 특이 천문현상 없음
  created_at timestamptz not null default now()
);
