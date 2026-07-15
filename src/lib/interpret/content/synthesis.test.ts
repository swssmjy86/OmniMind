import { describe, expect, it } from "vitest";
import { computeProfile } from "@/lib/engine";
import { synthesisText } from "./synthesis";
import { checkTone } from "../tone-guard";
import type { ProfileContext } from "@/lib/engine";
import type { TenGodChart } from "@/lib/engine/ten-gods";

// 십성 5갈래 × E/I = 10개 교차 문구의 완전성·톤을 검사한다.
const gods = ["비견", "식신", "편재", "정관", "정인"] as const;

const base = computeProfile({
  birthDate: "1995-08-20", birthTime: "14:30", timeUnknown: false,
  bloodType: "A", mbti: "ENFP",
});

function withChart(g: (typeof gods)[number], ei: "E" | "I"): ProfileContext {
  const chart: TenGodChart = {
    yearStem: g, monthStem: g, hourStem: g,
    yearBranch: g, monthBranch: g, dayBranch: g, hourBranch: g,
  };
  return {
    ...base,
    tenGods: chart,
    mbti: { ...base.mbti, axes: { ...base.mbti.axes, EI: ei } },
  };
}

describe("synthesisText — 사주×MBTI 교차(조각이 만나는 자리)", () => {
  it("10개 조합 전부 문구 존재·서로 다름·톤 통과", () => {
    const seen = new Set<string>();
    for (const g of gods) {
      for (const ei of ["E", "I"] as const) {
        const t = synthesisText(withChart(g, ei));
        expect(t.length).toBeGreaterThan(0);
        expect(checkTone(t)).toHaveLength(0);
        seen.add(t);
      }
    }
    expect(seen.size).toBe(10);
  });

  it("E/I가 다르면 같은 십성이라도 다른 이야기", () => {
    expect(synthesisText(withChart("식신", "E"))).not.toBe(synthesisText(withChart("식신", "I")));
  });
});
