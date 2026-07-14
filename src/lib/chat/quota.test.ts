import { describe, expect, it } from "vitest";
import { isPremium, chatRemaining, UNLIMITED } from "./quota";
import { DAILY_LIMIT } from "./constants";

const NOW = new Date("2026-07-14T12:00:00+09:00");

describe("프리미엄 게이트 (P7)", () => {
  it("premium_until이 미래면 프리미엄", () => {
    expect(isPremium("2026-08-01T00:00:00Z", NOW)).toBe(true);
  });
  it("과거·null·잘못된 값은 무료", () => {
    expect(isPremium("2026-07-01T00:00:00Z", NOW)).toBe(false);
    expect(isPremium(null, NOW)).toBe(false);
    expect(isPremium(undefined, NOW)).toBe(false);
    expect(isPremium("not-a-date", NOW)).toBe(false);
  });

  it("무료 사용자는 잔여 횟수가 줄고 0에서 멈춘다", () => {
    expect(chatRemaining(null, 0, NOW)).toBe(DAILY_LIMIT);
    expect(chatRemaining(null, 3, NOW)).toBe(DAILY_LIMIT - 3);
    expect(chatRemaining(null, DAILY_LIMIT + 5, NOW)).toBe(0);
  });
  it("프리미엄은 사용량과 무관하게 무제한", () => {
    expect(chatRemaining("2027-01-01T00:00:00Z", 999, NOW)).toBe(UNLIMITED);
  });
});
