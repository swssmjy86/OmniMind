import { describe, expect, it } from "vitest";
import { computeProfile, dayMasterOf, PROFILE_CONTEXT_VERSION } from "./index";
import { CASES } from "./fixtures/manseryeok-cases";
import { dayMasterStrength, detectPatterns } from "./strength";

describe("computeProfile — 만세력 대조 코퍼스", () => {
  it.each(CASES)("$label", (c) => {
    const p = computeProfile(c.input);
    expect(p.pillars.year).toBe(c.expect.year);
    expect(p.pillars.month).toBe(c.expect.month);
    expect(p.pillars.day).toBe(c.expect.day);
    expect(p.pillars.hour).toBe(c.expect.hour);
  });
});

describe("computeProfile — 통합·계약", () => {
  const base = {
    birthDate: "1995-08-20", birthTime: "14:30", timeUnknown: false,
  };

  it("전체 컨텍스트를 채운다", () => {
    const p = computeProfile(base);
    expect(p.version).toBe(PROFILE_CONTEXT_VERSION);
    expect(p.dayMaster.stem).toBe("계"); // 계묘일 → 일간 계
    expect(p.dayMaster.element).toBe("수");
    expect(p.dayMaster.yang).toBe(false);
    expect(p.zodiac).toBe("사자자리"); // 8/20
    expect(p.elements.counts).toBeDefined();
    expect(p.tenGods.yearStem).toBeDefined();
  });

  it("신강/신약과 격국 패턴이 십성표에서 결정론적으로 파생돼 함께 담긴다", () => {
    const p = computeProfile(base);
    expect(["신강", "신약", "중화"]).toContain(p.strength);
    expect(Array.isArray(p.patterns)).toBe(true);
    // 직접 계산과 일치 — computeProfile 내부 배선이 strength.ts를 그대로 쓰는지 감사
    expect(p.strength).toBe(dayMasterStrength(p.tenGods));
    expect(p.patterns).toEqual(detectPatterns(p.tenGods));
  });

  it("십이신살이 일지 기준 네 기둥에 함께 담긴다", () => {
    const p = computeProfile(base);
    expect(p.sinsal.year).toBeDefined();
    expect(p.sinsal.month).toBeDefined();
    expect(p.sinsal.day).toBeDefined();
    // 일지 자기 자신은 생지·왕지·고지에 따라 지살·장성살·화개살 중 하나여야 한다
    expect(["지살", "장성살", "화개살"]).toContain(p.sinsal.day);
  });

  it("timeUnknown이면 sinsal.hour는 null", () => {
    const p = computeProfile({ ...base, birthTime: null, timeUnknown: true });
    expect(p.sinsal.hour).toBeNull();
  });

  it("출력은 JSON 직렬화 가능(순수 데이터)", () => {
    const p = computeProfile(base);
    expect(() => JSON.parse(JSON.stringify(p))).not.toThrow();
  });

  it("timeUnknown이면 hour 관련이 모두 null", () => {
    const p = computeProfile({ ...base, birthTime: null, timeUnknown: true });
    expect(p.pillars.hour).toBeNull();
    expect(p.tenGods.hourStem).toBeNull();
    expect(p.tenGods.hourBranch).toBeNull();
    expect(p.meta.timeUnknown).toBe(true);
  });

  it("잘못된 입력을 거부한다", () => {
    expect(() => computeProfile({ ...base, birthDate: "1800-01-01" })).toThrow(RangeError);
    expect(() => computeProfile({ ...base, birthTime: null, timeUnknown: false })).toThrow();
    expect(() => computeProfile({ ...base, birthDate: "1995/08/20" })).toThrow();
  });

  it("대조 코퍼스를 최소 20건 보유(년주·오호둔·오서둔 감사 + 앵커 외부확정)", () => {
    expect(CASES.length).toBeGreaterThanOrEqual(20);
  });
});

describe("dayMasterOf — MBTI·혈액형 없이 일간만 가볍게 계산", () => {
  it("computeProfile의 dayMaster와 동일한 값을 낸다(시간 앎)", () => {
    const p = computeProfile({
      birthDate: "1995-08-20", birthTime: "14:30", timeUnknown: false,
    });
    const dm = dayMasterOf("1995-08-20", "14:30", false);
    expect(dm.stem).toBe(p.dayMaster.stem);
    expect(dm.element).toBe(p.dayMaster.element);
  });

  it("computeProfile의 dayMaster와 동일한 값을 낸다(시간 모름)", () => {
    const p = computeProfile({
      birthDate: "1995-08-20", birthTime: null, timeUnknown: true,
    });
    const dm = dayMasterOf("1995-08-20", null, true);
    expect(dm.stem).toBe(p.dayMaster.stem);
    expect(dm.element).toBe(p.dayMaster.element);
  });

  it("잘못된 birthDate는 거부한다", () => {
    expect(() => dayMasterOf("1995/08/20", null, true)).toThrow();
  });
});
