import { describe, expect, it } from "vitest";
import { checkTone, checkToneWarnings } from "@/lib/interpret/tone-guard";
import type { BranchRelation } from "@/lib/engine/year-sign";
import {
  relationLine, signHeadline, SOLAR_TERM_NOTE, YEAR_STEM_LABEL,
} from "./year-sign";

const RELATIONS: (BranchRelation | null)[] = ["육합", "삼합", "충", "형", "해", "파", null];

describe("띠 일진 문구 (스펙 §5)", () => {
  it("관계 7종(무관계 포함) 전부 비어 있지 않은 단락을 돌려준다", () => {
    for (const r of RELATIONS) {
      expect(relationLine(r).length).toBeGreaterThan(20);
    }
  });

  it("모든 문구가 톤 가드를 통과한다 — 충·형·파도 공포 없이", () => {
    const texts = [
      ...RELATIONS.map((r) => relationLine(r)),
      signHeadline(1990, "말"),
      SOLAR_TERM_NOTE,
      YEAR_STEM_LABEL,
    ];
    for (const t of texts) {
      expect(checkTone(t)).toEqual([]);
      expect(checkToneWarnings(t)).toEqual([]);
    }
  });

  it("헤더는 년도와 띠를 담는다", () => {
    expect(signHeadline(1990, "말")).toBe("1990년생, 말띠시군요.");
  });

  it("입춘 고지는 양력 기준임을 밝힌다", () => {
    expect(SOLAR_TERM_NOTE).toContain("양력");
    expect(SOLAR_TERM_NOTE).toContain("입춘");
  });
});
