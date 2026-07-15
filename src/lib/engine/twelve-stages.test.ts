import { describe, expect, it } from "vitest";
import { TWELVE_STAGES, twelveStage, twelveStageByChar } from "./twelve-stages";
import { HEAVENLY_STEMS, EARTHLY_BRANCHES } from "./constants";

// 12운성: 일간의 기운이 지지에서 갖는 생멸 단계(장생~양).
// 양간은 순행, 음간은 역행 — 전통 명리 표준표와 대조한다.
const B = (ch: string) => EARTHLY_BRANCHES.indexOf(ch as (typeof EARTHLY_BRANCHES)[number]);
const S = (ch: string) => HEAVENLY_STEMS.indexOf(ch as (typeof HEAVENLY_STEMS)[number]);

describe("twelveStage — 12운성", () => {
  it("갑(양간, 해 장생) 순행 12지 전체가 표준표와 일치한다", () => {
    const expected: Record<string, string> = {
      해: "장생", 자: "목욕", 축: "관대", 인: "건록", 묘: "제왕", 진: "쇠",
      사: "병", 오: "사", 미: "묘", 신: "절", 유: "태", 술: "양",
    };
    for (const [br, stage] of Object.entries(expected)) {
      expect(twelveStage(S("갑"), B(br))).toBe(stage);
    }
  });

  it("을(음간, 오 장생) 역행 12지 전체가 표준표와 일치한다", () => {
    const expected: Record<string, string> = {
      오: "장생", 사: "목욕", 진: "관대", 묘: "건록", 인: "제왕", 축: "쇠",
      자: "병", 해: "사", 술: "묘", 유: "절", 신: "태", 미: "양",
    };
    for (const [br, stage] of Object.entries(expected)) {
      expect(twelveStage(S("을"), B(br))).toBe(stage);
    }
  });

  it("십간의 장생 지지가 표준(갑해·을오·병무인·정기유·경사·신자·임신·계묘)과 일치한다", () => {
    const births: Array<[string, string]> = [
      ["갑", "해"], ["을", "오"], ["병", "인"], ["정", "유"], ["무", "인"],
      ["기", "유"], ["경", "사"], ["신", "자"], ["임", "신"], ["계", "묘"],
    ];
    for (const [stem, br] of births) {
      expect(twelveStage(S(stem), B(br))).toBe("장생");
    }
  });

  it("대표 사례: 병오=제왕, 경신=건록, 임자=제왕, 정사=제왕", () => {
    expect(twelveStage(S("병"), B("오"))).toBe("제왕");
    expect(twelveStage(S("경"), B("신"))).toBe("건록");
    expect(twelveStage(S("임"), B("자"))).toBe("제왕");
    expect(twelveStage(S("정"), B("사"))).toBe("제왕");
  });

  it("모든 일간×지지 조합이 12단계 안에서 정확히 한 번씩 순환한다", () => {
    for (let stem = 0; stem < 10; stem++) {
      const seen = new Set<string>();
      for (let br = 0; br < 12; br++) seen.add(twelveStage(stem, br));
      expect(seen.size).toBe(TWELVE_STAGES.length);
    }
  });

  it("글자 기반 헬퍼: 명식표 문자열에서 바로 계산하고, 모르는 글자는 null", () => {
    expect(twelveStageByChar("갑", "인")).toBe("건록");
    expect(twelveStageByChar("?", "인")).toBeNull();
    expect(twelveStageByChar("갑", "?")).toBeNull();
  });
});
