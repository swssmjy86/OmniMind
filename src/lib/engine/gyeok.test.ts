import { describe, expect, it } from "vitest";
import { detectGyeok } from "./gyeok";
import { tenGodOf } from "./ten-gods";
import { MONTH_LAYERS } from "./sarang";
import { EARTHLY_BRANCHES, HEAVENLY_STEMS } from "./constants";
import type { FourPillars } from "./types";

const idx = (b: string) => EARTHLY_BRANCHES.indexOf(b as (typeof EARTHLY_BRANCHES)[number]);
const EIGHT_GYEOK_NAME: Record<string, string> = {
  식신: "식신격", 상관: "상관격", 정재: "정재격", 편재: "편재격",
  정관: "정관격", 편관: "편관격", 정인: "정인격", 편인: "편인격",
};

function fp(monthBranch: number, dayStem: number, revealedStem: number | null): FourPillars {
  // 년간에 투출 후보를 두고(월간·시간은 무관한 값), 일지·년지·시지는 계산에 안 쓰이므로 0 고정.
  return {
    year: { stem: revealedStem ?? 1, branch: 0 },
    month: { stem: 1, branch: monthBranch },
    day: { stem: dayStem, branch: 0 },
    hour: { stem: 1, branch: 0 },
  };
}

describe("detectGyeok — 정기 투출(8격)", () => {
  it("정기가 투출하면(비겁이 아닌 경우) 그 십성에 해당하는 8격 하나만 나온다", () => {
    // 인월(정기=갑) — 일간을 무(토)로 두면 tenGodOf(무,갑)=편관(목극토, 음양 다름 아님 확인)
    const monthBranch = idx("인");
    const primaryStem = MONTH_LAYERS[monthBranch].at(-1)!.stem; // 정기
    const dayStem = HEAVENLY_STEMS.indexOf("무");
    const god = tenGodOf(dayStem, primaryStem);
    const result = detectGyeok(fp(monthBranch, dayStem, primaryStem));
    expect(result).toHaveLength(1);
    expect(result[0].basis).toBe("정기");
    if (god !== "비견" && god !== "겁재") {
      expect(result[0].gyeok).toBe(EIGHT_GYEOK_NAME[god]);
    }
  });

  it("아무 층도 투출하지 않으면 정기 자체를 격으로 인정한다", () => {
    const monthBranch = idx("사");
    const dayStem = HEAVENLY_STEMS.indexOf("기");
    const result = detectGyeok(fp(monthBranch, dayStem, null));
    expect(result).toHaveLength(1);
    expect(result[0].basis).toBe("정기");
  });
});

describe("detectGyeok — 변격(중기·여기 투출)", () => {
  it("정기가 아니라 중기가 투출하면 변격으로 그 층만 나온다", () => {
    const monthBranch = idx("인"); // 여기 무·중기 병·정기 갑
    const layers = MONTH_LAYERS[monthBranch];
    const jungGiStem = layers.find((l) => l.layer === "중기")!.stem;
    const dayStem = HEAVENLY_STEMS.indexOf("계");
    const result = detectGyeok(fp(monthBranch, dayStem, jungGiStem));
    expect(result).toHaveLength(1);
    expect(result[0].basis).toBe("중기");
  });

  it("여기가 투출하면 그 층으로 변격 판정한다", () => {
    const monthBranch = idx("인");
    const yeoGiStem = MONTH_LAYERS[monthBranch].find((l) => l.layer === "여기")!.stem;
    const dayStem = HEAVENLY_STEMS.indexOf("신");
    const result = detectGyeok(fp(monthBranch, dayStem, yeoGiStem));
    expect(result).toHaveLength(1);
    expect(result[0].basis).toBe("여기");
  });
});

describe("detectGyeok — 겸격(둘 이상 동시 투출)", () => {
  it("중기와 정기가 모두 투출하면 두 후보가 정기 우선 순서로 나온다", () => {
    const monthBranch = idx("인");
    const layers = MONTH_LAYERS[monthBranch];
    const jungGi = layers.find((l) => l.layer === "중기")!.stem;
    const jeongGi = layers.find((l) => l.layer === "정기")!.stem;
    const dayStem = HEAVENLY_STEMS.indexOf("기");
    const result = detectGyeok({
      year: { stem: jungGi, branch: 0 },
      month: { stem: jeongGi, branch: monthBranch }, // 월간에 정기가 투출
      day: { stem: dayStem, branch: 0 },
      hour: { stem: 1, branch: 0 },
    });
    expect(result).toHaveLength(2);
    expect(result[0].basis).toBe("정기"); // 정기 우선
    expect(result[1].basis).toBe("중기");
  });
});

describe("detectGyeok — 비겁 특례(건록격·월겁격·양인격)", () => {
  it("정기가 일간과 같은 오행·같은 음양(비견)이면 건록격", () => {
    // 인월 정기=갑(양목). 일간도 갑이면 비견 → 건록격.
    const monthBranch = idx("인");
    const gap = HEAVENLY_STEMS.indexOf("갑");
    const result = detectGyeok(fp(monthBranch, gap, gap));
    expect(result[0].gyeok).toBe("건록격");
  });

  it("정기가 일간과 같은 오행·다른 음양(겁재)이고 왕지가 아니면 월겁격", () => {
    // 인월(생지) 정기=갑(양목). 일간을 을(음목)로 두면 tenGodOf(을,갑)=겁재. 인은 왕지가 아님.
    const monthBranch = idx("인");
    const eul = HEAVENLY_STEMS.indexOf("을");
    const gap = HEAVENLY_STEMS.indexOf("갑");
    expect(tenGodOf(eul, gap)).toBe("겁재");
    const result = detectGyeok(fp(monthBranch, eul, gap));
    expect(result[0].gyeok).toBe("월겁격");
  });

  it("겁재 + 일간 양간 + 월지가 왕지(자오묘유)면 양인격", () => {
    // 오월(왕지) 정기=정(음화). 일간을 병(양화)으로 두면 tenGodOf(병,정)=겁재, 오=왕지, 병=양간.
    const monthBranch = idx("오");
    const byeong = HEAVENLY_STEMS.indexOf("병");
    const jeong = HEAVENLY_STEMS.indexOf("정");
    expect(tenGodOf(byeong, jeong)).toBe("겁재");
    const result = detectGyeok(fp(monthBranch, byeong, jeong));
    expect(result[0].gyeok).toBe("양인격");
  });
});

describe("detectGyeok — 결정론", () => {
  it("같은 입력은 같은 결과", () => {
    const input = fp(idx("신"), HEAVENLY_STEMS.indexOf("을"), null);
    expect(detectGyeok(input)).toEqual(detectGyeok(input));
  });
});
