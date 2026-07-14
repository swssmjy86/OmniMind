import { describe, expect, it } from "vitest";
import { computeMatch, MATCH_MODES, type MatchMe } from "@/lib/engine/match";
import { assembleMatch, scoreLine } from "./match";
import { checkTone } from "../tone-guard";

const me: MatchMe = { element: "목", zodiac: "사자자리", mbti: "INFP" };

// 오행 관계 5종을 모두 만드는 상대 생일들(일간 오행이 각기 다른 날짜)
const PARTNER_DATES = [
  "2000-01-07", // 갑자(목) → 동행
  "2000-01-08", // 을축(목) — 여분
  "2000-01-09", // 병인(화) → 발산
  "2000-01-11", // 무진(토) → 결실
  "2000-01-13", // 경오(금) → 단련
  "2000-01-15", // 임신(수) → 채움
];

describe("궁합 해석 조립 (P7)", () => {
  it("모드 × 상대 조합 전부에서 5개 섹션 + 톤 통과", () => {
    for (const mode of MATCH_MODES) {
      for (const birthDate of PARTNER_DATES) {
        for (const mbti of ["ENFJ", undefined] as const) {
          const m = computeMatch(me, { birthDate, mbti }, mode);
          const sections = assembleMatch({ match: m, myElement: me.element, nickname: "새벽" });
          expect(sections).toHaveLength(5);
          for (const s of sections) {
            expect(s.body.length).toBeGreaterThan(0);
            expect(checkTone(s.body)).toHaveLength(0);
          }
        }
      }
    }
  });

  it("온도(점수)·상대 일진·모드가 본문에 반영된다", () => {
    const m = computeMatch(me, { birthDate: "2000-01-07", mbti: "ENFJ" }, "연인");
    const sections = assembleMatch({ match: m, myElement: me.element });
    expect(sections[0].body).toContain(`${m.score}°`);
    expect(sections[1].body).toContain("갑자");
    expect(sections[4].title).toContain("연인");
  });

  it("scoreLine — 전 구간에서 문구 존재 + 톤 통과", () => {
    for (const s of [30, 55, 70, 85, 100]) {
      expect(scoreLine(s).length).toBeGreaterThan(0);
      expect(checkTone(scoreLine(s))).toHaveLength(0);
    }
  });
});
