import { describe, expect, it } from "vitest";
import { computeDaily, relateElement } from "./daily";

describe("relateElement (오행 관계)", () => {
  // 오행 인덱스: 목0 화1 토2 금3 수4
  it("같은 오행 = 동행", () => {
    expect(relateElement(0, 0)).toBe("동행");
  });
  it("내가 생 = 발산 (목→화)", () => {
    expect(relateElement(0, 1)).toBe("발산");
  });
  it("내가 극 = 결실 (목→토)", () => {
    expect(relateElement(0, 2)).toBe("결실");
  });
  it("오늘이 나를 극 = 단련 (목이 금에게)", () => {
    expect(relateElement(0, 3)).toBe("단련"); // 금극목
  });
  it("오늘이 나를 생 = 채움 (수생목)", () => {
    expect(relateElement(0, 4)).toBe("채움");
  });
});

describe("computeDaily", () => {
  it("앵커일(2000-01-07)의 일진은 갑자", () => {
    const d = computeDaily({ y: 2000, mo: 1, d: 7 });
    expect(d.dayGanzhi).toBe("갑자");
    expect(d.element).toBe("목"); // 갑 = 木
    expect(d.date).toBe("2000-01-07");
    expect(d.relation).toBeNull();
  });
  it("내 오행을 주면 관계를 산출한다", () => {
    const d = computeDaily({ y: 2000, mo: 1, d: 7 }, "수"); // 오늘 목, 내 수 → 수생목=발산
    expect(d.relation).toBe("발산");
  });
  it("같은 날짜는 항상 같은 결과(결정론)", () => {
    const a = computeDaily({ y: 2026, mo: 7, d: 14 });
    const b = computeDaily({ y: 2026, mo: 7, d: 14 });
    expect(a).toEqual(b);
  });
});
