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

-- RLS를 걸지 않는 대신 쓰기 권한을 명시적으로 회수한다. Supabase는 public 스키마의 신규
-- 테이블에 anon/authenticated 쓰기 권한을 기본 부여하므로, 이 REVOKE 없이는 누구나 공개
-- anon 키로 이 전역 캐시(모든 사용자에게 노출됨)를 직접 덮어쓸 수 있다. 조회(select)는
-- 비민감 공개 데이터라 그대로 열어둔다. 쓰기는 astro-events-cache.ts의 admin(service role)
-- 클라이언트만 한다 — service_role은 RLS·GRANT를 모두 우회하므로 이 REVOKE의 영향을 받지 않는다.
revoke insert, update, delete on public.astro_events_cache from anon, authenticated;
