import { describe, expect, it } from "vitest";
import { dayMasterStrength, detectPatterns } from "./strength";
import type { TenGodChart } from "./ten-gods";

const chart = (partial: Partial<TenGodChart>): TenGodChart => ({
  yearStem: "비견", monthStem: "비견", hourStem: "비견",
  yearBranch: "비견", monthBranch: "비견", dayBranch: "비견", hourBranch: "비견",
  ...partial,
});

describe("dayMasterStrength — 억부법(돕는 세력 vs 설극 세력, 월지 2배 가중)", () => {
  it("돕는 세력(비겁·인성)이 우세하면 신강", () => {
    const c = chart({
      yearStem: "비견", monthStem: "정인", hourStem: "편인",
      yearBranch: "겁재", monthBranch: "정인", dayBranch: "편인", hourBranch: "정관",
    });
    expect(dayMasterStrength(c)).toBe("신강");
  });

  it("설극 세력(식상·재성·관성)이 우세하면 신약", () => {
    const c = chart({
      yearStem: "식신", monthStem: "편재", hourStem: "정관",
      yearBranch: "상관", monthBranch: "정재", dayBranch: "편관", hourBranch: "비견",
    });
    expect(dayMasterStrength(c)).toBe("신약");
  });

  it("정확히 동률이면 중화", () => {
    // 7자리: 비견·식신·편인·상관·정인·정관·편관 + 월지(정인) 가중 1 = 총 8표
    // support: 비견·편인·정인·정인(가중) = 4 / drain: 식신·상관·정관·편관 = 4 → 동률
    const c = chart({
      yearStem: "비견", monthStem: "식신", hourStem: "편인",
      yearBranch: "상관", monthBranch: "정인", dayBranch: "정관", hourBranch: "편관",
    });
    expect(dayMasterStrength(c)).toBe("중화");
  });

  it("월지(월령) 가중이 실제로 신강/신약을 가른다 — 다른 자리는 동률로 고정하고 월지만 바꾼다", () => {
    // 월지를 뺀 6자리: 비견·식신·편재·정재·편인·정인 → support(비견·편인·정인)=3, drain(식신·편재·정재)=3(동률)
    const base = {
      yearStem: "비견" as const, monthStem: "식신" as const, hourStem: "편재" as const,
      yearBranch: "정재" as const, dayBranch: "편인" as const, hourBranch: "정인" as const,
    };
    // 월지가 돕는 세력이면(2표 추가) 신강으로 기운다
    expect(dayMasterStrength(chart({ ...base, monthBranch: "비견" }))).toBe("신강");
    // 월지가 설극 세력이면(2표 추가) 신약으로 기운다
    expect(dayMasterStrength(chart({ ...base, monthBranch: "식신" }))).toBe("신약");
  });

  it("시주 미상(hourStem·hourBranch=null)이어도 예외 없이 동작한다", () => {
    const c: TenGodChart = {
      yearStem: "비견", monthStem: "정인", hourStem: null,
      yearBranch: "겁재", monthBranch: "정인", dayBranch: "편인", hourBranch: null,
    };
    expect(() => dayMasterStrength(c)).not.toThrow();
    expect(dayMasterStrength(c)).toBe("신강");
  });
});

describe("detectPatterns — 격국(구조) 패턴", () => {
  it("식신+편관이 함께 있으면 식신제살", () => {
    const c = chart({ yearStem: "편관", monthStem: "식신" });
    expect(detectPatterns(c)).toContain("식신제살");
  });

  it("상관+편관이 함께 있으면 상관제살", () => {
    const c = chart({ yearStem: "편관", monthStem: "상관" });
    expect(detectPatterns(c)).toContain("상관제살");
  });

  it("식상(식신/상관)과 재성(편재/정재)이 함께 있으면 식상생재", () => {
    const c = chart({ yearStem: "식신", monthStem: "편재" });
    expect(detectPatterns(c)).toContain("식상생재");
  });

  it("비겁 3개 이상 + 재성 1개 이하면 군비쟁재", () => {
    const c = chart({
      yearStem: "비견", monthStem: "겁재", hourStem: "비견", yearBranch: "편재",
    });
    expect(detectPatterns(c)).toContain("군비쟁재");
  });

  it("비겁이 많아도 재성이 2개 이상이면 군비쟁재가 아니다", () => {
    const c = chart({
      yearStem: "비견", monthStem: "겁재", hourStem: "비견",
      yearBranch: "편재", monthBranch: "정재",
    });
    expect(detectPatterns(c)).not.toContain("군비쟁재");
  });

  it("아무 조건도 안 맞으면 빈 배열", () => {
    const c = chart({
      yearStem: "정인", monthStem: "편인", hourStem: "정인",
      yearBranch: "편인", monthBranch: "정인", dayBranch: "편인", hourBranch: "정인",
    });
    expect(detectPatterns(c)).toEqual([]);
  });

  it("여러 패턴이 동시에 감지될 수 있다", () => {
    const c = chart({
      yearStem: "편관", monthStem: "식신", hourStem: "상관", yearBranch: "편재",
    });
    const patterns = detectPatterns(c);
    expect(patterns).toContain("식신제살");
    expect(patterns).toContain("상관제살");
    expect(patterns).toContain("식상생재");
  });

  it("hourStem·hourBranch가 null(시 미상)이어도 예외 없이 동작한다", () => {
    const c: TenGodChart = {
      yearStem: "편관", monthStem: "식신", hourStem: null,
      yearBranch: "비견", monthBranch: "겁재", dayBranch: "편재", hourBranch: null,
    };
    expect(() => detectPatterns(c)).not.toThrow();
  });
});
