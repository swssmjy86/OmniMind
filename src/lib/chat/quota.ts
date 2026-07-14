import { DAILY_LIMIT } from "./constants";

// P7 프리미엄 — 챗 무제한 게이트. 결제 연동 전엔 premium_until 수동 부여로 동작.

/** 무제한을 뜻하는 잔여 횟수 센티널(서버 액션 직렬화 때문에 Infinity 대신 사용). */
export const UNLIMITED = -1;

/** 프리미엄 여부 — premium_until이 미래면 참. */
export function isPremium(premiumUntil: string | null | undefined, now: Date): boolean {
  if (!premiumUntil) return false;
  const t = new Date(premiumUntil).getTime();
  return Number.isFinite(t) && t > now.getTime();
}

/** 오늘 잔여 챗 횟수. 프리미엄이면 UNLIMITED(-1). */
export function chatRemaining(
  premiumUntil: string | null | undefined,
  used: number,
  now: Date,
): number {
  if (isPremium(premiumUntil, now)) return UNLIMITED;
  return Math.max(0, DAILY_LIMIT - used);
}
