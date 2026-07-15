import { describe, expect, it } from "vitest";
import {
  HEAVENLY_STEMS, EARTHLY_BRANCHES, stemElement, branchElement,
  isYang, sexagenary, generates, controls, branchPrimaryStem, branchHiddenStems,
  stemsCombine, branchesSixCombine, branchesClash,
} from "./constants";

describe("천간·지지 상수", () => {
  it("천간 10개·지지 12개", () => {
    expect(HEAVENLY_STEMS).toHaveLength(10);
    expect(EARTHLY_BRANCHES).toHaveLength(12);
  });
  it("오행 매핑: 갑=목, 임=수, 인=목, 자=수", () => {
    expect(stemElement(0)).toBe(0); // 갑 木
    expect(stemElement(8)).toBe(4); // 임 水
    expect(branchElement(2)).toBe(0); // 인 木
    expect(branchElement(0)).toBe(4); // 자 水
  });
  it("음양: 갑·자=양, 을·축=음", () => {
    expect(isYang(0)).toBe(true);
    expect(isYang(1)).toBe(false);
  });
  it("60갑자: 0=갑자, 59=계해", () => {
    expect(sexagenary(0)).toEqual({ stem: 0, branch: 0 });
    expect(sexagenary(59)).toEqual({ stem: 9, branch: 11 });
    expect(sexagenary(60)).toEqual({ stem: 0, branch: 0 }); // 순환
  });
  it("오행 생극: 목생화, 목극토", () => {
    expect(generates(0)).toBe(1); // 木→火
    expect(controls(0)).toBe(2); // 木→土
  });
  it("지장간 정기: 자→계, 인→갑", () => {
    expect(branchPrimaryStem(0)).toBe(9);
    expect(branchPrimaryStem(2)).toBe(0);
  });
  it("지장간 전체: 마지막 원소(정기)가 branchPrimaryStem과 항상 일치", () => {
    for (let b = 0; b < 12; b++) {
      const hidden = branchHiddenStems(b);
      expect(hidden.length).toBeGreaterThanOrEqual(2);
      expect(hidden.length).toBeLessThanOrEqual(3);
      expect(hidden[hidden.length - 1]).toBe(branchPrimaryStem(b));
    }
    // 대표 검증: 인[무병갑], 오[병기정], 유[경신]
    expect(branchHiddenStems(2)).toEqual([4, 2, 0]);
    expect(branchHiddenStems(6)).toEqual([2, 5, 3]);
    expect(branchHiddenStems(9)).toEqual([6, 7]);
  });
});

describe("간지 관계", () => {
  it("천간합: 갑기·을경·무계는 합, 갑을·갑경은 아님", () => {
    expect(stemsCombine(0, 5)).toBe(true); // 갑기
    expect(stemsCombine(6, 1)).toBe(true); // 경을(대칭)
    expect(stemsCombine(4, 9)).toBe(true); // 무계
    expect(stemsCombine(0, 1)).toBe(false); // 갑을
    expect(stemsCombine(0, 6)).toBe(false); // 갑경
    expect(stemsCombine(3, 3)).toBe(false); // 동일
  });
  it("지지 육합: 자축·인해·오미는 합, 자자·자오는 아님", () => {
    expect(branchesSixCombine(0, 1)).toBe(true); // 자축
    expect(branchesSixCombine(11, 2)).toBe(true); // 해인(대칭)
    expect(branchesSixCombine(6, 7)).toBe(true); // 오미
    expect(branchesSixCombine(0, 0)).toBe(false);
    expect(branchesSixCombine(0, 6)).toBe(false); // 자오는 충
  });
  it("지지 충: 자오·묘유·사해는 충, 자축은 아님", () => {
    expect(branchesClash(0, 6)).toBe(true); // 자오
    expect(branchesClash(9, 3)).toBe(true); // 유묘(대칭)
    expect(branchesClash(5, 11)).toBe(true); // 사해
    expect(branchesClash(0, 1)).toBe(false); // 자축(육합)
  });
});
