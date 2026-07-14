import { describe, expect, it } from "vitest";
import { tenGodOf, tenGods } from "./ten-gods";

// 천간: 갑0 을1 병2 정3 무4 기5 경6 신7 임8 계9
describe("십성 — 일간 갑(木양) 기준", () => {
  it("10천간 전부", () => {
    expect(tenGodOf(0, 0)).toBe("비견"); // 갑-갑
    expect(tenGodOf(0, 1)).toBe("겁재"); // 갑-을
    expect(tenGodOf(0, 2)).toBe("식신"); // 갑-병(火)
    expect(tenGodOf(0, 3)).toBe("상관"); // 갑-정
    expect(tenGodOf(0, 4)).toBe("편재"); // 갑-무(土)
    expect(tenGodOf(0, 5)).toBe("정재"); // 갑-기
    expect(tenGodOf(0, 6)).toBe("편관"); // 갑-경(金)
    expect(tenGodOf(0, 7)).toBe("정관"); // 갑-신
    expect(tenGodOf(0, 8)).toBe("편인"); // 갑-임(水)
    expect(tenGodOf(0, 9)).toBe("정인"); // 갑-계
  });
});

describe("십성 — 다른 일간 스팟체크", () => {
  it("일간 계(水음): 계-무(土양) = 정관", () => {
    // 나를 극(土克水), 음양 다름 → 정관
    expect(tenGodOf(9, 4)).toBe("정관");
  });
  it("일간 병(火양): 병-경(金양) = 편재", () => {
    // 내가 극(火克金), 음양 같음 → 편재
    expect(tenGodOf(2, 6)).toBe("편재");
  });
});

describe("tenGods 차트", () => {
  it("일간 자체엔 십성 없음, 지지는 지장간 정기로 판정, hour=null 처리", () => {
    const fp = {
      year: { stem: 6, branch: 8 },  // 경申
      month: { stem: 2, branch: 5 }, // 병巳
      day: { stem: 0, branch: 0 },   // 갑子 (일간 갑)
      hour: null,
    };
    const chart = tenGods(fp);
    expect(chart.yearStem).toBe("편관");   // 갑-경
    expect(chart.monthStem).toBe("식신");  // 갑-병
    expect(chart.hourStem).toBeNull();
    expect(chart.hourBranch).toBeNull();
    expect(chart.dayBranch).toBe("정인");  // 자→계(水), 갑기준 정인
  });
});
