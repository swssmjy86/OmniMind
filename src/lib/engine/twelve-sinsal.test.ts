import { describe, expect, it } from "vitest";
import { sinsalOf, computeSinsal } from "./twelve-sinsal";
import { EARTHLY_BRANCHES } from "./constants";
import type { FourPillars } from "./types";

const idx = (b: string) => EARTHLY_BRANCHES.indexOf(b as (typeof EARTHLY_BRANCHES)[number]);

// 조사로 확정한 4국 표(삼합 그룹별 12신살 배정) — 신자진(수국) 기준 예시가 요청 프롬프트의
// "역마=인, 도화=유, 화개=진"과 정확히 일치함을 대표로 검증.
describe("sinsalOf — 삼합 4국 전체 표 대조", () => {
  it("인오술(화국) — 생지 인 기준 12지지 전부", () => {
    const ref = idx("인");
    const expected: Record<string, string> = {
      해: "겁살", 자: "재살", 축: "천살", 인: "지살", 묘: "년살", 진: "월살",
      사: "망신살", 오: "장성살", 미: "반안살", 신: "역마살", 유: "육해살", 술: "화개살",
    };
    for (const [branch, sinsal] of Object.entries(expected)) {
      expect(sinsalOf(ref, idx(branch))).toBe(sinsal);
    }
  });

  it("신자진(수국) — 생지 신 기준 12지지 전부(역마=인·도화=유·화개=진 교차검증)", () => {
    const ref = idx("신");
    const expected: Record<string, string> = {
      사: "겁살", 오: "재살", 미: "천살", 신: "지살", 유: "년살", 술: "월살",
      해: "망신살", 자: "장성살", 축: "반안살", 인: "역마살", 묘: "육해살", 진: "화개살",
    };
    for (const [branch, sinsal] of Object.entries(expected)) {
      expect(sinsalOf(ref, idx(branch))).toBe(sinsal);
    }
    expect(sinsalOf(ref, idx("인"))).toBe("역마살");
    expect(sinsalOf(ref, idx("유"))).toBe("년살");
    expect(sinsalOf(ref, idx("진"))).toBe("화개살");
  });

  it("사유축(금국) — 생지 사 기준 12지지 전부", () => {
    const ref = idx("사");
    const expected: Record<string, string> = {
      인: "겁살", 묘: "재살", 진: "천살", 사: "지살", 오: "년살", 미: "월살",
      신: "망신살", 유: "장성살", 술: "반안살", 해: "역마살", 자: "육해살", 축: "화개살",
    };
    for (const [branch, sinsal] of Object.entries(expected)) {
      expect(sinsalOf(ref, idx(branch))).toBe(sinsal);
    }
  });

  it("해묘미(목국) — 생지 해 기준 12지지 전부", () => {
    const ref = idx("해");
    const expected: Record<string, string> = {
      신: "겁살", 유: "재살", 술: "천살", 해: "지살", 자: "년살", 축: "월살",
      인: "망신살", 묘: "장성살", 진: "반안살", 사: "역마살", 오: "육해살", 미: "화개살",
    };
    for (const [branch, sinsal] of Object.entries(expected)) {
      expect(sinsalOf(ref, idx(branch))).toBe(sinsal);
    }
  });

  it("같은 그룹 안의 다른 지지를 기준으로 잡아도 결과 표는 동일하다(그룹만 정하는 역할)", () => {
    // 인오술 그룹 — 기준을 인/오/술 무엇으로 잡아도 묘=년살(도화)로 같아야 한다.
    expect(sinsalOf(idx("인"), idx("묘"))).toBe("년살");
    expect(sinsalOf(idx("오"), idx("묘"))).toBe("년살");
    expect(sinsalOf(idx("술"), idx("묘"))).toBe("년살");
  });

  it("자기 자신을 기준·대상으로 하면 생지/왕지/고지에 따라 지살·장성살·화개살만 나온다", () => {
    for (const b of ["인", "신", "사", "해"]) expect(sinsalOf(idx(b), idx(b))).toBe("지살");
    for (const b of ["자", "오", "묘", "유"]) expect(sinsalOf(idx(b), idx(b))).toBe("장성살");
    for (const b of ["진", "술", "축", "미"]) expect(sinsalOf(idx(b), idx(b))).toBe("화개살");
  });
});

describe("computeSinsal — 일지 기준 네 기둥 신살", () => {
  it("일지를 기준으로 년/월/일/시주 각각의 신살을 산출한다", () => {
    const fp: FourPillars = {
      year: { stem: 0, branch: idx("묘") },
      month: { stem: 0, branch: idx("술") },
      day: { stem: 0, branch: idx("신") }, // 기준 — 수국(신자진)
      hour: { stem: 0, branch: idx("인") },
    };
    const s = computeSinsal(fp);
    expect(s.day).toBe("지살"); // 신 자신은 생지
    expect(s.year).toBe("육해살"); // 신자진 기준 묘=육해살
    expect(s.month).toBe("월살"); // 신자진 기준 술=월살
    expect(s.hour).toBe("역마살"); // 신자진 기준 인=역마살
  });

  it("시주 미상이면 hour는 null", () => {
    const fp: FourPillars = {
      year: { stem: 0, branch: idx("자") },
      month: { stem: 0, branch: idx("자") },
      day: { stem: 0, branch: idx("자") },
      hour: null,
    };
    expect(computeSinsal(fp).hour).toBeNull();
  });

  it("결정론 — 같은 입력은 같은 결과", () => {
    const fp: FourPillars = {
      year: { stem: 0, branch: idx("사") },
      month: { stem: 0, branch: idx("유") },
      day: { stem: 0, branch: idx("축") },
      hour: { stem: 0, branch: idx("오") },
    };
    expect(computeSinsal(fp)).toEqual(computeSinsal(fp));
  });
});
