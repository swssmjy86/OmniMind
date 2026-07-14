import type { ElementIndex, Mbti } from "./types";
import type { ZodiacSign } from "./zodiac";
import { zodiacSign } from "./zodiac";
import { dayPillar } from "./pillars";
import { relateElement, type DailyRelation } from "./daily";
import { HEAVENLY_STEMS, EARTHLY_BRANCHES, ELEMENTS, stemElement } from "./constants";
import { kstStringToInstant } from "./kst";

// P7 궁합 "우리의 조합" — 두 사람의 오행·별자리·MBTI를 잇는 순수 계산.
// 해석(문장)은 interpret/content/match.ts, 이 모듈은 숫자와 관계만 낸다.

export type MatchMode = "연인" | "친구" | "동료";
export const MATCH_MODES = ["연인", "친구", "동료"] as const;

export type ZodiacElement = "불" | "흙" | "바람" | "물";
export type ZodiacHarmony = "닮음" | "어울림" | "다름";

export interface MatchMe {
  element: string; // 내 일간 오행 ("목" 등)
  zodiac: ZodiacSign;
  mbti: Mbti;
}

export interface MatchPartnerInput {
  birthDate: string; // "YYYY-MM-DD"
  mbti?: Mbti; // 모르면 생략
}

export interface MatchContext {
  mode: MatchMode;
  partner: { dayGanzhi: string; element: string; zodiac: ZodiacSign; mbti: Mbti | null };
  /** 내 오행 기준 상대 오행과의 관계 (daily와 같은 의미 체계) */
  elementRelation: DailyRelation;
  zodiacHarmony: ZodiacHarmony;
  /** 0~5. 상대 MBTI 미입력이면 null */
  mbtiSynergy: number | null;
  /** 0~100 — 결정적 산출(같은 입력 → 같은 값) */
  score: number;
}

const ZODIAC_ELEMENT: Record<ZodiacSign, ZodiacElement> = {
  양자리: "불", 사자자리: "불", 사수자리: "불",
  황소자리: "흙", 처녀자리: "흙", 염소자리: "흙",
  쌍둥이자리: "바람", 천칭자리: "바람", 물병자리: "바람",
  게자리: "물", 전갈자리: "물", 물고기자리: "물",
};

export const zodiacElement = (sign: ZodiacSign): ZodiacElement => ZODIAC_ELEMENT[sign];

/** 점성학 관습: 불↔바람, 흙↔물이 서로 살리는 짝. */
export function zodiacHarmony(a: ZodiacSign, b: ZodiacSign): ZodiacHarmony {
  const ea = zodiacElement(a);
  const eb = zodiacElement(b);
  if (ea === eb) return "닮음";
  const pair = new Set([ea, eb]);
  if ((pair.has("불") && pair.has("바람")) || (pair.has("흙") && pair.has("물"))) return "어울림";
  return "다름";
}

/**
 * MBTI 어울림 0~5. 같은 SN(세상을 보는 눈) +2, 같은 TF(판단의 결) +1,
 * 다른 EI(에너지 보완) +1, 다른 JP(리듬 보완) +1.
 */
export function mbtiSynergy(a: Mbti, b: Mbti): number {
  let s = 0;
  if (a[1] === b[1]) s += 2;
  if (a[2] === b[2]) s += 1;
  if (a[0] !== b[0]) s += 1;
  if (a[3] !== b[3]) s += 1;
  return s;
}

/** 상대 생년월일(시 미상) → 일간 오행·일진·별자리. 정오 기준(자시 경계 회피). */
export function partnerFromBirth(birthDate: string): {
  dayGanzhi: string; element: string; elementIndex: ElementIndex; zodiac: ZodiacSign;
} {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(birthDate);
  if (!m) throw new Error(`birthDate 형식 오류: ${birthDate}`);
  const [, , mo, d] = m.map(Number);
  const p = dayPillar(kstStringToInstant(`${birthDate}T12:00`));
  const elementIndex = stemElement(p.stem);
  return {
    dayGanzhi: HEAVENLY_STEMS[p.stem] + EARTHLY_BRANCHES[p.branch],
    element: ELEMENTS[elementIndex],
    elementIndex,
    zodiac: zodiacSign(mo, d),
  };
}

// 관계별 기본 점수 — 어느 관계든 배울 것이 있다는 전제(공포·서열화 금지).
const RELATION_POINTS: Record<DailyRelation, number> = {
  채움: 15, 발산: 12, 동행: 10, 결실: 8, 단련: 5,
};
const HARMONY_POINTS: Record<ZodiacHarmony, number> = { 어울림: 12, 닮음: 10, 다름: 6 };

// 모드별 가중 — 연인은 기운·별, 동료는 성향(일하는 방식)에 무게.
const MODE_WEIGHTS: Record<MatchMode, { element: number; zodiac: number; mbti: number }> = {
  연인: { element: 1.2, zodiac: 1.2, mbti: 0.8 },
  친구: { element: 1.0, zodiac: 1.0, mbti: 1.0 },
  동료: { element: 0.8, zodiac: 0.8, mbti: 1.4 },
};

/** 두 사람의 조합 계산. 순수 함수 — 네트워크·IO·현재 시각 없음. */
export function computeMatch(
  me: MatchMe,
  partnerInput: MatchPartnerInput,
  mode: MatchMode,
): MatchContext {
  const partner = partnerFromBirth(partnerInput.birthDate);
  const mineIdx = ELEMENTS.indexOf(me.element as (typeof ELEMENTS)[number]);
  if (mineIdx < 0) throw new Error(`오행 오류: ${me.element}`);

  const elementRelation = relateElement(mineIdx as ElementIndex, partner.elementIndex);
  const harmony = zodiacHarmony(me.zodiac, partner.zodiac);
  const synergy = partnerInput.mbti ? mbtiSynergy(me.mbti, partnerInput.mbti) : null;

  const w = MODE_WEIGHTS[mode];
  const mbtiPoints = synergy === null ? 10 : synergy * 4; // 미입력이면 중립(10/20)
  const raw =
    50 +
    RELATION_POINTS[elementRelation] * w.element +
    HARMONY_POINTS[harmony] * w.zodiac +
    mbtiPoints * w.mbti;
  const score = Math.max(0, Math.min(100, Math.round(raw)));

  return {
    mode,
    partner: {
      dayGanzhi: partner.dayGanzhi,
      element: partner.element,
      zodiac: partner.zodiac,
      mbti: partnerInput.mbti ?? null,
    },
    elementRelation,
    zodiacHarmony: harmony,
    mbtiSynergy: synergy,
    score,
  };
}
