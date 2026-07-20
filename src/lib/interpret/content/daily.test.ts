import { describe, expect, it } from "vitest";
import { computeDaily } from "@/lib/engine/daily";
import { assembleDaily, dailyToSections, dailyPrompt } from "./daily";
import { checkTone } from "../tone-guard";

describe("assembleDaily", () => {
  it("5개 오행 전부에서 무드 문구가 존재하고 톤 통과", () => {
    // 여러 날짜로 5개 오행이 모두 나오도록 순회
    const seen = new Set<string>();
    for (let d = 1; d <= 15; d++) {
      const daily = computeDaily({ y: 2026, mo: 7, d });
      const g = assembleDaily(daily, "다인");
      seen.add(daily.element);
      expect(g.headline).toContain("다인");
      for (const t of [g.headline, g.mind, g.color, g.keyword, g.lucky])
        expect(checkTone(t)).toHaveLength(0);
    }
    expect(seen.size).toBeGreaterThanOrEqual(4);
  });

  it("프로필 있으면 개인화 한 줄이 붙고 톤 통과", () => {
    const daily = computeDaily({ y: 2000, mo: 1, d: 7 }, "수");
    const g = assembleDaily(daily, "다인");
    expect(g.personal).not.toBeNull();
    expect(checkTone(g.personal!)).toHaveLength(0);
  });

  it("같은 오행이라도 천간이 다르면(갑/을) 무드가 다르다 — 이틀 연속 반복 방지", () => {
    // 2000-01-07 갑자, 2000-01-08 을축 — 둘 다 목이지만 다른 하루여야 한다.
    const gap = assembleDaily(computeDaily({ y: 2000, mo: 1, d: 7 }));
    const eul = assembleDaily(computeDaily({ y: 2000, mo: 1, d: 8 }));
    expect(gap.mind).not.toBe(eul.mind);
    expect(gap.keyword).not.toBe(eul.keyword);
  });

  it("일간 천간까지 주면 십성(비견~정인) 개인화가 나오고 톤 통과", () => {
    // 오늘 갑자(갑): 내 일간 갑 → 비견, 계 → 상관
    const bi = assembleDaily(computeDaily({ y: 2000, mo: 1, d: 7 }, "목", "갑"));
    expect(bi.personal).toContain("비견");
    const sang = assembleDaily(computeDaily({ y: 2000, mo: 1, d: 7 }, "수", "계"));
    expect(sang.personal).toContain("상관");
    for (const p of [bi.personal!, sang.personal!]) expect(checkTone(p)).toHaveLength(0);
  });

  it("십성 10종 개인화 문구가 전부 존재하고 톤 통과", () => {
    // 내 일간 10종 × 오늘 갑 — 십성 10갈래가 모두 나온다.
    const stems = ["갑","을","병","정","무","기","경","신","임","계"];
    const seen = new Set<string>();
    for (const s of stems) {
      const g = assembleDaily(computeDaily({ y: 2000, mo: 1, d: 7 }, undefined, s));
      expect(g.personal).not.toBeNull();
      expect(checkTone(g.personal!)).toHaveLength(0);
      seen.add(g.personal!);
    }
    expect(seen.size).toBe(10);
  });

  it("dailyToSections는 personal 유무에 따라 5~6섹션(오늘의 하늘 포함 항상 5)", () => {
    const withP = assembleDaily(computeDaily({ y: 2000, mo: 1, d: 7 }, "수"));
    const noP = assembleDaily(computeDaily({ y: 2000, mo: 1, d: 7 }));
    expect(dailyToSections(withP)).toHaveLength(6);
    expect(dailyToSections(noP)).toHaveLength(5);
    expect(dailyToSections(noP).map((s) => s.title)).toContain("오늘의 하늘");
  });

  it("P8 — llmParagraph를 주면 로그인 전용 개인화 섹션이 한 칸 더 붙는다", () => {
    const g = assembleDaily(computeDaily({ y: 2000, mo: 1, d: 7 }, "수"));
    const withLlm = dailyToSections(g, "오늘은 유난히 마음이 맑은 날이에요.");
    expect(withLlm).toHaveLength(7);
    expect(withLlm.at(-1)).toEqual({
      title: "오늘, 당신만을 위한 이야기",
      body: "오늘은 유난히 마음이 맑은 날이에요.",
    });
  });

  it("skyLines(월령·출몰시각·태양고도) 문구는 항상 있고 톤 통과", () => {
    const g = assembleDaily(computeDaily({ y: 2026, mo: 7, d: 14 }));
    for (const t of [g.skyLines.moon, g.skyLines.riseSet, g.skyLines.altitude])
      expect(checkTone(t)).toHaveLength(0);
  });

  it("dailyPrompt는 템플릿 마음가짐을 반복하지 말라고 명시한다", () => {
    const daily = computeDaily({ y: 2000, mo: 1, d: 7 }, "수");
    const g = assembleDaily(daily, "다인");
    const prompt = dailyPrompt(daily, g);
    expect(prompt).toContain(g.mind);
    expect(prompt).toContain("그대로 반복하지 말고");
  });
});
