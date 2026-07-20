import { describe, expect, it } from "vitest";
import { computeProfile } from "@/lib/engine";
import { pillarPalaceText, pillarPalaceSummary } from "./pillars";
import { checkTone, checkToneWarnings } from "../tone-guard";

describe("pillarPalaceText — 근묘화실(년/월/일/시주 = 조상/부모/나/자녀궁)", () => {
  it("시간을 알면 네 기둥 전부의 간지가 본문에 담기고 톤 통과", () => {
    const ctx = computeProfile({
      birthDate: "1995-08-20", birthTime: "14:30", timeUnknown: false,
    });
    const t = pillarPalaceText(ctx);
    expect(t).toContain(ctx.pillars.year);
    expect(t).toContain(ctx.pillars.month);
    expect(t).toContain(ctx.pillars.day);
    expect(t).toContain(ctx.pillars.hour);
    expect(checkTone(t)).toHaveLength(0);
    expect(checkToneWarnings(t)).toHaveLength(0);
  });

  it("시간을 모르면 시주는 단정 없이 여백으로 서술되고 톤 통과", () => {
    const ctx = computeProfile({
      birthDate: "1995-08-20", birthTime: null, timeUnknown: true,
    });
    expect(ctx.pillars.hour).toBeNull();
    const t = pillarPalaceText(ctx);
    expect(t).toContain("여백");
    expect(checkTone(t)).toHaveLength(0);
    expect(checkToneWarnings(t)).toHaveLength(0);
  });

  it("대조 코퍼스 전 케이스에서 예외 없이 조립되고 톤 통과", async () => {
    const { CASES } = await import("@/lib/engine/fixtures/manseryeok-cases");
    for (const c of CASES) {
      const ctx = computeProfile(c.input);
      const t = pillarPalaceText(ctx);
      expect(t.length).toBeGreaterThan(0);
      expect(checkTone(t)).toHaveLength(0);
    }
  });
});

describe("pillarPalaceSummary — 프롬프트용 한 줄 요약", () => {
  it("네 기둥과 궁 이름을 모두 담는다(시간 앎)", () => {
    const ctx = computeProfile({
      birthDate: "1995-08-20", birthTime: "14:30", timeUnknown: false,
    });
    const s = pillarPalaceSummary(ctx);
    expect(s).toContain(ctx.pillars.year);
    expect(s).toContain(ctx.pillars.hour);
    expect(s).toContain("조상");
    expect(s).toContain("자녀");
  });

  it("시간 미상이면 '미상'으로 표시한다", () => {
    const ctx = computeProfile({
      birthDate: "1995-08-20", birthTime: null, timeUnknown: true,
    });
    expect(pillarPalaceSummary(ctx)).toContain("시주(자녀·미래) 미상");
  });
});
