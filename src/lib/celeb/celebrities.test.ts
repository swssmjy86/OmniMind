import { describe, it, expect } from "vitest";
import { computeProfile } from "@/lib/engine";
import { checkTone } from "@/lib/interpret/tone-guard";
import {
  CELEBRITIES, CELEB_CATEGORIES, CELEB_REGIONS, CELEB_MIN_YEAR, findCelebrity, celebritiesIn,
} from "./celebrities";

describe("유명인 목록", () => {
  it("id가 중복되지 않는다", () => {
    const ids = CELEBRITIES.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("생년월일이 YYYY-MM-DD 형식이다", () => {
    for (const c of CELEBRITIES) {
      expect(c.birthDate, c.name).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it("절기 테이블 범위(1900~) 안에서 태어난 인물만 담는다", () => {
    for (const c of CELEBRITIES) {
      expect(Number(c.birthDate.slice(0, 4)), c.name).toBeGreaterThanOrEqual(CELEB_MIN_YEAR);
    }
  });

  // 화면은 지역 × 갈래 두 축으로 좁힌다 — 어느 조합이든 비면 빈 목록이 그대로 노출된다.
  it("지역 × 갈래 조합이 하나도 비지 않는다", () => {
    const regions = new Set(CELEB_REGIONS.map((r) => r.id));
    const cats = new Set(CELEB_CATEGORIES.map((c) => c.id));
    for (const c of CELEBRITIES) {
      expect(regions.has(c.region), c.name).toBe(true);
      expect(cats.has(c.category), c.name).toBe(true);
    }
    for (const r of CELEB_REGIONS) {
      for (const cat of CELEB_CATEGORIES) {
        expect(celebritiesIn(r.id, cat.id).length, `${r.label}·${cat.label}`).toBeGreaterThan(0);
      }
    }
  });

  // 근대 한국인은 공식 기록이 음력인 경우가 많아 담지 않기로 했다(수록 원칙 5).
  it("국내 인물은 음력 기록 위험이 큰 시대(1950년 이전)를 담지 않는다", () => {
    for (const c of CELEBRITIES.filter((x) => x.region === "kr")) {
      expect(Number(c.birthDate.slice(0, 4)), c.name).toBeGreaterThanOrEqual(1950);
    }
  });

  // 이름·소개는 화면에 그대로 나가는 사용자 대면 문구다.
  it("한 줄 소개가 톤 가드를 통과한다", () => {
    for (const c of CELEBRITIES) {
      expect(checkTone(c.blurb), `${c.name}: ${c.blurb}`).toEqual([]);
    }
  });

  // 시간 미상으로 사주를 세운다 — 한 명이라도 엔진이 거부하면 그 화면은 통째로 실패한다.
  it("전원 시간 미상으로 사주가 세워진다", () => {
    for (const c of CELEBRITIES) {
      expect(
        () => computeProfile({ birthDate: c.birthDate, birthTime: null, timeUnknown: true }),
        c.name,
      ).not.toThrow();
    }
  });

  it("findCelebrity는 id로 찾고 없으면 null", () => {
    expect(findCelebrity("iu")?.name).toBe("아이유");
    expect(findCelebrity("없는사람")).toBeNull();
  });
});
