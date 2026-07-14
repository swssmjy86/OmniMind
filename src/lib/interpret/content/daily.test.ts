import { describe, expect, it } from "vitest";
import { computeDaily } from "@/lib/engine/daily";
import { assembleDaily, dailyToSections } from "./daily";
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

  it("dailyToSections는 personal 유무에 따라 4~5섹션", () => {
    const withP = assembleDaily(computeDaily({ y: 2000, mo: 1, d: 7 }, "수"));
    const noP = assembleDaily(computeDaily({ y: 2000, mo: 1, d: 7 }));
    expect(dailyToSections(withP)).toHaveLength(5);
    expect(dailyToSections(noP)).toHaveLength(4);
  });
});
