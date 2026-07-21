import { describe, expect, it } from "vitest";
import {
  computeGuestChongun, computeGuestCreditReading, computeGuestMatchDeep,
} from "./guest-actions";
import { LLM_SECTION_TITLE, CREDIT_READING_PRODUCTS } from "@/lib/interpret/content/credit-readings";
import type { Draft } from "@/app/onboarding/draft";

const draft: Draft = {
  nickname: "다인", birthDate: "1995-08-20", birthTime: "14:30", timeUnknown: false,
};

describe("computeGuestChongun — 게스트 총운", () => {
  it("정상 draft면 섹션과 ctx를 반환한다", async () => {
    const r = await computeGuestChongun(draft);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.sections.length).toBeGreaterThan(0);
      expect(r.ctx.pillars.day.length).toBe(2);
    }
  });

  it("생년월일 형식이 잘못되면 {ok:false}", async () => {
    const r = await computeGuestChongun({ ...draft, birthDate: "not-a-date" });
    expect(r.ok).toBe(false);
  });

  it("LLM 섹션(당신만을 위한 이야기)이 없다 — 게스트는 템플릿까지만", async () => {
    const r = await computeGuestChongun(draft);
    if (r.ok) expect(r.sections.some((s) => s.title === LLM_SECTION_TITLE)).toBe(false);
  });
});

describe("computeGuestCreditReading — 게스트 사주상품", () => {
  it("4종 상품 전부 정상 draft에서 섹션을 반환하고 LLM 섹션은 없다", async () => {
    for (const product of CREDIT_READING_PRODUCTS) {
      const r = await computeGuestCreditReading(product, draft);
      expect(r.ok).toBe(true);
      if (r.ok) {
        expect(r.sections).toHaveLength(4); // ①핵심 결 ②오행 ③운의 계절 ④보조축 — LLM(⑤) 없음
        expect(r.sections.some((s) => s.title === LLM_SECTION_TITLE)).toBe(false);
      }
    }
  });

  it("알 수 없는 상품이면 {ok:false}", async () => {
    const r = await computeGuestCreditReading("chongun", draft); // chongun은 credit-reading 상품 아님
    expect(r.ok).toBe(false);
  });

  it("생년월일 형식이 잘못되면 {ok:false}", async () => {
    const r = await computeGuestCreditReading("career", { ...draft, birthDate: "1995/08/20" });
    expect(r.ok).toBe(false);
  });
});

describe("computeGuestMatchDeep — 게스트 궁합 심층", () => {
  const validPartner = { birthDate: "1993-03-05", birthTime: "09:00", timeUnknown: false, mode: "lover" };

  it("정상 입력이면 섹션을 반환하고 readingId는 항상 null", async () => {
    const r = await computeGuestMatchDeep(draft, validPartner);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.sections.length).toBeGreaterThan(0);
      expect(r.readingId).toBeNull();
      expect(r.usedCredit).toBe(false);
    }
  });

  it("잘못된 모드 슬러그면 invalid", async () => {
    const r = await computeGuestMatchDeep(draft, { ...validPartner, mode: "enemy" });
    expect(r).toEqual({ ok: false, reason: "invalid" });
  });

  it("상대 생년월일 형식이 잘못되면 invalid", async () => {
    const r = await computeGuestMatchDeep(draft, { ...validPartner, birthDate: "bad" });
    expect(r).toEqual({ ok: false, reason: "invalid" });
  });

  it("raw가 객체가 아니면 invalid", async () => {
    const r = await computeGuestMatchDeep(draft, null);
    expect(r).toEqual({ ok: false, reason: "invalid" });
  });
});
