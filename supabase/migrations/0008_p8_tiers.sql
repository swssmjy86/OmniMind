-- P8 3단계 요금제(무료·로그인·구독) + 마음/고민 로그 삭제. (0007 이후 실행)
-- 실행: Supabase SQL Editor에 붙여넣고 Run.

-- 상담 크레딧 잔액 — 하루 1회 무료(로그인) 이후 추가 상담에 쓰인다. 레거시 30일 이용권
-- (premium_until)은 구매 당시 약속대로 계속 무제한 유지, 신규 판매는 크레딧 방식으로 전환.
alter table public.profiles
  add column if not exists consult_credits int not null default 0;

-- 마음/고민 로그 삭제 — 본인 것만. 고민(interpretations)은 advice 종류만 삭제 허용
-- (profile/daily 스냅샷은 캐시 무결성을 위해 삭제 대상에서 제외).
drop policy if exists "own chat: delete" on public.chat_messages;
create policy "own chat: delete" on public.chat_messages
  for delete using (auth.uid() = user_id);

drop policy if exists "own advice: delete" on public.interpretations;
create policy "own advice: delete" on public.interpretations
  for delete using (auth.uid() = user_id and kind = 'advice');

-- 크레딧 소비 — 본인 것만, 원자적 차감(잔액 0 미만 방지). auth.uid()로 스스로 범위를
-- 제한하므로 authenticated에 그대로 실행 권한을 줘도 안전하다(consult_credits 컬럼 자체는
-- 아래처럼 일반 UPDATE 권한에서 계속 제외되어, 이 함수를 거치지 않은 직접 증액은 불가능).
create or replace function public.consume_consult_credit()
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_remaining int;
begin
  update public.profiles
     set consult_credits = consult_credits - 1
   where user_id = auth.uid() and consult_credits > 0
   returning consult_credits into v_remaining;
  return v_remaining; -- null이면 잔여 크레딧 없음(호출측이 처리)
end;
$$;
grant execute on function public.consume_consult_credit() to authenticated;

-- 결제 주문 — 기존 payments(0007)는 "이용권(pass)" 전용으로 만들어졌다. 크레딧 패키지 주문을
-- 같은 테이블에 kind로 구분해 담는다(감사·CS 기록을 한 곳에 유지).
alter table public.payments add column if not exists kind text not null default 'pass' check (kind in ('pass','credits'));
alter table public.payments add column if not exists credits int; -- 구매 수량(kind='credits'일 때)
alter table public.payments add column if not exists granted_credits int; -- 부여된 크레딧(멱등 마커, done인데 null이면 부여 누락)

-- 크레딧 부여 — 주문 단위로 원자적·1회만. grant_premium_for_order(0007)와 동일한 행 락 패턴.
create or replace function public.grant_credits_for_order(p_order text, p_credits int)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid;
  v_balance int;
begin
  select user_id into v_user
    from public.payments
   where order_id = p_order and status = 'done' and granted_credits is null
     for update;
  if not found then
    -- 이미 부여됐으면 그 값을, 대상이 아니면 null을 돌려준다(멱등)
    select granted_credits into v_balance from public.payments where order_id = p_order;
    return v_balance;
  end if;
  update public.profiles
     set consult_credits = consult_credits + p_credits
   where user_id = v_user
   returning consult_credits into v_balance;
  update public.payments set granted_credits = p_credits where order_id = p_order;
  return v_balance;
end;
$$;
-- security definer 함수는 기본이 public 실행 가능 — service role 전용으로 잠근다(금액이 걸린 부여 로직).
revoke all on function public.grant_credits_for_order(text, int) from public, anon, authenticated;
