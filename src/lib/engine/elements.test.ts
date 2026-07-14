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
    expect(d.dominant).toBe("목"); // 최댓값 동률 시 첫 항목(목)
    expect(d.lacking).toContain("금");
    expect(d.lacking).toContain("토");
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
