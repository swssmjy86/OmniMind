import { describe, expect, it } from "vitest";
import { zodiacSign } from "./zodiac";

describe("별자리 12궁 경계", () => {
  it.each([
    [3, 20, "물고기자리"], [3, 21, "양자리"],
    [7, 22, "게자리"], [7, 23, "사자자리"],
    [12, 21, "사수자리"], [12, 22, "염소자리"],
    [1, 1, "염소자리"], [1, 19, "염소자리"], [1, 20, "물병자리"],
    [6, 21, "쌍둥이자리"], [6, 22, "게자리"],
  ])("%i/%i → %s", (m, d, sign) => {
    expect(zodiacSign(m, d)).toBe(sign);
  });

  it("12개월 전부 유효한 별자리를 반환한다", () => {
    for (let m = 1; m <= 12; m++) {
      expect(typeof zodiacSign(m, 15)).toBe("string");
    }
  });
});
