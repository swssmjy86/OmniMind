-- P2 프로필/해석 스키마 + RLS.
-- 실행: Supabase 대시보드 SQL Editor에 붙여넣고 Run. (또는 supabase db push)

-- 프로필: 1인 1행. 계산 결과(profile_context)를 jsonb로 영구 저장.
create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  nickname text not null,
  birth_date date not null,
  birth_time time,                 -- 출생시간 미상이면 null
  time_unknown boolean not null default false,
  blood_type text not null check (blood_type in ('A','B','O','AB')),
  mbti text not null check (char_length(mbti) = 4),
  profile_context jsonb not null,  -- computeProfile() 산출 ProfileContext
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 해석 캐시: 프로필/데일리/조언. 같은 것을 두 번 생성하지 않음.
create table if not exists public.interpretations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('profile','daily','advice')),
  target_date date,                -- daily용. profile은 null
  body jsonb not null,             -- 섹션 배열 {title, body}[]
  source text not null check (source in ('template','llm')) default 'template',
  created_at timestamptz not null default now(),
  unique (user_id, kind, target_date)
);

-- 템플릿(예약): P2는 TS 콘텐츠 모듈 사용. P5 LLM 캐시/CMS용.
create table if not exists public.templates (
  id uuid primary key default gen_random_uuid(),
  category text not null,
  combo_key text not null,
  text text not null,
  unique (category, combo_key)
);

-- RLS: 본인 행만 접근
alter table public.profiles enable row level security;
alter table public.interpretations enable row level security;

drop policy if exists "own profile: select" on public.profiles;
drop policy if exists "own profile: insert" on public.profiles;
drop policy if exists "own profile: update" on public.profiles;
create policy "own profile: select" on public.profiles
  for select using (auth.uid() = user_id);
create policy "own profile: insert" on public.profiles
  for insert with check (auth.uid() = user_id);
create policy "own profile: update" on public.profiles
  for update using (auth.uid() = user_id);

drop policy if exists "own interp: select" on public.interpretations;
drop policy if exists "own interp: insert" on public.interpretations;
create policy "own interp: select" on public.interpretations
  for select using (auth.uid() = user_id);
create policy "own interp: insert" on public.interpretations
  for insert with check (auth.uid() = user_id);
