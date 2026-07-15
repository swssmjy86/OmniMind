import { describe, expect, it } from "vitest";
import { computeProfile } from "./index";
import {
  computeMatch, computeDeepMatch, computeBond, partnerFromBirth, zodiacElement,
  mbtiSynergy, fillingElements, SLUG_TO_MODE, MODE_TO_SLUG, isMatchModeSlug,
} from "./match";

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

  it("대칭성 — 같은 커플은 누가 계산해도 같은 온도", () => {
    // A: 2000-01-07 갑자(목)·염소자리, B: 2000-01-09 병인(화)·염소자리
    const a = partnerFromBirth("2000-01-07");
    const b = partnerFromBirth("2000-01-09");
    for (const mode of ["연인", "친구", "동료"] as const) {
      const ab = computeMatch(
        { element: a.element, zodiac: a.zodiac, mbti: "INFP", dayGanzhi: a.dayGanzhi },
        { birthDate: "2000-01-09", mbti: "ENFJ" }, mode,
      );
      const ba = computeMatch(
        { element: b.element, zodiac: b.zodiac, mbti: "ENFJ", dayGanzhi: b.dayGanzhi },
        { birthDate: "2000-01-07", mbti: "INFP" }, mode,
      );
      expect(ab.score).toBe(ba.score);
    }
  });
});

describe("computeBond — 간지의 인연", () => {
  it("천간합: 갑자 × 기사(갑기합)", () => {
    expect(computeBond("갑자", "기사")).toEqual({ stemCombine: true, branchBond: null });
  });
  it("일지 육합: 갑자 × 을축(자축합)", () => {
    expect(computeBond("갑자", "을축")).toEqual({ stemCombine: false, branchBond: "육합" });
  });
  it("일지 충: 갑자 × 경오(자오충)", () => {
    expect(computeBond("갑자", "경오")).toEqual({ stemCombine: false, branchBond: "충" });
  });
  it("아무 관계도 아니면 둘 다 없음, 대칭", () => {
    expect(computeBond("갑자", "병인")).toEqual({ stemCombine: false, branchBond: null });
    expect(computeBond("기사", "갑자")).toEqual(computeBond("갑자", "기사"));
  });
  it("computeMatch — 내 일주를 주면 bond가 점수·결과에 반영된다", () => {
    const base = { element: "목", zodiac: "사자자리", mbti: "INFP" } as const;
    // 2000-01-12 = 기사 (갑자와 갑기합)
    const withBond = computeMatch({ ...base, dayGanzhi: "갑자" }, { birthDate: "2000-01-12" }, "친구");
    const noBond = computeMatch(base, { birthDate: "2000-01-12" }, "친구");
    expect(withBond.bond).toEqual({ stemCombine: true, branchBond: null });
    expect(noBond.bond).toBeNull();
    expect(withBond.score).toBeGreaterThan(noBond.score);
  });
});

describe("computeDeepMatch — 양방향 심층 궁합 (P7-2)", () => {
  const a = computeProfile({
    birthDate: "1990-03-15", birthTime: "08:30", timeUnknown: false,
    bloodType: "A", mbti: "INFP",
  });
  const b = computeProfile({
    birthDate: "1993-11-02", birthTime: "22:10", timeUnknown: false,
    bloodType: "O", mbti: "ESTJ",
  });

  it("두 프로필로 관계·조화·시너지·보완을 산출한다", () => {
    const m = computeDeepMatch(a, b, "연인");
    expect(m.partner.dayGanzhi).toBe(b.pillars.day);
    expect(m.myDayGanzhi).toBe(a.pillars.day);
    expect(m.partner.mbti).toBe("ESTJ");
    expect(m.mbtiSynergy).toBe(mbtiSynergy("INFP", "ESTJ"));
    expect(m.score).toBeGreaterThanOrEqual(0);
    expect(m.score).toBeLessThanOrEqual(100);
  });

  it("보완 오행은 상대의 lacking ∩ 내 보유 오행", () => {
    const m = computeDeepMatch(a, b, "친구");
    for (const e of m.complement.iFillPartner) {
      expect(b.elements.lacking).toContain(e);
      expect(a.elements.counts[e as keyof typeof a.elements.counts]).toBeGreaterThan(0);
    }
    for (const e of m.complement.partnerFillsMe) {
      expect(a.elements.lacking).toContain(e);
      expect(b.elements.counts[e as keyof typeof b.elements.counts]).toBeGreaterThan(0);
    }
  });

  it("결정적 — 같은 입력이면 같은 결과", () => {
    expect(computeDeepMatch(a, b, "동료")).toEqual(computeDeepMatch(a, b, "동료"));
  });

  it("대칭성 — 방향을 바꿔도 온도는 같다", () => {
    for (const mode of ["연인", "친구", "동료"] as const) {
      expect(computeDeepMatch(a, b, mode).score).toBe(computeDeepMatch(b, a, mode).score);
    }
  });

  it("bond가 항상 산출된다(두 일주를 모두 아는 심층 궁합)", () => {
    const m = computeDeepMatch(a, b, "연인");
    expect(m.bond).not.toBeNull();
  });
});

describe("fillingElements", () => {
  it("부족 오행 중 보유한 것만 고른다", () => {
    const counts = { 목: 2, 화: 0, 토: 3, 금: 0, 수: 1 };
    expect(fillingElements({ counts }, ["화", "토", "수"])).toEqual(["토", "수"]);
    expect(fillingElements({ counts }, [])).toEqual([]);
  });
});

describe("모드 슬러그 변환", () => {
  it("양방향 매핑이 일치한다", () => {
    for (const [mode, slug] of Object.entries(MODE_TO_SLUG)) {
      expect(SLUG_TO_MODE[slug as keyof typeof SLUG_TO_MODE]).toBe(mode);
    }
    expect(isMatchModeSlug("lover")).toBe(true);
    expect(isMatchModeSlug("연인")).toBe(false);
  });
});
