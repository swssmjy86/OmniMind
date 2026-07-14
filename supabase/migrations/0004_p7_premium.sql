-- P7 프리미엄 준비 — 구독 만료 시각. (0001 이후 실행)
-- 결제 연동 전 단계라 수동 부여(SQL)로 시작한다. null = 무료.
-- 예: update public.profiles set premium_until = now() + interval '30 days' where user_id = '...';

alter table public.profiles
  add column if not exists premium_until timestamptz;
