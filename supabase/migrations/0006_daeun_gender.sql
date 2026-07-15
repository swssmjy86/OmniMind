-- P8 대운(大運) — 성별(선택 입력)로 10년 단위 운의 흐름을 계산한다. (0001 이후 실행)
-- 성별은 선택 사항: null 허용, 미입력이어도 서비스는 완전 동작(대운 카드만 생략).
-- 코드는 이 컬럼이 없어도 깨지지 않게 방어한다(적용 전 스키마 호환).

alter table public.profiles
  add column if not exists gender text check (gender in ('male', 'female'));
