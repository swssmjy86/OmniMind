import { describe, expect, it } from "vitest";
import { EARTHLY_BRANCHES } from "./constants";
import { ZODIAC_ANIMALS, yearSign, branchRelation } from "./year-sign";

describe("yearSign — 년도 → 년간지·띠 (스펙 §4)", () => {
  it("대조 년도: 1990=경오·말, 2000=경진·용, 1900=경자·쥐, 2026=병오·말", () => {
    expect(yearSign(1990)).toMatchObject({ ganzhi: "경오", animal: "말" });
    expect(yearSign(2000)).toMatchObject({ ganzhi: "경진", animal: "용" });
    expect(yearSign(1900)).toMatchObject({ ganzhi: "경자", animal: "쥐" });
    expect(yearSign(2026)).toMatchObject({ ganzhi: "병오", animal: "말" });
  });

  it("띠 배열은 12개고 지지 인덱스와 정렬된다 (자=쥐, 해=돼지)", () => {
    expect(ZODIAC_ANIMALS).toHaveLength(12);
    expect(EARTHLY_BRANCHES[0]).toBe("자");
    expect(ZODIAC_ANIMALS[0]).toBe("쥐");
    expect(ZODIAC_ANIMALS[11]).toBe("돼지");
  });

  it("stem·branch 인덱스가 ganzhi 문자열과 일치한다", () => {
    const s = yearSign(1984); // 갑자년
    expect(s).toMatchObject({ stem: 0, branch: 0, ganzhi: "갑자", animal: "쥐" });
  });
});

describe("branchRelation — 우선순위: 충 > 육합 > 삼합 > 형 > 해 > 파 (스펙 §4)", () => {
  const idx = (ch: string) => EARTHLY_BRANCHES.indexOf(ch as (typeof EARTHLY_BRANCHES)[number]);

  it("기본 관계: 자축=육합, 신자=삼합, 자오=충, 자미=해, 자유=파", () => {
    expect(branchRelation(idx("자"), idx("축"))).toBe("육합");
    expect(branchRelation(idx("신"), idx("자"))).toBe("삼합"); // 신자진 수국
    expect(branchRelation(idx("자"), idx("오"))).toBe("충");
    expect(branchRelation(idx("자"), idx("미"))).toBe("해");
    expect(branchRelation(idx("자"), idx("유"))).toBe("파");
  });

  it("겹치는 쌍은 우선순위로 하나만: 인해=육합(파 아님), 사신=육합(형·파 아님), 인사=형(해 아님)", () => {
    expect(branchRelation(idx("인"), idx("해"))).toBe("육합");
    expect(branchRelation(idx("사"), idx("신"))).toBe("육합");
    expect(branchRelation(idx("인"), idx("사"))).toBe("형");
  });

  it("형: 상호형(축술)·자묘형·자형(진진·오오·유유·해해)", () => {
    expect(branchRelation(idx("축"), idx("술"))).toBe("형");
    expect(branchRelation(idx("자"), idx("묘"))).toBe("형");
    expect(branchRelation(idx("진"), idx("진"))).toBe("형");
    expect(branchRelation(idx("오"), idx("오"))).toBe("형");
  });

  it("삼합은 같은 국의 서로 다른 지지만: 자진=삼합, 자자=null(자는 자형 아님)", () => {
    expect(branchRelation(idx("자"), idx("진"))).toBe("삼합");
    expect(branchRelation(idx("자"), idx("자"))).toBeNull();
  });

  it("무관계는 null이고 판정은 대칭이다", () => {
    expect(branchRelation(idx("자"), idx("인"))).toBeNull();
    for (let a = 0; a < 12; a++)
      for (let b = 0; b < 12; b++)
        expect(branchRelation(a, b)).toBe(branchRelation(b, a));
  });
});
