-- P7-2 초대 연결 — 양방향 심층 궁합. (0001 이후 실행)
-- 초대자·수락자 프로필을 행에 스냅샷으로 담아, profiles의 본인-전용 RLS를 건드리지 않는다.

create table if not exists public.connections (
  id uuid primary key default gen_random_uuid(),
  token text not null unique,          -- 초대 링크 토큰(무작위 uuid)
  mode text not null check (mode in ('lover','friend','coworker')),
  status text not null default 'pending' check (status in ('pending','accepted')),
  inviter_id uuid not null references auth.users(id) on delete cascade,
  inviter_nickname text not null,
  inviter_profile jsonb not null,      -- ProfileContext 스냅샷
  invitee_id uuid references auth.users(id) on delete cascade,
  invitee_nickname text,
  invitee_profile jsonb,
  created_at timestamptz not null default now(),
  accepted_at timestamptz
);
create index if not exists connections_inviter on public.connections(inviter_id, created_at);
create index if not exists connections_invitee on public.connections(invitee_id, created_at);

alter table public.connections enable row level security;

drop policy if exists "conn: select" on public.connections;
drop policy if exists "conn: insert" on public.connections;
drop policy if exists "conn: accept" on public.connections;

-- 토큰(URL)을 받은 사람이 초대장을 열람해야 하므로 pending은 조회 허용.
-- 토큰이 무작위 uuid라 URL 없이는 도달 불가. accepted는 두 당사자만.
create policy "conn: select" on public.connections
  for select using (
    auth.uid() = inviter_id or auth.uid() = invitee_id or status = 'pending'
  );
create policy "conn: insert" on public.connections
  for insert with check (auth.uid() = inviter_id);
-- 수락: 초대자가 아닌 로그인 사용자가 자신을 invitee로 채우며 accepted로 전환.
create policy "conn: accept" on public.connections
  for update using (status = 'pending' and auth.uid() is not null and auth.uid() <> inviter_id)
  with check (status = 'accepted' and invitee_id = auth.uid());
