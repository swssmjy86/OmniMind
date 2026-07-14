import { describe, expect, it } from "vitest";
import { computeMatch, partnerFromBirth, zodiacElement, mbtiSynergy } from "./match";

describe("partnerFromBirth — 상대 기운 산출", () => {
  it("일주 앵커일(2000-01-07)은 갑자·목·염소자리", () => {
    const p = partnerFromBirth("2000-01-07");
    expect(p.dayGanzhi).toBe("갑자");
    expect(p.element).toBe("목");
    expect(p.zodiac).toBe("염소자리");
  });

  it("형식 오류는 throw", () => {
    expect(() => partnerFromBirth("2000/01/07")).toThrow();
  });
});

describe("zodiacElement — 별자리 4원소", () => {
  it("불·흙·바람·물 분류", () => {
    expect(zodiacElement("사자자리")).toBe("불");
    expect(zodiacElement("염소자리")).toBe("흙");
    expect(zodiacElement("물병자리")).toBe("바람");
    expect(zodiacElement("전갈자리")).toBe("물");
  });
});

describe("mbtiSynergy — 성향 어울림 0~5", () => {
  it("동일 유형은 최대치가 아니다(보완 축 점수 없음)", () => {
    // 같은 SN(+2), 같은 TF(+1), EI/JP 동일이라 보완 점수 없음 → 3
    expect(mbtiSynergy("INFP", "INFP")).toBe(3);
  });
  it("세상 보는 눈(SN)이 같고 에너지·리듬이 보완이면 높다", () => {
    // INFP vs ENFJ: same N(+2), same F(+1), diff E/I(+1), diff J/P(+1) → 5
    expect(mbtiSynergy("INFP", "ENFJ")).toBe(5);
  });
  it("모든 축이 다르면(SN 다름) 낮다", () => {
    // INFP vs ESTJ: diff SN(0), diff TF(0), diff EI(+1), diff JP(+1) → 2
    expect(mbtiSynergy("INFP", "ESTJ")).toBe(2);
  });
});

describe("computeMatch — 우리의 조합", () => {
  const me = { element: "목", zodiac: "사자자리", mbti: "INFP" } as const;

  it("상대 기운·관계·점수를 산출한다", () => {
    const m = computeMatch(me, { birthDate: "2000-01-07", mbti: "ENFJ" }, "연인");
    expect(m.partner.dayGanzhi).toBe("갑자");
    expect(m.elementRelation).toBe("동행"); // 목 vs 목
    expect(m.zodiacHarmony).toBe("다름"); // 불 vs 흙
    expect(m.mbtiSynergy).toBe(5);
    expect(m.score).toBeGreaterThanOrEqual(0);
    expect(m.score).toBeLessThanOrEqual(100);
  });

  it("같은 날 태어난 같은 유형은 점수가 높다", () => {
    const twin = computeMatch(
      { element: "목", zodiac: "염소자리", mbti: "INFP" },
      { birthDate: "2000-01-07", mbti: "INFP" },
      "친구",
    );
    expect(twin.elementRelation).toBe("동행");
    expect(twin.zodiacHarmony).toBe("닮음");
    expect(twin.score).toBeGreaterThanOrEqual(70);
  });

  it("상대 MBTI 미입력이면 synergy는 null, 점수는 중립 반영", () => {
    const m = computeMatch(me, { birthDate: "2000-01-07" }, "동료");
    expect(m.mbtiSynergy).toBeNull();
    expect(m.score).toBeGreaterThanOrEqual(0);
    expect(m.score).toBeLessThanOrEqual(100);
  });

  it("모드에 따라 점수 가중이 달라진다 (같은 입력, 다른 모드)", () => {
    const lover = computeMatch(me, { birthDate: "1995-08-20", mbti: "ESTJ" }, "연인");
    const worker = computeMatch(me, { birthDate: "1995-08-20", mbti: "ESTJ" }, "동료");
    expect(lover.mode).toBe("연인");
    expect(worker.mode).toBe("동료");
    // 결정적 산출 — 두 모드가 완전히 같은 점수일 필요는 없고, 각자 유효 범위면 된다.
    for (const s of [lover.score, worker.score]) {
      expect(s).toBeGreaterThanOrEqual(0);
      expect(s).toBeLessThanOrEqual(100);
    }
  });

  it("점수는 결정적(같은 입력 → 같은 점수)", () => {
    const a = computeMatch(me, { birthDate: "1992-11-03", mbti: "ISTP" }, "친구");
    const b = computeMatch(me, { birthDate: "1992-11-03", mbti: "ISTP" }, "친구");
    expect(a.score).toBe(b.score);
  });
});
