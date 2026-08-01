// 익명 응원 입력 검증 — 순수 함수. 서버 액션이 insert 전에 반드시 거친다.
export const CHEER_MIN = 2;
export const CHEER_MAX = 200;

export type CheerValidation = { ok: true; value: string } | { ok: false };

/** 앞뒤 공백·연속 공백을 정리하고 길이를 검사한다. */
export function validateCheer(raw: string): CheerValidation {
  const message = raw.trim().replace(/\s+/g, " ");
  if (message.length < CHEER_MIN || message.length > CHEER_MAX) return { ok: false };
  return { ok: true, value: message };
}
