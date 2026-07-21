import { describe, expect, it } from "vitest";
import { checkTone, checkToneWarnings } from "@/lib/interpret/tone-guard";
import { PERSONAS } from "./personas";
import { ACCESS_LABEL, PRODUCT_PERSONA, PRODUCTS } from "./products";

describe("상품 카탈로그 v2 (4탭 IA 스펙 §4)", () => {
  it("7종 — today + 총운/직업/연애/재물/궁합/결혼", () => {
    expect(PRODUCTS.map((p) => p.id)).toEqual([
      "today", "chongun", "career", "love", "wealth", "match", "marriage",
    ]);
  });

  it("접근 등급 — 전부 무료(2026-07-21 게스트 개방, 로그인 무관)", () => {
    const access = Object.fromEntries(PRODUCTS.map((p) => [p.id, p.access]));
    expect(access).toEqual({
      today: "free", chongun: "free",
      career: "free", love: "free", wealth: "free", match: "free", marriage: "free",
    });
  });

  it("페르소나 — 서온=총운·직업, 홍연=연애·궁합·결혼, 금오=재물, 달지기=today", () => {
    const persona = Object.fromEntries(PRODUCTS.map((p) => [p.id, p.personaId]));
    expect(persona).toEqual({
      today: "dalzigi", chongun: "seoon", career: "seoon",
      love: "hongyeon", match: "hongyeon", marriage: "hongyeon", wealth: "geumo",
    });
    for (const p of PRODUCTS) expect(PERSONAS[p.personaId]).toBeDefined();
  });

  it("1단계 연결 — today=/today, chongun=/saju/chongun, match=/saju/match-deep live; 나머지 soon", () => {
    const href = Object.fromEntries(PRODUCTS.map((p) => [p.id, `${p.status}:${p.href}`]));
    expect(href).toEqual({
      today: "live:/today", chongun: "live:/saju/chongun", match: "live:/saju/match-deep",
      career: "live:/saju/career", love: "live:/saju/love",
      wealth: "live:/saju/wealth", marriage: "live:/saju/marriage",
    });
  });

  it("PRODUCT_PERSONA는 PRODUCTS의 personaId와 1:1로 파생된다(LLM 시스템 프롬프트가 참조)", () => {
    for (const p of PRODUCTS) expect(PRODUCT_PERSONA[p.id]).toBe(p.personaId);
    expect(Object.keys(PRODUCT_PERSONA)).toHaveLength(PRODUCTS.length);
  });

  it("카피가 톤 가드를 통과한다", () => {
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
