import { describe, expect, it } from "vitest";
import { DAY_MASTER_TEXT } from "./day-master";
import { ZODIAC_TEXT } from "./zodiac";
import { ELEMENT_BALANCE_TEXT } from "./elements";
import { tenGodTheme, tenGodStrength, dominantCategory } from "./ten-gods";
import { checkTone, checkToneWarnings } from "../tone-guard";
import type { TenGodChart } from "@/lib/engine/ten-gods";

const STEMS = ["갑","을","병","정","무","기","경","신","임","계"];
const ZODIACS = ["양자리","황소자리","쌍둥이자리","게자리","사자자리","처녀자리",
  "천칭자리","전갈자리","사수자리","염소자리","물병자리","물고기자리"] as const;

describe("콘텐츠 완전성", () => {
  it("일간 10종 전부 존재", () => {
    for (const s of STEMS) expect(DAY_MASTER_TEXT[s]?.body?.length).toBeGreaterThan(0);
  });
  it("별자리 12종 전부 존재", () => {
    for (const z of ZODIACS) expect(ZODIAC_TEXT[z]?.intro?.length).toBeGreaterThan(0);
  });
});

describe("콘텐츠 톤 준수 (§5.4)", () => {
  it("일간·별자리 문구가 전부 톤 통과", () => {
    const texts = [
      ...STEMS.map((s) => DAY_MASTER_TEXT[s].body),
      ...ZODIACS.map((z) => ZODIAC_TEXT[z].intro),
    ];
    for (const t of texts) {
      expect(checkTone(t)).toHaveLength(0);
      // 자체 콘텐츠는 경고 레벨(낙인형 단정)까지 무결 — LLM 출력보다 높은 기준.
      expect(checkToneWarnings(t)).toHaveLength(0);
    }
  });
  it("오행 균형 문구(부족 있음/없음)가 톤 통과 — 구버전 캐시(coDominant 없음)도 동작", () => {
    const withLack = ELEMENT_BALANCE_TEXT({ counts: { 목:3,화:2,토:0,금:0,수:3 }, dominant: "목", lacking: ["토","금"] });
    const full = ELEMENT_BALANCE_TEXT({ counts: { 목:2,화:2,토:2,금:1,수:1 }, dominant: "목", lacking: [] });
    expect(checkTone(withLack)).toHaveLength(0);
    expect(checkTone(full)).toHaveLength(0);
    expect(withLack).toContain("목의 기운이 3개");
  });

  it("오행 동률이면 '나란히' 서술로 분기 — 한쪽을 단정하지 않는다", () => {
    const tie = ELEMENT_BALANCE_TEXT({
      counts: { 목:4,화:4,토:0,금:0,수:0 }, dominant: "화",
      coDominant: ["화","목"], lacking: ["토","금","수"],
    });
    expect(tie).toContain("화·목의 기운이 나란히");
    expect(checkTone(tie)).toHaveLength(0);
    expect(checkToneWarnings(tie)).toHaveLength(0);
    // 단일 우세면 기존 서술 유지
    const single = ELEMENT_BALANCE_TEXT({
      counts: { 목:5,화:1,토:1,금:1,수:0 }, dominant: "목",
      coDominant: ["목"], lacking: ["수"],
    });
    expect(single).toContain("목의 기운이 5개");
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

  it("십성 힘 명사구 — 주어 없이 '힘'으로 끝나 조립에 안전(이중 주어 회귀 방지)", () => {
    const gods = ["비견","식신","편재","정관","정인"] as const;
    for (const g of gods) {
      const chart: TenGodChart = {
        yearStem: g, monthStem: g, hourStem: g,
        yearBranch: g, monthBranch: g, dayBranch: g, hourBranch: g,
      };
      const s = tenGodStrength(chart);
      expect(s.endsWith("힘")).toBe(true); // "…힘이 있어요" 조사 고정
      expect(s.startsWith("당신")).toBe(false); // "님에게는 당신…" 비문 방지
      expect(checkTone(s)).toHaveLength(0);
    }
  });
});
