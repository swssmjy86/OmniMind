-- MBTI·혈액형을 온보딩·계산에서 제거(2026-07-20, PROFILE_CONTEXT_VERSION 3→4) — 신규
-- 프로필은 이 두 컬럼을 더 이상 채우지 않는다. 기존 사용자 데이터는 보존한다(DROP하지 않음),
-- 그래서 NOT NULL 제약만 해제한다.
alter table public.profiles alter column blood_type drop not null;
alter table public.profiles alter column mbti drop not null;
