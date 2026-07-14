import { describe, expect, it } from "vitest";
import { computeProfile } from "@/lib/engine";
import type { DailyContext, DailyRelation } from "@/lib/engine/daily";
import { assembleConcern, concernPrompt, CONCERN_CATEGORIES, isConcernCategory } from "./concern";
import { checkTone } from "../tone-guard";

const profile = computeProfile({
  birthDate: "1990-03-15",
  birthTime: "08:30",
  timeUnknown: false,
  bloodType: "A",
  mbti: "INFP",
});

const RELATIONS: (DailyRelation | null)[] = ["동행", "채움", "발산", "결실", "단련", null];

const daily = (relation: DailyRelation | null): DailyContext => ({
  date: "2026-07-14",
  dayGanzhi: "갑자",
  element: "목",
  elementIndex: 0,
  relation,
});

describe("고민 조언 조립 (P6)", () => {
  it("카테고리 × 관계 전 조합에서 4개 섹션 생성", () => {
    for (const category of CONCERN_CATEGORIES) {
      for (const r of RELATIONS) {
        const sections = assembleConcern({ profile, daily: daily(r), category, nickname: "새벽" });
        expect(sections).toHaveLength(4);
        for (const s of sections) {
          expect(s.title.length).toBeGreaterThan(0);
          expect(s.body.length).toBeGreaterThan(0);
        }
      }
    }
  });

  it("닉네임·오늘 간지·내 오행이 본문에 반영된다", () => {
    const sections = assembleConcern({
      profile, daily: daily("결실"), category: "선택·결정", nickname: "새벽",
    });
    expect(sections[0].body).toContain("새벽님");
    expect(sections[1].body).toContain("갑자");
    expect(sections[2].body).toContain(profile.dayMaster.element);
  });

  it("전 조합 문구가 톤 검사(§5.4) 통과", () => {
    for (const category of CONCERN_CATEGORIES) {
      for (const r of RELATIONS) {
        const sections = assembleConcern({ profile, daily: daily(r), category, nickname: "새벽" });
        for (const s of sections) expect(checkTone(s.body)).toHaveLength(0);
      }
    }
  });

  it("LLM 프롬프트에 카테고리·고민·오늘 기운이 담긴다", () => {
    const p = concernPrompt(
      { profile, daily: daily("단련"), category: "관계", nickname: "새벽" },
      "친구와 다퉜어요",
    );
    expect(p).toContain("관계");
    expect(p).toContain("친구와 다퉜어요");
    expect(p).toContain("갑자");
    expect(p).toContain("단련");
  });

  it("isConcernCategory — 유효/무효 판별", () => {
    expect(isConcernCategory("관계")).toBe(true);
    expect(isConcernCategory("주식")).toBe(false);
  });
});
