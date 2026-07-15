import { describe, expect, it } from "vitest";
import { DAEUN_SEASON_TEXT, daeunSeasonText } from "./daeun";
import { HEAVENLY_STEMS, EARTHLY_BRANCHES } from "@/lib/engine/constants";
import { checkTone, checkToneWarnings } from "../tone-guard";

describe("대운 해석 문구", () => {
  it("오행 5종 전부 존재 + 톤 통과(경고 포함)", () => {
    for (const el of ["목", "화", "토", "금", "수"]) {
      const t = DAEUN_SEASON_TEXT[el];
      expect(t?.length).toBeGreaterThan(0);
      expect(checkTone(t)).toHaveLength(0);
      expect(checkToneWarnings(t)).toHaveLength(0);
    }
  });

  it("간지 → 천간 오행 매핑 — 60갑자 전부 문구가 나온다", () => {
    for (let i = 0; i < 60; i++) {
      const gz = HEAVENLY_STEMS[i % 10] + EARTHLY_BRANCHES[i % 12];
      expect(daeunSeasonText(gz).length).toBeGreaterThan(0);
    }
    // 대표 검증: 갑=목, 병=화, 임=수
    expect(daeunSeasonText("갑자")).toBe(DAEUN_SEASON_TEXT.목);
    expect(daeunSeasonText("병인")).toBe(DAEUN_SEASON_TEXT.화);
    expect(daeunSeasonText("임신")).toBe(DAEUN_SEASON_TEXT.수);
  });

  it("형식이 어긋나면 빈 문자열(화면에서 조용히 생략)", () => {
    expect(daeunSeasonText("")).toBe("");
    expect(daeunSeasonText("xx")).toBe("");
  });
});
