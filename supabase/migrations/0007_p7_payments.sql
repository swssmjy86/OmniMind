-- P7-3 결제 — 이용권 결제 기록 + premium_until 서버 전용 잠금. (0006 이후 실행)
-- 실행: Supabase SQL Editor에 붙여넣고 Run. **재실행 안전** — 이전 버전을 이미 실행했다면
-- 반드시 이 버전으로 다시 Run 해야 한다(grant 목록 수정 + 부여 함수 추가).

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
-- 부여 기록: 이 주문으로 연장된 premium_until. done인데 null이면 "승인됐지만 부여 누락"
-- 상태라는 뜻이고, grant_premium_for_order 재호출로 자가 복구된다.
alter table public.payments add column if not exists granted_until timestamptz;
create index if not exists payments_user_time on public.payments(user_id, created_at);

alter table public.payments enable row level security;

drop policy if exists "own payments: select" on public.payments;
create policy "own payments: select" on public.payments
  for select using (auth.uid() = user_id);

-- 프리미엄 부여 — 주문 단위로 원자적·1회만. 행 락(for update)으로 동시 승인 요청을
-- 직렬화해 이중 부여를 막고, 서로 다른 주문의 동시 부여도 단일 UPDATE라 연장이 유실되지 않는다.
create or replace function public.grant_premium_for_order(p_order text, p_days int)
returns timestamptz
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid;
  v_until timestamptz;
begin
  select user_id into v_user
    from public.payments
   where order_id = p_order and status = 'done' and granted_until is null
     for update;
  if not found then
    -- 이미 부여됐으면 그 값을, 대상이 아니면 null을 돌려준다(멱등)
    select granted_until into v_until from public.payments where order_id = p_order;
    return v_until;
  end if;
  update public.profiles
     set premium_until = greatest(coalesce(premium_until, now()), now())
                         + make_interval(days => p_days)
   where user_id = v_user
   returning premium_until into v_until;
  update public.payments set granted_until = v_until where order_id = p_order;
  return v_until;
end;
$$;
-- security definer 함수는 기본이 public 실행 가능 — service role 전용으로 잠근다.
revoke all on function public.grant_premium_for_order(text, int) from public, anon, authenticated;

-- premium_until 잠금: RLS own-row update 정책(0001)은 그대로 두되,
-- 컬럼 단위 GRANT로 재구성해 결제 승인 경로(service role) 외에는 갱신 불가하게 한다.
-- (권한은 가산식이라 컬럼 하나만 revoke할 수 없어, 테이블 UPDATE를 회수하고
--  premium_until을 제외한 컬럼 목록으로 다시 부여한다.)
-- user_id가 목록에 있어야 하는 이유: 온보딩 upsert가 페이로드 전 컬럼으로
-- ON CONFLICT DO UPDATE SET을 만들기 때문에, SET에 오르는 모든 컬럼의 UPDATE 권한이
-- 필요하다(충돌이 없어도 검사됨). 다른 사람 행으로 바꾸는 것은 RLS(auth.uid()=user_id)가 막는다.
revoke update on public.profiles from authenticated, anon;
grant update (user_id, nickname, birth_date, birth_time, time_unknown, blood_type, mbti,
              profile_context, gender, updated_at)
  on public.profiles to authenticated;
