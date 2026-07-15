import { describe, expect, it } from "vitest";
import { elementDistribution } from "./elements";

describe("오행 분포", () => {
  it("8글자 오행 집계 + dominant/lacking", () => {
    const fp = {
      year: { stem: 0, branch: 2 },  // 갑木 인木
      month: { stem: 2, branch: 5 }, // 병火 사火
      day: { stem: 0, branch: 0 },   // 갑木 자水
      hour: { stem: 8, branch: 11 }, // 임水 해水
    };
    const d = elementDistribution(fp);
    expect(d.counts.목).toBe(3);
    expect(d.counts.화).toBe(2);
    expect(d.counts.수).toBe(3);
    // 가중치: 목3, 화2+1(월지 사火 득령)=3, 수3 → 3자 동률, 계절 오행(화)이 대표
    expect(d.coDominant).toEqual(["화", "목", "수"]);
    expect(d.dominant).toBe("화");
    expect(d.lacking).toContain("금");
    expect(d.lacking).toContain("토");
  });

  it("월지 득령 가중이 동률을 깬다 — 목4 화4라도 화월생이면 화가 짙다", () => {
    const fp = {
      year: { stem: 0, branch: 2 },  // 갑木 인木
      month: { stem: 2, branch: 6 }, // 병火 오火 ← 월지
      day: { stem: 0, branch: 3 },   // 갑木 묘木
      hour: { stem: 3, branch: 5 },  // 정火 사火
    };
    const d = elementDistribution(fp);
    expect(d.counts.목).toBe(4);
    expect(d.counts.화).toBe(4);
    expect(d.dominant).toBe("화"); // 득령 가중으로 화 5 > 목 4
    expect(d.coDominant).toEqual(["화"]);
  });

  it("hour=null이면 6글자만 집계", () => {
    const fp = {
      year: { stem: 0, branch: 2 },
      month: { stem: 2, branch: 5 },
      day: { stem: 0, branch: 0 },
      hour: null,
    };
    const total = Object.values(elementDistribution(fp).counts).reduce((a, b) => a + b, 0);
    expect(total).toBe(6);
  });
});
