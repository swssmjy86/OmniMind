import { describe, expect, it } from "vitest";
import { computeProfile } from "@/lib/engine";
import { computeMatch, computeDeepMatch, MATCH_MODES, type MatchMe } from "@/lib/engine/match";
import { assembleMatch, assembleDeepMatch, bloodText, bondText, complementText, scoreLine } from "./match";
import { checkTone } from "../tone-guard";

const me: MatchMe = { element: "목", zodiac: "사자자리", mbti: "INFP" };

// 오행 관계 5종을 모두 만드는 상대 생일들(일간 오행이 각기 다른 날짜)
const PARTNER_DATES = [
  "2000-01-07", // 갑자(목) → 동행
  "2000-01-08", // 을축(목) — 여분
  "2000-01-09", // 병인(화) → 발산
  "2000-01-11", // 무진(토) → 결실
  "2000-01-13", // 경오(금) → 단련
  "2000-01-15", // 임신(수) → 채움
];

describe("궁합 해석 조립 (P7)", () => {
  it("모드 × 상대 조합 전부에서 6개 섹션 + 톤 통과", () => {
    for (const mode of MATCH_MODES) {
      for (const birthDate of PARTNER_DATES) {
        for (const mbti of ["ENFJ", undefined] as const) {
          const m = computeMatch(me, { birthDate, mbti }, mode);
          const sections = assembleMatch({ match: m, myElement: me.element, nickname: "새벽" });
          expect(sections).toHaveLength(6);
          for (const s of sections) {
            expect(s.body.length).toBeGreaterThan(0);
            expect(checkTone(s.body)).toHaveLength(0);
          }
        }
      }
    }
  });

  it("온도(점수)·상대 일진·모드가 본문에 반영된다", () => {
    const m = computeMatch(me, { birthDate: "2000-01-07", mbti: "ENFJ" }, "연인");
    const sections = assembleMatch({ match: m, myElement: me.element });
    expect(sections[0].body).toContain(`${m.score}°`);
    expect(sections[1].body).toContain("갑자");
    expect(sections[5].title).toContain("연인");
  });

  it("bloodText — 0/1/2/null 전 갈래 문구 존재 + 톤 통과", () => {
    for (const s of [0, 1, 2, null]) {
      const t = bloodText(s);
      expect(t.length).toBeGreaterThan(0);
      expect(checkTone(t)).toHaveLength(0);
    }
  });

  it("혈액형을 서로 알면 그 결이 섹션에 실린다", () => {
    const m = computeMatch(
      { ...me, bloodType: "A" },
      { birthDate: "2000-01-07", bloodType: "O" },
      "연인",
    );
    const sections = assembleMatch({ match: m, myElement: me.element });
    expect(sections[4].title).toBe("혈액형이 말하길");
    expect(sections[4].body).toBe(bloodText(2));
  });

  it("scoreLine — 전 구간에서 문구 존재 + 톤 통과", () => {
    for (const s of [30, 55, 70, 85, 100]) {
      expect(scoreLine(s).length).toBeGreaterThan(0);
      expect(checkTone(scoreLine(s))).toHaveLength(0);
    }
  });

  it("scoreLine 경계가 실제 점수 분포와 맞물린다 — 실조합으로 네 구간 전부 도달", () => {
    // 1년치 상대 생일 × 모드 × MBTI(시너지 0/5/미입력)를 쓸어 실제 점수 분포를 만든다.
    const lines = new Set<string>();
    let min = 101;
    let max = -1;
    for (let i = 0; i < 366; i += 2) {
      const birthDate = new Date(Date.UTC(2000, 0, 1 + i)).toISOString().slice(0, 10);
      for (const mode of MATCH_MODES) {
        for (const mbti of ["ISTP", "ENFJ", undefined] as const) {
          const m = computeMatch({ ...me, dayGanzhi: "갑자" }, { birthDate, mbti }, mode);
          lines.add(scoreLine(m.score));
          min = Math.min(min, m.score);
          max = Math.max(max, m.score);
        }
      }
    }
    expect(lines.size).toBe(4); // 죽은 구간 없음 — 네 문구 모두 실제로 나온다
    expect(min).toBeLessThan(65); // 최저 조합(단련·다름·시너지0·충)이 첫 구간에 닿고
    expect(max).toBeGreaterThanOrEqual(90); // 최고 조합(채움·닮음·시너지5)이 끝 구간에 닿는다
  });

  it("bondText — 합·충 전 갈래 문구 존재 + 톤 통과, 없으면 빈 문자열", () => {
    const cases = [
      { stemCombine: true, branchBond: null },
      { stemCombine: true, branchBond: "육합" },
      { stemCombine: false, branchBond: "육합" },
      { stemCombine: false, branchBond: "충" },
    ] as const;
    for (const b of cases) {
      const t = bondText(b);
      expect(t.length).toBeGreaterThan(0);
      expect(checkTone(t)).toHaveLength(0);
    }
    expect(bondText({ stemCombine: false, branchBond: null })).toBe("");
    expect(bondText(null)).toBe("");
  });

  it("내 일주를 알면 간지의 인연이 '기운의 결'에 실린다", () => {
    // 갑자 × 기사(2000-01-12) = 갑기 천간합
    const m = computeMatch(
      { ...me, dayGanzhi: "갑자" }, { birthDate: "2000-01-12" }, "연인",
    );
    const sections = assembleMatch({ match: m, myElement: me.element });
    expect(sections[1].body).toContain("합(合)");
    expect(checkTone(sections[1].body)).toHaveLength(0);
  });
});

describe("심층 궁합 해석 (P7-2)", () => {
  const a = computeProfile({
    birthDate: "1990-03-15", birthTime: "08:30", timeUnknown: false,
    bloodType: "A", mbti: "INFP",
  });
  const b = computeProfile({
    birthDate: "1993-11-02", birthTime: "22:10", timeUnknown: false,
    bloodType: "O", mbti: "ESTJ",
  });

  it("모드 3종 전부 7개 섹션 + 톤 통과, 이름·간지 반영", () => {
    for (const mode of MATCH_MODES) {
      const m = computeDeepMatch(a, b, mode);
      const sections = assembleDeepMatch({
        match: m, myElement: a.dayMaster.element, myName: "새벽", partnerName: "노을",
      });
      expect(sections).toHaveLength(7);
      for (const s of sections) {
        expect(s.body.length).toBeGreaterThan(0);
        expect(checkTone(s.body)).toHaveLength(0);
      }
      expect(sections[0].body).toContain("새벽");
      expect(sections[0].body).toContain("노을");
      expect(sections[1].body).toContain(a.pillars.day);
      expect(sections[1].body).toContain(b.pillars.day);
    }
  });

  it("complementText — 네 갈래 전부 문구 존재 + 톤 통과", () => {
    const cases = [
      { iFillPartner: ["화"], partnerFillsMe: ["수"] },
      { iFillPartner: ["화", "금"], partnerFillsMe: [] },
      { iFillPartner: [], partnerFillsMe: ["토"] },
      { iFillPartner: [], partnerFillsMe: [] },
    ];
    for (const c of cases) {
      const t = complementText(c);
      expect(t.length).toBeGreaterThan(0);
      expect(checkTone(t)).toHaveLength(0);
    }
  });
});
