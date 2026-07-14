import { describe, expect, it } from "vitest";
import { DAY_MASTER_TEXT } from "./day-master";
import { ZODIAC_TEXT } from "./zodiac";
import { BLOOD_TEXT } from "./blood";
import { MBTI_AXIS_TEXT } from "./mbti";
import { ELEMENT_BALANCE_TEXT } from "./elements";
import { tenGodTheme, dominantCategory } from "./ten-gods";
import { mbtiTrait } from "@/lib/engine/mbti";
import { checkTone } from "../tone-guard";
import type { TenGodChart } from "@/lib/engine/ten-gods";

const STEMS = ["갑","을","병","정","무","기","경","신","임","계"];
const ZODIACS = ["양자리","황소자리","쌍둥이자리","게자리","사자자리","처녀자리",
  "천칭자리","전갈자리","사수자리","염소자리","물병자리","물고기자리"] as const;
const BLOODS = ["A","B","O","AB"] as const;
const MBTIS = ["INTJ","INTP","ENTJ","ENTP","INFJ","INFP","ENFJ","ENFP",
  "ISTJ","ISFJ","ESTJ","ESFJ","ISTP","ISFP","ESTP","ESFP"] as const;

describe("콘텐츠 완전성", () => {
  it("일간 10종 전부 존재", () => {
    for (const s of STEMS) expect(DAY_MASTER_TEXT[s]?.body?.length).toBeGreaterThan(0);
  });
  it("별자리 12종 전부 존재", () => {
    for (const z of ZODIACS) expect(ZODIAC_TEXT[z]?.intro?.length).toBeGreaterThan(0);
  });
  it("혈액형 4종 전부 존재", () => {
    for (const b of BLOODS) expect(BLOOD_TEXT[b]?.body?.length).toBeGreaterThan(0);
  });
});

describe("콘텐츠 톤 준수 (§5.4)", () => {
  it("일간·별자리·혈액형 문구가 전부 톤 통과", () => {
    const texts = [
      ...STEMS.map((s) => DAY_MASTER_TEXT[s].body),
      ...ZODIACS.map((z) => ZODIAC_TEXT[z].intro),
      ...BLOODS.map((b) => BLOOD_TEXT[b].body),
    ];
    for (const t of texts) expect(checkTone(t)).toHaveLength(0);
  });
  it("MBTI 16유형 조립 문구가 전부 톤 통과", () => {
    for (const m of MBTIS) expect(checkTone(MBTI_AXIS_TEXT(mbtiTrait(m)))).toHaveLength(0);
  });
  it("오행 균형 문구(부족 있음/없음)가 톤 통과", () => {
    const withLack = ELEMENT_BALANCE_TEXT({ counts: { 목:3,화:2,토:0,금:0,수:3 }, dominant: "목", lacking: ["토","금"] });
    const full = ELEMENT_BALANCE_TEXT({ counts: { 목:2,화:2,토:2,금:1,수:1 }, dominant: "목", lacking: [] });
    expect(checkTone(withLack)).toHaveLength(0);
    expect(checkTone(full)).toHaveLength(0);
  });

  it("십성 5갈래 테마가 전부 톤 통과", () => {
    const gods = ["비견","식신","편재","정관","정인"] as const; // 각 갈래 대표
    for (const g of gods) {
      const chart: TenGodChart = {
        yearStem: g, monthStem: g, hourStem: g,
        yearBranch: g, monthBranch: g, dayBranch: g, hourBranch: g,
      };
      expect(dominantCategory(chart)).toBeDefined();
      expect(checkTone(tenGodTheme(chart))).toHaveLength(0);
    }
  });
});
