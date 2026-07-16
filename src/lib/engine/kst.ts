// KST(동경 135°, UTC+9) 벽시계를 런타임 타임존과 무관하게 다루기 위한 헬퍼.
// Vercel 등 서버는 UTC로 동작하므로 Date의 로컬 게터(getHours 등)를 쓰면 안 된다.
// 절대 instant(epoch)만 신뢰하고, KST 컴포넌트는 +9h 시프트 후 getUTC*로 읽는다.

export const KST_OFFSET_MS = 9 * 3600_000;

export interface KstParts {
  y: number;
  mo: number; // 1~12
  d: number;
  h: number; // 0~23
  mi: number; // 0~59
}

/** 절대 instant → KST 벽시계 컴포넌트 (런타임 TZ 무관) */
export function toKstParts(instant: Date): KstParts {
  const s = new Date(instant.getTime() + KST_OFFSET_MS);
  return {
    y: s.getUTCFullYear(),
    mo: s.getUTCMonth() + 1,
    d: s.getUTCDate(),
    h: s.getUTCHours(),
    mi: s.getUTCMinutes(),
  };
}

/** KST 벽시계 컴포넌트 → 절대 instant */
export function kstPartsToInstant(p: KstParts): Date {
  return new Date(Date.UTC(p.y, p.mo - 1, p.d, p.h, p.mi) - KST_OFFSET_MS);
}

const KST_STRING = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/;

/** "YYYY-MM-DDTHH:mm" 또는 "YYYY-MM-DDTHH:mm:ss" (KST 벽시계) → 절대 instant.
 *  절기 테이블은 경계 판정을 위해 초까지 담고 있어 두 형식을 모두 받는다.
 *
 *  형식이나 값이 틀리면 여기서 던진다. Invalid Date를 그대로 흘려보내면 NaN이 절기 테이블
 *  조회까지 타고 내려가 "SOLAR_TERMS[NaN]" 같은 엉뚱한 지점에서 터진다 — 원인을 못 찾는다. */
export function kstStringToInstant(s: string): Date {
  if (!KST_STRING.test(s)) throw new Error(`KST 시각 형식 오류: ${s}`);
  const d = new Date(`${s.length === 16 ? `${s}:00` : s}+09:00`);
  if (Number.isNaN(d.getTime())) throw new Error(`KST 시각 값 오류: ${s}`); // 예: 25:99, 02-30
  return d;
}
