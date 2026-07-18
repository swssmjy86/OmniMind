import { describe, expect, it } from "vitest";
import { checkTone, checkToneWarnings } from "@/lib/interpret/tone-guard";
import { PERSONAS } from "./personas";
import { ACCESS_LABEL, PRODUCTS } from "./products";

describe("상품 카탈로그 (§2.1)", () => {
  it("5종 라인업 — 일진·내 사주 심층·궁합 심층·인연·재물 (홈 §4.4 순서)", () => {
    expect(PRODUCTS.map((p) => p.id)).toEqual([
      "daily", "profile_deep", "match_deep", "fate", "wealth",
    ]);
  });

  it("접근 등급이 설계서 §2.1 표와 일치한다", () => {
    const access = Object.fromEntries(PRODUCTS.map((p) => [p.id, p.access]));
    expect(access).toEqual({
      daily: "free",          // 누구나 무료
      profile_deep: "login",  // 로그인하면 무료
      match_deep: "credit",
      fate: "credit",
      wealth: "credit",
    });
  });

  it("담당 페르소나가 설계서 §2.1 표와 일치한다 — 홍연이 인연·궁합 겸임", () => {
    const persona = Object.fromEntries(PRODUCTS.map((p) => [p.id, p.personaId]));
    expect(persona).toEqual({
      daily: "dalzigi", profile_deep: "seoon",
      match_deep: "hongyeon", fate: "hongyeon", wealth: "geumo",
    });
    for (const p of PRODUCTS) expect(PERSONAS[p.personaId]).toBeDefined();
  });

  it("live 상품은 실제 경로로 연결되고, soon 상품만 빈 경로가 허용된다", () => {
    for (const p of PRODUCTS) {
      if (p.status === "live") expect(p.href).toMatch(/^\//);
    }
    // 1단계: 인연·재물은 화면이 아직 없다 — 카드 비활성(soon)
    expect(PRODUCTS.find((p) => p.id === "fate")?.status).toBe("soon");
    expect(PRODUCTS.find((p) => p.id === "wealth")?.status).toBe("soon");
  });

  it("상품 카피(title·tagline·접근 라벨)가 톤 가드를 통과한다", () => {
    const texts = [
      ...PRODUCTS.flatMap((p) => [p.title, p.tagline]),
      ...Object.values(ACCESS_LABEL),
    ];
    for (const t of texts) {
      expect(checkTone(t)).toEqual([]);
      expect(checkToneWarnings(t)).toEqual([]);
    }
  });
});
