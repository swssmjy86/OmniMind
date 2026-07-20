import { describe, expect, it } from "vitest";
import { computeProfile } from "@/lib/engine";
import { computeDeepMatch, MATCH_MODES } from "@/lib/engine/match";
import { assembleDeepMatch } from "./match";
import { matchDeepPrompt, matchDeepSectionTitles } from "./match-deep";

// 갑자 × 기사(갑기 천간합)로 고정 — "인연의 매듭" 섹션이 모든 모드에서 안정적으로 나오게 해,
// matchDeepSectionTitles(정적 엿보기 목록)와 실제 assembleDeepMatch 출력이 항상 일치한다.
const me = computeProfile({
  birthDate: "2000-01-07", birthTime: "07:30", timeUnknown: false, gender: "male",
});
const partner = computeProfile({
  birthDate: "2000-01-12", birthTime: "14:20", timeUnknown: false,
});

describe("궁합 심층 제목·프롬프트 (3단계 스펙 §5)", () => {
  it("제목 목록이 실제 assembleDeepMatch 출력과 어긋날 수 없다 — 전 모드 대조", () => {
    for (const mode of MATCH_MODES) {
      const sections = assembleDeepMatch({
        match: computeDeepMatch(me, partner, mode),
        myElement: me.dayMaster.element, myName: "새벽", partnerName: "상대",
      });
      const titles = matchDeepSectionTitles(mode);
      expect(titles).toHaveLength(sections.length + 1);
      expect(titles.slice(0, sections.length)).toEqual(sections.map((s) => s.title));
      expect(titles.at(-1)).toBe("당신만을 위한 이야기");
    }
  });

  it("프롬프트는 섹션 본문을 담고 새 단정을 금지한다", () => {
    const sections = assembleDeepMatch({
      match: computeDeepMatch(me, partner, "연인"),
      myElement: me.dayMaster.element, myName: "새벽", partnerName: "상대",
    });
    const p = matchDeepPrompt(sections);
    expect(p).toContain(sections[0].body.slice(0, 15));
    expect(p).toContain("새로운 단정");
  });
});
