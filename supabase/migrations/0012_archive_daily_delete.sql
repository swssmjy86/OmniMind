-- 보관함 로그 삭제: 오늘의운세 기록(kind='daily')도 본인 삭제 허용. (0011 이후 실행)
-- 실행: Supabase SQL Editor에 붙여넣고 Run.
--
-- 0008은 advice만 삭제를 열었다(당시 삭제 UI가 advice뿐). 개인정보처리방침 §4의
-- "마음(채팅)·고민 기록은 직접 삭제" 약속을 오늘의운세 기록까지 넓힌다(보관함 삭제 기능).
-- profile 스냅샷은 계속 제외(삭제 시 온보딩 재생성 필요 — 캐시 무결성).
-- 오늘 날짜 행을 지우면 다음 방문 때 하루 1회 데일리 캐시가 재생성될 수 있다(무료 티어
-- LLM 1회) — 사용자 권리가 우선이라 허용한다.

drop policy if exists "own daily: delete" on public.interpretations;
create policy "own daily: delete" on public.interpretations
  for delete using (auth.uid() = user_id and kind = 'daily');
