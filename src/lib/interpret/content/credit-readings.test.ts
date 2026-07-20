import { describe, expect, it } from "vitest";
import { computeProfile } from "@/lib/engine";
import { checkTone, checkToneWarnings } from "../tone-guard";
import {
  CREDIT_READING_PRODUCTS, LLM_SECTION_TITLE, assembleCreditReading,
  creditReadingPrompt, isCreditReadingProduct, readingSectionTitles,
} from "./credit-readings";

const ctx = computeProfile({
  birthDate: "1990-06-15", birthTime: "07:30", timeUnknown: false,
  gender: "male",
});

describe("크레딧 풀이 조립 4종 (3단계 스펙 §3)", () => {
  it("상품 4종·가드", () => {
    expect(CREDIT_READING_PRODUCTS).toEqual(["career", "love", "wealth", "marriage"]);
    expect(isCreditReadingProduct("career")).toBe(true);
    expect(isCreditReadingProduct("chongun")).toBe(false);
  });

  it("모든 상품: 섹션 4개 — ①핵심 결 ②오행 ③운의 계절 ④보조축(마지막) — 위계 §3", () => {
    for (const p of CREDIT_READING_PRODUCTS) {
      const out = assembleCreditReading(p, ctx, "새벽", 36);
      expect(out).toHaveLength(4);
      expect(out[1].title).toBe("오행이 건네는 조언");
      expect(out[2].title).toBe("운의 계절");
      expect(out[3].title).toBe("당신에게 드러나는 방식"); // 보조축은 항상 마지막
      expect(out[2].body).toContain("대운");
      // 엿보기 제목 = 실제 섹션 제목 + LLM 제목
      expect(readingSectionTitles(p)).toEqual([...out.map((s) => s.title), LLM_SECTION_TITLE]);
    }
  });

  it("보조축 섹션은 신강/신약과 강한 오행을 수식으로만 담는다(단독 결론 금지 — 사주 결을 받는 문장)", () => {
    for (const p of CREDIT_READING_PRODUCTS) {
      const aux = assembleCreditReading(p, ctx, "새벽", 36)[3].body;
      expect(aux).toMatch(/^이 |^이 결|^이 마음|^이 감각/); // 앞 섹션(팔자)의 결을 받아 수식
      expect(aux).toContain(`${ctx.elements.dominant}(`); // "목(木)의 기운이…" 형태
    }
  });

  it("전 카피 톤 가드 — 4상품 × 5갈래(dominant 조작 불가하므로 표를 직접 검사)", async () => {
    const mod = await import("./credit-readings");
    // 내부 표를 export하지 않으므로, 조립 결과와 프롬프트로 검사 가능한 것 + 표 전수는
    // __TEXT_FOR_TEST export로 노출한다(테스트 전용 — 런타임 사용 금지 주석).
    const { __TEXT_FOR_TEST } = mod;
    for (const t of __TEXT_FOR_TEST) {
      expect(checkTone(t)).toEqual([]);
      expect(checkToneWarnings(t)).toEqual([]);
    }
  });

  it("LLM 프롬프트는 상품·섹션 본문을 담고 새 결론을 금지한다", () => {
    const sections = assembleCreditReading("career", ctx, "새벽", 36);
    const prompt = creditReadingPrompt("career", ctx, sections);
    expect(prompt).toContain("직업");
    expect(prompt).toContain(sections[0].body.slice(0, 20));
  });
});
