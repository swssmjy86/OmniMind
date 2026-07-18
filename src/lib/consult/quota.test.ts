import { describe, expect, it } from "vitest";
import { isPremium, consultAccess, UNLIMITED, FREE_DAILY_CONSULT, readingAccess, type ReadingProduct } from "./quota";

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

describe("상담 접근 규칙 (P8)", () => {
  it("레거시 프리미엄은 사용량·크레딧과 무관하게 무제한", () => {
    expect(consultAccess("2027-01-01T00:00:00Z", 0, 999, NOW))
      .toEqual({ allowed: true, usesCredit: false, remaining: UNLIMITED });
  });

  it("오늘 무료 슬롯이 남아 있으면 크레딧을 쓰지 않는다", () => {
    expect(consultAccess(null, 3, 0, NOW))
      .toEqual({ allowed: true, usesCredit: false, remaining: FREE_DAILY_CONSULT + 3 });
  });

  it("무료 슬롯 소진 후 크레딧이 있으면 크레딧을 소비하며 진행", () => {
    expect(consultAccess(null, 2, FREE_DAILY_CONSULT, NOW))
      .toEqual({ allowed: true, usesCredit: true, remaining: 2 });
  });

  it("무료 슬롯 소진 + 크레딧 0이면 차단", () => {
    expect(consultAccess(null, 0, FREE_DAILY_CONSULT, NOW))
      .toEqual({ allowed: false, usesCredit: false, remaining: 0 });
  });

  it("사용량이 무료 한도를 넘겨도(음수 방지) 크레딧 로직은 정상 동작", () => {
    expect(consultAccess(null, 5, FREE_DAILY_CONSULT + 10, NOW))
      .toEqual({ allowed: true, usesCredit: true, remaining: 5 });
  });
});

describe("readingAccess — 상품별 접근 규칙 전수 (P9 §6.3, 2단계 스펙 §2)", () => {
  const now = new Date("2026-07-19T12:00:00+09:00");
  const CREDIT_PRODUCTS: ReadingProduct[] = ["career", "love", "wealth", "match", "marriage"];
  const ALL: ReadingProduct[] = ["chongun", ...CREDIT_PRODUCTS];

  it("비로그인 — 전 상품 login 잠금", () => {
    for (const p of ALL) {
      expect(readingAccess(p, { loggedIn: false, credits: 5, premiumUntil: null, now })).toEqual({
        allowed: false, lockReason: "login", consumesCredit: false,
      });
    }
  });

  it("로그인 — 총운은 크레딧 0이어도 무료 허용", () => {
    expect(readingAccess("chongun", { loggedIn: true, credits: 0, premiumUntil: null, now })).toEqual({
      allowed: true, lockReason: null, consumesCredit: false,
    });
  });

  it("로그인 — 크레딧 상품: 크레딧 있으면 허용·소비, 없으면 credit 잠금", () => {
    for (const p of CREDIT_PRODUCTS) {
      expect(readingAccess(p, { loggedIn: true, credits: 2, premiumUntil: null, now })).toEqual({
        allowed: true, lockReason: null, consumesCredit: true,
      });
      expect(readingAccess(p, { loggedIn: true, credits: 0, premiumUntil: null, now })).toEqual({
        allowed: false, lockReason: "credit", consumesCredit: false,
      });
    }
  });

  it("레거시 프리미엄 — 크레딧 상품도 차감 없이 무제한(P8 약속 유지)", () => {
    const future = "2027-01-01T00:00:00+09:00";
    for (const p of CREDIT_PRODUCTS) {
      expect(readingAccess(p, { loggedIn: true, credits: 0, premiumUntil: future, now })).toEqual({
        allowed: true, lockReason: null, consumesCredit: false,
      });
    }
    // 만료된 프리미엄은 무시된다
    expect(
      readingAccess("career", { loggedIn: true, credits: 0, premiumUntil: "2026-01-01T00:00:00+09:00", now }),
    ).toEqual({ allowed: false, lockReason: "credit", consumesCredit: false });
  });
});
