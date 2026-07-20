import { describe, expect, it } from "vitest";
import { isPremium, consultAccess, readingAccess, UNLIMITED, type ReadingProduct } from "./quota";

const NOW = new Date("2026-07-14T12:00:00+09:00");

describe("레거시 프리미엄 게이트 (P7)", () => {
  it("premium_until이 미래면 프리미엄", () => {
    expect(isPremium("2026-08-01T00:00:00Z", NOW)).toBe(true);
  });
  it("과거·null·잘못된 값은 무료", () => {
    expect(isPremium("2026-07-01T00:00:00Z", NOW)).toBe(false);
    expect(isPremium(null, NOW)).toBe(false);
    expect(isPremium(undefined, NOW)).toBe(false);
    expect(isPremium("not-a-date", NOW)).toBe(false);
  });
});

// 무료 전환(2026-07-21): 로그인 사용자는 premium_until·credits·usedToday와 무관하게
// 항상 무제한 무료 허용, usesCredit은 항상 false(유료 모델 자동 호출 방지). 결제/크레딧
// 코드 자체는 quota.ts에 그대로 남아있고 FREE_FOR_ALL 플래그로만 우회되므로, 여기서는
// "입력이 뭐든 결과가 항상 같다"는 현재 활성 동작만 검증한다.
describe("상담 접근 규칙 (P8, 무료 전환 후)", () => {
  it("프리미엄·크레딧·오늘 사용량과 무관하게 항상 무제한 무료", () => {
    const cases: Array<[string | null, number, number]> = [
      ["2027-01-01T00:00:00Z", 0, 999],
      [null, 3, 0],
      [null, 0, 1],
      [null, 0, 100],
    ];
    for (const [premiumUntil, credits, usedToday] of cases) {
      expect(consultAccess(premiumUntil, credits, usedToday, NOW)).toEqual({
        allowed: true, usesCredit: false, remaining: UNLIMITED,
      });
    }
  });
});

describe("readingAccess — 무료 전환 후 (P9 §6.3, 2단계 스펙 §2)", () => {
  const now = new Date("2026-07-19T12:00:00+09:00");
  const ALL: ReadingProduct[] = ["chongun", "career", "love", "wealth", "match", "marriage"];

  it("비로그인은 여전히 전 상품 login 잠금(무료 전환 대상은 로그인 사용자뿐)", () => {
    for (const p of ALL) {
      expect(readingAccess(p, { loggedIn: false, credits: 5, premiumUntil: null, now })).toEqual({
        allowed: false, lockReason: "login", consumesCredit: false,
      });
    }
  });

  it("로그인이면 크레딧·프리미엄과 무관하게 전 상품 무료·무제한 허용", () => {
    for (const p of ALL) {
      for (const credits of [0, 5]) {
        for (const premiumUntil of [null, "2027-01-01T00:00:00+09:00"]) {
          expect(readingAccess(p, { loggedIn: true, credits, premiumUntil, now })).toEqual({
            allowed: true, lockReason: null, consumesCredit: false,
          });
        }
      }
    }
  });
});
