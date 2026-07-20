import { describe, expect, it } from "vitest";
import { checkTone, checkToneWarnings } from "../tone-guard";
import { strengthText, patternText, patternsText } from "./strength";

const STRENGTHS = ["신강", "신약", "중화"] as const;
const PATTERNS = ["식신제살", "상관제살", "식상생재", "군비쟁재"] as const;

describe("strengthText — 신강/신약/중화 3종 전부 존재 + 톤 통과", () => {
  it("3종 전부 문구가 있고 톤 가드를 통과한다", () => {
    for (const s of STRENGTHS) {
      const t = strengthText(s);
      expect(t.length).toBeGreaterThan(0);
      expect(checkTone(t)).toEqual([]);
      expect(checkToneWarnings(t)).toEqual([]);
    }
  });
});

describe("patternText/patternsText — 격국 패턴 4종", () => {
  it("4종 전부 문구가 있고 톤 가드를 통과한다", () => {
    for (const p of PATTERNS) {
      const t = patternText(p);
      expect(t.length).toBeGreaterThan(0);
      expect(checkTone(t)).toEqual([]);
      expect(checkToneWarnings(t)).toEqual([]);
    }
  });

  it("빈 배열이면 null(문장 추가 안 함)", () => {
    expect(patternsText([])).toBeNull();
  });

  it("여러 패턴이면 각 문장을 이어붙인다", () => {
    const t = patternsText(["식신제살", "식상생재"]);
    expect(t).toContain(patternText("식신제살"));
    expect(t).toContain(patternText("식상생재"));
  });

  it("'당신은 ○○격이에요' 식 낙인형 단정이 아니라 구조 관찰형 문장이다 — 단정 금지(§5.4)", () => {
    for (const p of PATTERNS) {
      expect(patternText(p)).not.toContain("격이에요");
      expect(patternText(p)).not.toMatch(/^당신은/);
    }
  });
});
