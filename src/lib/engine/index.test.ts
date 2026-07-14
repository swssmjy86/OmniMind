import { describe, expect, it } from "vitest";
import { computeProfile } from "./index";
import { CASES } from "./fixtures/manseryeok-cases";

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
    bloodType: "A" as const, mbti: "ENFP" as const,
  };

  it("전체 컨텍스트를 채운다", () => {
    const p = computeProfile(base);
    expect(p.version).toBe(1);
    expect(p.dayMaster.stem).toBe("계"); // 계묘일 → 일간 계
    expect(p.dayMaster.element).toBe("수");
    expect(p.dayMaster.yang).toBe(false);
    expect(p.zodiac).toBe("사자자리"); // 8/20
    expect(p.mbti.type).toBe("ENFP");
    expect(p.blood.type).toBe("A");
    expect(p.elements.counts).toBeDefined();
    expect(p.tenGods.yearStem).toBeDefined();
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
    // @ts-expect-error 런타임 검증 확인
    expect(() => computeProfile({ ...base, mbti: "XXXX" })).toThrow();
    // @ts-expect-error 런타임 검증 확인
    expect(() => computeProfile({ ...base, bloodType: "C" })).toThrow();
  });

  it("경계 유형 코퍼스를 최소 6건 보유(포스텔러 30건 확장은 후속 QA)", () => {
    expect(CASES.length).toBeGreaterThanOrEqual(6);
  });
});
