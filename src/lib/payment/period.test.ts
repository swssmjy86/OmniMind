import { describe, expect, it } from "vitest";
import { extendPremium } from "./period";

// 이용권 연장 규칙: 아직 남아 있으면 만료일 위에 누적, 만료됐거나 없으면 지금부터 30일.
describe("extendPremium", () => {
  const now = new Date("2026-07-15T03:00:00.000Z");

  it("premium_until이 없으면 지금부터 30일", () => {
    expect(extendPremium(null, now)).toBe("2026-08-14T03:00:00.000Z");
    expect(extendPremium(undefined, now)).toBe("2026-08-14T03:00:00.000Z");
  });

  it("아직 남아 있으면 만료일 위에 누적 연장 — 일찍 결제해도 손해가 없다", () => {
    expect(extendPremium("2026-07-20T00:00:00.000Z", now)).toBe("2026-08-19T00:00:00.000Z");
  });

  it("이미 만료됐으면 지금부터 30일", () => {
    expect(extendPremium("2026-07-01T00:00:00.000Z", now)).toBe("2026-08-14T03:00:00.000Z");
  });

  it("경계: 만료 시각 == 지금이면 지금부터 30일", () => {
    expect(extendPremium("2026-07-15T03:00:00.000Z", now)).toBe("2026-08-14T03:00:00.000Z");
  });

  it("깨진 날짜 문자열은 없는 것으로 취급한다", () => {
    expect(extendPremium("not-a-date", now)).toBe("2026-08-14T03:00:00.000Z");
  });

  it("일수를 바꿔 연장할 수 있다", () => {
    expect(extendPremium(null, now, 7)).toBe("2026-07-22T03:00:00.000Z");
  });
});
