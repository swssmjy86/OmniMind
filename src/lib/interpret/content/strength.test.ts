import { describe, expect, it } from "vitest";
import { checkTone, checkToneWarnings } from "../tone-guard";
import { strengthText, patternText, patternsText, sarangText, gyeokText, stageText } from "./strength";
import { HEAVENLY_STEMS } from "@/lib/engine/constants";

const STRENGTHS = ["신강", "신약", "중화"] as const;
const PATTERNS = ["식신제살", "상관제살", "식상생재", "군비쟁재"] as const;
const LAYERS = ["여기", "중기", "정기"] as const;
const GYEOKS = [
  "식신격", "상관격", "정재격", "편재격", "정관격", "편관격",
  "정인격", "편인격", "건록격", "월겁격", "양인격",
] as const;
const STAGES = ["생지", "왕지", "고지"] as const;

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

describe("sarangText — 사령(월률분야) 3층 × 천간 10종 전부 톤 통과", () => {
  it("3층 × 10천간 조합 전부에서 문구가 나오고 톤 가드를 통과한다", () => {
    for (const layer of LAYERS) {
      for (const stem of HEAVENLY_STEMS) {
        const t = sarangText({ layer, stem });
        expect(t.length).toBeGreaterThan(0);
        expect(checkTone(t)).toEqual([]);
        expect(checkToneWarnings(t)).toEqual([]);
      }
    }
  });

  it("층에 따라 다른 문구가 나온다(같은 천간이어도 여기≠중기≠정기)", () => {
    const texts = LAYERS.map((layer) => sarangText({ layer, stem: "갑" }));
    expect(new Set(texts).size).toBe(3);
  });
});

describe("gyeokText — 격국 11종 전부 톤 통과", () => {
  it("11종 전부 문구가 있고 톤 가드를 통과한다", () => {
    for (const g of GYEOKS) {
      const t = gyeokText([{ gyeok: g, basis: "정기" }]);
      expect(t.length).toBeGreaterThan(0);
      expect(checkTone(t)).toEqual([]);
      expect(checkToneWarnings(t)).toEqual([]);
    }
  });

  it("겸격(후보 2개)이면 두 문구를 이어붙인다", () => {
    const t = gyeokText([
      { gyeok: "정관격", basis: "정기" },
      { gyeok: "식신격", basis: "중기" },
    ]);
    expect(t).toContain(gyeokText([{ gyeok: "정관격", basis: "정기" }]));
    expect(t).toContain(gyeokText([{ gyeok: "식신격", basis: "중기" }]));
  });
});

describe("stageText — 사생지/사왕지/사고지 3종 전부 톤 통과", () => {
  it("3종 전부 문구가 있고 톤 가드를 통과한다", () => {
    for (const s of STAGES) {
      const t = stageText(s);
      expect(t.length).toBeGreaterThan(0);
      expect(checkTone(t)).toEqual([]);
      expect(checkToneWarnings(t)).toEqual([]);
    }
  });

  it("3종이 서로 다른 문구를 낸다", () => {
    const texts = STAGES.map(stageText);
    expect(new Set(texts).size).toBe(3);
  });
});
