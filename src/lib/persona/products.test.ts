import { describe, expect, it } from "vitest";
import { checkTone, checkToneWarnings } from "@/lib/interpret/tone-guard";
import { PERSONAS } from "./personas";
import { PRODUCT_PERSONA, PRODUCTS } from "./products";

describe("상품 카탈로그 v2 (4탭 IA 스펙 §4)", () => {
  it("7종 — today + 총운/직업/연애/재물/궁합/결혼", () => {
    expect(PRODUCTS.map((p) => p.id)).toEqual([
      "today", "chongun", "career", "love", "wealth", "match", "marriage",
    ]);
  });

  it("접근 등급(숨긴 기능) — today만 게스트 무료, 나머지는 로그인 전용. UI 비노출 메타데이터", () => {
    const access = Object.fromEntries(PRODUCTS.map((p) => [p.id, p.access]));
    expect(access).toEqual({
      today: "free", chongun: "login",
      career: "login", love: "login", wealth: "login", match: "login", marriage: "login",
    });
  });

  it("페르소나 — 7상품 1:1 전담(겸직 없음, persona-plan.md 7인 체제)", () => {
    const persona = Object.fromEntries(PRODUCTS.map((p) => [p.id, p.personaId]));
    expect(persona).toEqual({
      today: "dalzigi", chongun: "seoon", career: "byeori",
      love: "hongyeon", match: "yeonri", marriage: "onsae", wealth: "geumo",
    });
    // 전담 체제 — 같은 페르소나가 두 상품을 겸직하지 않는다.
    expect(new Set(Object.values(persona)).size).toBe(PRODUCTS.length);
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
    const texts = PRODUCTS.flatMap((p) => [p.title, p.tagline]);
    for (const t of texts) {
      expect(checkTone(t)).toEqual([]);
      expect(checkToneWarnings(t)).toEqual([]);
    }
  });
});
