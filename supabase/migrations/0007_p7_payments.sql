-- P7-3 결제 — 이용권 결제 기록 + premium_until 서버 전용 잠금. (0006 이후 실행)
-- 실행: Supabase SQL Editor에 붙여넣고 Run.

-- 결제 기록: 주문 생성(pending) → 토스 승인(done) / 실패(failed).
-- 쓰기 정책이 없으므로 클라이언트(JWT)로는 조회만 가능하고,
-- insert/update는 서버의 service role 경로(결제 승인 검증 후)로만 일어난다.
create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  order_id text not null unique,
  payment_key text unique,           -- 토스 paymentKey (승인 후 기록)
  amount int not null,
  status text not null check (status in ('pending','done','failed')) default 'pending',
  raw jsonb,                         -- 토스 응답 원본 (감사·CS용)
  created_at timestamptz not null default now(),
  approved_at timestamptz
);
create index if not exists payments_user_time on public.payments(user_id, created_at);

alter table public.payments enable row level security;

drop policy if exists "own payments: select" on public.payments;
create policy "own payments: select" on public.payments
  for select using (auth.uid() = user_id);

-- premium_until 잠금: RLS own-row update 정책(0001)은 그대로 두되,
-- 컬럼 단위 GRANT로 재구성해 결제 승인 경로(service role) 외에는 갱신 불가하게 한다.
-- (권한은 가산식이라 컬럼 하나만 revoke할 수 없어, 테이블 UPDATE를 회수하고
--  premium_until을 제외한 컬럼 목록으로 다시 부여한다.)
revoke update on public.profiles from authenticated, anon;
grant update (nickname, birth_date, birth_time, time_unknown, blood_type, mbti,
              profile_context, gender, updated_at)
  on public.profiles to authenticated;
