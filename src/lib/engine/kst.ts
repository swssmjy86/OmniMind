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

/** "YYYY-MM-DDTHH:mm" (KST 벽시계) → 절대 instant */
export function kstStringToInstant(s: string): Date {
  return new Date(`${s}:00+09:00`);
}
