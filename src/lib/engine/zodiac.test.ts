import { describe, expect, it } from "vitest";
import { zodiacSign } from "./zodiac";

// 12궁 전체 경계 — 각 별자리가 시작되는 날 하루 전/당일 쌍. 트로피컬(고정 관례표) 기준.
const ALL_BOUNDARIES: Array<[number, number, string, number, number, string]> = [
  [1, 19, "염소자리", 1, 20, "물병자리"],
  [2, 18, "물병자리", 2, 19, "물고기자리"],
  [3, 20, "물고기자리", 3, 21, "양자리"],
  [4, 19, "양자리", 4, 20, "황소자리"],
  [5, 20, "황소자리", 5, 21, "쌍둥이자리"],
  [6, 21, "쌍둥이자리", 6, 22, "게자리"],
  [7, 22, "게자리", 7, 23, "사자자리"],
  [8, 22, "사자자리", 8, 23, "처녀자리"],
  [9, 22, "처녀자리", 9, 23, "천칭자리"],
  [10, 23, "천칭자리", 10, 24, "전갈자리"],
  [11, 22, "전갈자리", 11, 23, "사수자리"],
  [12, 21, "사수자리", 12, 22, "염소자리"],
];

describe("별자리 12궁 경계 — 12쌍 전체", () => {
  it.each(ALL_BOUNDARIES)("%i/%i(전날) → %s, %i/%i(당일) → %s", (m1, d1, before, m2, d2, after) => {
    expect(zodiacSign(m1, d1)).toBe(before);
    expect(zodiacSign(m2, d2)).toBe(after);
  });

  it("1/1~1/19는 염소자리(연초 경계, 전년 12/22부터 이어짐)", () => {
    expect(zodiacSign(1, 1)).toBe("염소자리");
    expect(zodiacSign(1, 19)).toBe("염소자리");
  });

  it("12개월 전부 유효한 별자리를 반환한다", () => {
    for (let m = 1; m <= 12; m++) {
      expect(typeof zodiacSign(m, 15)).toBe("string");
    }
  });
});
