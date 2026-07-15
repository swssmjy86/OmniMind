import { PASS_DAYS } from "./constants";

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * 이용권 연장 후의 premium_until을 계산한다 (순수 함수 — now는 호출자가 전달).
 * 남은 기간이 있으면 만료일 위에 누적하고, 없거나 만료·깨진 값이면 now 기준으로 센다.
 */
export function extendPremium(
  current: string | null | undefined,
  now: Date,
  days: number = PASS_DAYS,
): string {
  let base = now.getTime();
  if (current) {
    const t = new Date(current).getTime();
    if (Number.isFinite(t) && t > base) base = t;
  }
  return new Date(base + days * DAY_MS).toISOString();
}
