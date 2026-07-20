import { describe, expect, it } from "vitest";
import { palaceRelationCaption } from "./palace-relation";
import { checkTone, checkToneWarnings } from "../tone-guard";
import type { ProfileContext } from "@/lib/engine";

// 오늘 일진 지지를 자(子)로 고정 — 자 기준 여섯 관계를 내는 지지:
// 충=오, 육합=축, 삼합=진, 형=묘, 해=미, 파=유. (branchRelation 우선순위: 충>육합>삼합>형>해>파)
const TODAY = "갑자";

const noRelationPillars: ProfileContext["pillars"] = {
  year: "갑자", month: "을사", day: "병인", hour: "정해", // 자 기준 어느 것과도 무관계
};

describe("palaceRelationCaption — 형충회합 궁 캡션", () => {
  it("아무 궁도 오늘과 관계가 없으면 null", () => {
    expect(palaceRelationCaption(TODAY, noRelationPillars)).toBeNull();
  });

  it("일주가 충이면 '나와 배우자의 궁' 캡션, 톤 통과", () => {
    const pillars = { ...noRelationPillars, day: "병오" }; // 자오충
    const t = palaceRelationCaption(TODAY, pillars);
    expect(t).not.toBeNull();
    expect(t).toContain("나와 배우자의 궁");
    expect(checkTone(t!)).toHaveLength(0);
    expect(checkToneWarnings(t!)).toHaveLength(0);
  });

  it("월주가 육합이면 '부모궁' 캡션", () => {
    const pillars = { ...noRelationPillars, month: "을축" }; // 자축합
    const t = palaceRelationCaption(TODAY, pillars);
    expect(t).toContain("부모궁");
  });

  it("시주가 삼합이면 '자녀궁' 캡션", () => {
    const pillars = { ...noRelationPillars, hour: "정진" }; // 신자진 삼합
    const t = palaceRelationCaption(TODAY, pillars);
    expect(t).toContain("자녀궁");
  });

  it("년주만 관계가 있으면(형=묘) 무시하고 null — 띠 캡션과 중복 방지", () => {
    const pillars: ProfileContext["pillars"] = { ...noRelationPillars, year: "갑묘" }; // 자묘형
    expect(palaceRelationCaption(TODAY, pillars)).toBeNull();
  });

  it("우선순위: 일주와 월주 둘 다 관계가 있으면 일주가 이긴다", () => {
    const pillars = { ...noRelationPillars, day: "병오", month: "을축" };
    const t = palaceRelationCaption(TODAY, pillars);
    expect(t).toContain("나와 배우자의 궁");
    expect(t).not.toContain("부모궁");
  });

  it("일주·월주 관계 없고 시주만 있으면 시주로 폴백", () => {
    const pillars = { ...noRelationPillars, hour: "정미" }; // 자미해
    const t = palaceRelationCaption(TODAY, pillars);
    expect(t).toContain("자녀궁");
  });

  it("시주 미상(hour=null)이어도 예외 없이 동작한다", () => {
    const pillars: ProfileContext["pillars"] = { ...noRelationPillars, hour: null };
    expect(() => palaceRelationCaption(TODAY, pillars)).not.toThrow();
    expect(palaceRelationCaption(TODAY, pillars)).toBeNull();
  });

  it("여섯 관계(육합·삼합·충·형·해·파) 전부 문구가 있고 톤 가드를 통과한다", () => {
    const branchesByRelation = ["오", "축", "진", "묘", "미", "유"]; // 충·육합·삼합·형·해·파
    for (const branch of branchesByRelation) {
      const pillars: ProfileContext["pillars"] = { ...noRelationPillars, day: `병${branch}` };
      const t = palaceRelationCaption(TODAY, pillars);
      expect(t).not.toBeNull();
      expect(checkTone(t!)).toHaveLength(0);
      expect(checkToneWarnings(t!)).toHaveLength(0);
    }
  });

  it("같은 입력은 같은 결과(결정론)", () => {
    const pillars = { ...noRelationPillars, day: "병오" };
    expect(palaceRelationCaption(TODAY, pillars)).toBe(palaceRelationCaption(TODAY, pillars));
  });
});
