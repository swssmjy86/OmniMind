import { describe, expect, it } from "vitest";
import { stemCombinePairs } from "./stem-combine";
import type { ProfileContext } from "./index";

describe("stemCombinePairs — 사주 내 네 기둥 천간합", () => {
  it("합이 없으면 빈 배열", () => {
    const pillars: ProfileContext["pillars"] = {
      year: "갑자", month: "을축", day: "병인", hour: "정묘",
    };
    expect(stemCombinePairs(pillars)).toEqual([]);
  });

  it("한 쌍만 합이면 그 쌍 하나만 반환한다(갑기합)", () => {
    const pillars: ProfileContext["pillars"] = {
      year: "갑자", month: "기축", day: "을묘", hour: "정묘",
    };
    expect(stemCombinePairs(pillars)).toEqual([{ a: "year", b: "month" }]);
  });

  it("두 쌍이 동시에 합이면 둘 다 반환한다(갑기합 + 병신합)", () => {
    const pillars: ProfileContext["pillars"] = {
      year: "갑자", month: "기축", day: "병인", hour: "신묘",
    };
    const pairs = stemCombinePairs(pillars);
    expect(pairs).toHaveLength(2);
    expect(pairs).toContainEqual({ a: "year", b: "month" });
    expect(pairs).toContainEqual({ a: "day", b: "hour" });
  });

  it("시주 미상(hour=null)이어도 예외 없이 동작하고, 시주는 계산에서 빠진다", () => {
    const pillars: ProfileContext["pillars"] = {
      year: "갑자", month: "기축", day: "을묘", hour: null,
    };
    expect(() => stemCombinePairs(pillars)).not.toThrow();
    expect(stemCombinePairs(pillars)).toEqual([{ a: "year", b: "month" }]);
  });

  it("같은 입력은 같은 결과(결정론)", () => {
    const pillars: ProfileContext["pillars"] = {
      year: "무자", month: "계축", day: "병인", hour: "신묘",
    };
    expect(stemCombinePairs(pillars)).toEqual(stemCombinePairs(pillars));
  });
});
