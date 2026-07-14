import { describe, expect, it } from "vitest";
import {
  HEAVENLY_STEMS, EARTHLY_BRANCHES, stemElement, branchElement,
  isYang, sexagenary, generates, controls, branchPrimaryStem,
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
});
