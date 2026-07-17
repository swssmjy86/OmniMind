import type { BloodType, ElementIndex, Mbti } from "./types";
import type { ProfileContext } from "./index";
import type { ZodiacSign } from "./zodiac";
import { zodiacSign } from "./zodiac";
import { dayPillar, resolveBirthInstant } from "./pillars";
import { relateElement, type DailyRelation } from "./daily";
import {
  HEAVENLY_STEMS, EARTHLY_BRANCHES, ELEMENTS, stemElement,
  stemsCombine, branchesSixCombine, branchesClash,
} from "./constants";
import { kstStringToInstant } from "./kst";

// P7 궁합 "우리의 조합" — 두 사람의 오행·별자리·MBTI를 잇는 순수 계산.
// 해석(문장)은 interpret/content/match.ts, 이 모듈은 숫자와 관계만 낸다.

export type MatchMode = "연인" | "친구" | "동료";
export const MATCH_MODES = ["연인", "친구", "동료"] as const;

// DB·URL에는 ASCII 슬러그로 저장한다(ref.ts TOKEN 규칙과 동일한 이유).
export type MatchModeSlug = "lover" | "friend" | "coworker";
export const MODE_TO_SLUG: Record<MatchMode, MatchModeSlug> = {
  연인: "lover", 친구: "friend", 동료: "coworker",
};
export const SLUG_TO_MODE: Record<MatchModeSlug, MatchMode> = {
  lover: "연인", friend: "친구", coworker: "동료",
};
export const isMatchModeSlug = (v: string): v is MatchModeSlug => v in SLUG_TO_MODE;

export type ZodiacElement = "불" | "흙" | "바람" | "물";
export type ZodiacHarmony = "닮음" | "어울림" | "다름";

export interface MatchMe {
  element: string; // 내 일간 오행 ("목" 등)
  zodiac: ZodiacSign;
  mbti: Mbti;
  /** 내 일주 간지 "갑자" — 있으면 천간합·일지 합충(간지의 인연)까지 계산 */
  dayGanzhi?: string;
  /** 내 혈액형 — 상대 혈액형과 함께 있을 때만 혈액형 어울림을 계산 */
  bloodType?: BloodType;
}

export interface MatchPartnerInput {
  birthDate: string; // "YYYY-MM-DD"
  /** "HH:MM" — 알면 야자시(23시 경계)까지 정확한 일주로 계산 */
  birthTime?: string | null;
  mbti?: Mbti; // 모르면 생략
  bloodType?: BloodType | null; // 모르면 생략
}

/** 두 사람의 일주(간지)가 맺는 인연 — 명리 궁합의 핵심 축. */
export interface MatchBond {
  stemCombine: boolean; // 일간 천간합(갑기·을경·병신·정임·무계)
  branchBond: "육합" | "충" | null; // 일지 육합/충
}

export interface MatchContext {
  mode: MatchMode;
  partner: {
    dayGanzhi: string;
    element: string;
    zodiac: ZodiacSign;
    mbti: Mbti | null;
    bloodType: BloodType | null;
  };
  /** 내 오행 기준 상대 오행과의 관계 (daily와 같은 의미 체계) */
  elementRelation: DailyRelation;
  zodiacHarmony: ZodiacHarmony;
  /** 0~5. 상대 MBTI 미입력이면 null */
  mbtiSynergy: number | null;
  /** 0~2. 어느 한쪽 혈액형이라도 모르면 null */
  bloodSynergy: number | null;
  /** 간지의 인연. 내 일주 미제공이면 null */
  bond: MatchBond | null;
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

/**
 * 상대 생년월일(+선택적 출생 시간) → 일간 오행·일진·별자리.
 * 시간을 알면 역사적 시계 보정(서머타임·표준시)과 야자시 경계까지 그대로 반영하고,
 * 모르면 정오 기준(자시 경계 회피)으로 읽는다 — computeProfile의 일주와 같은 규칙.
 */
export function partnerFromBirth(birthDate: string, birthTime?: string | null): {
  dayGanzhi: string; element: string; elementIndex: ElementIndex; zodiac: ZodiacSign;
} {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(birthDate);
  if (!m) throw new Error(`birthDate 형식 오류: ${birthDate}`);
  const [, , mo, d] = m.map(Number);
  if (birthTime != null) {
    const t = /^(\d{2}):(\d{2})$/.exec(birthTime);
    if (!t || Number(t[1]) > 23 || Number(t[2]) > 59)
      throw new Error(`birthTime 형식 오류: ${birthTime}`);
  }
  const raw = kstStringToInstant(`${birthDate}T${birthTime ?? "12:00"}`);
  const p = dayPillar(resolveBirthInstant(raw, birthTime == null));
  const elementIndex = stemElement(p.stem);
  return {
    dayGanzhi: HEAVENLY_STEMS[p.stem] + EARTHLY_BRANCHES[p.branch],
    element: ELEMENTS[elementIndex],
    elementIndex,
    zodiac: zodiacSign(mo, d),
  };
}

/**
 * 혈액형 어울림 0~2 — 대중적 혈액형 궁합 관습의 재미 요소(통계적 근거 아님).
 * 2: 서로를 채우는 보완의 짝(A×O, B×AB), 1: 익숙하고 무난한 결, 0: 결이 다른 짝(A×B, O×AB).
 * 대칭 함수 — 커플 온도의 대칭성 불변식을 지킨다.
 */
export function bloodSynergy(a: BloodType, b: BloodType): number {
  if (a === b) return 1;
  const pair = new Set([a, b]);
  const has = (x: BloodType, y: BloodType) => pair.has(x) && pair.has(y);
  if (has("A", "O") || has("B", "AB")) return 2;
  if (has("A", "B") || has("O", "AB")) return 0;
  return 1; // A×AB, B×O — 익숙함과 새로움이 섞인 무난한 결
}

// 관계별 기본 점수 — 어느 관계든 배울 것이 있다는 전제(공포·서열화 금지).
// 생(채움/발산)·극(결실/단련)은 같은 짝의 두 방향이므로 반드시 같은 점수여야 한다.
// (누가 계산하든 같은 커플은 같은 온도 — 대칭성 불변식, match.test.ts에서 검증)
const RELATION_POINTS: Record<DailyRelation, number> = {
  채움: 13, 발산: 13, 동행: 10, 결실: 7, 단련: 7,
};
// 점성 관행: 같은 원소(트라인)가 가장 조화롭고, 상생 짝(섹스타일)이 그다음.
const HARMONY_POINTS: Record<ZodiacHarmony, number> = { 닮음: 12, 어울림: 10, 다름: 6 };

/** 두 일주 간지("갑자")의 인연 — 천간합·일지 육합/충. 대칭 함수. */
export function computeBond(aGanzhi: string, bGanzhi: string): MatchBond | null {
  const as = HEAVENLY_STEMS.indexOf(aGanzhi[0] as (typeof HEAVENLY_STEMS)[number]);
  const bs = HEAVENLY_STEMS.indexOf(bGanzhi[0] as (typeof HEAVENLY_STEMS)[number]);
  const ab = EARTHLY_BRANCHES.indexOf(aGanzhi[1] as (typeof EARTHLY_BRANCHES)[number]);
  const bb = EARTHLY_BRANCHES.indexOf(bGanzhi[1] as (typeof EARTHLY_BRANCHES)[number]);
  if (as < 0 || bs < 0 || ab < 0 || bb < 0) return null;
  return {
    stemCombine: stemsCombine(as, bs),
    branchBond: branchesSixCombine(ab, bb) ? "육합" : branchesClash(ab, bb) ? "충" : null,
  };
}

// 혈액형 어울림 점수 — 작은 재미 축이라 가중 없이 0~6, 미입력이면 중간(3).
const bloodPoints = (synergy: number | null): number =>
  synergy === null ? 3 : synergy * 3;

// 간지 인연 점수 — 합은 끌어당김(+), 충은 벼려주는 자리(−, 공포 아닌 낙차만).
const bondPoints = (bond: MatchBond | null): number =>
  bond
    ? (bond.stemCombine ? 8 : 0) +
      (bond.branchBond === "육합" ? 6 : bond.branchBond === "충" ? -6 : 0)
    : 0;

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
  const partner = partnerFromBirth(partnerInput.birthDate, partnerInput.birthTime);
  const mineIdx = ELEMENTS.indexOf(me.element as (typeof ELEMENTS)[number]);
  if (mineIdx < 0) throw new Error(`오행 오류: ${me.element}`);

  const elementRelation = relateElement(mineIdx as ElementIndex, partner.elementIndex);
  const harmony = zodiacHarmony(me.zodiac, partner.zodiac);
  const synergy = partnerInput.mbti ? mbtiSynergy(me.mbti, partnerInput.mbti) : null;
  const blood =
    me.bloodType && partnerInput.bloodType
      ? bloodSynergy(me.bloodType, partnerInput.bloodType)
      : null;
  const bond = me.dayGanzhi ? computeBond(me.dayGanzhi, partner.dayGanzhi) : null;

  const w = MODE_WEIGHTS[mode];
  const mbtiPoints = synergy === null ? 10 : synergy * 4; // 미입력이면 중립(10/20)
  const raw =
    50 +
    RELATION_POINTS[elementRelation] * w.element +
    HARMONY_POINTS[harmony] * w.zodiac +
    mbtiPoints * w.mbti +
    bloodPoints(blood) +
    bondPoints(bond);
  const score = Math.max(0, Math.min(100, Math.round(raw)));

  return {
    mode,
    partner: {
      dayGanzhi: partner.dayGanzhi,
      element: partner.element,
      zodiac: partner.zodiac,
      mbti: partnerInput.mbti ?? null,
      bloodType: partnerInput.bloodType ?? null,
    },
    elementRelation,
    zodiacHarmony: harmony,
    mbtiSynergy: synergy,
    bloodSynergy: blood,
    bond,
    score,
  };
}

// ── 심층 궁합 (P7-2) — 두 사람의 프로필 전체(사주 8글자)로 계산 ──

export interface DeepMatchContext extends MatchContext {
  /** 서로의 부족한 오행을 채워주는지 — 초대 연결의 보상이 되는 핵심 정보 */
  complement: {
    iFillPartner: string[]; // 상대에게 없는 오행 중 내가 지닌 것
    partnerFillsMe: string[]; // 내게 없는 오행 중 상대가 지닌 것
  };
  myDayGanzhi: string; // 내 일진(심층 뷰에서 양쪽 다 보여준다)
}

/** a(나)의 오행 분포가 b의 부족(lacking)을 채우는 오행 목록. */
export function fillingElements(
  a: { counts: Record<string, number> },
  bLacking: readonly string[],
): string[] {
  return bLacking.filter((e) => (a.counts[e] ?? 0) > 0);
}

/**
 * 양방향 심층 궁합 — 두 ProfileContext(사주 전체)로 계산.
 * 입력형(computeMatch)과 같은 점수 체계에, 오행 상호 보완 보너스를 더한다.
 */
export function computeDeepMatch(
  me: ProfileContext,
  partner: ProfileContext,
  mode: MatchMode,
): DeepMatchContext {
  const mineIdx = ELEMENTS.indexOf(me.dayMaster.element as (typeof ELEMENTS)[number]);
  const partnerIdx = ELEMENTS.indexOf(partner.dayMaster.element as (typeof ELEMENTS)[number]);
  if (mineIdx < 0 || partnerIdx < 0)
    throw new Error(`오행 오류: ${me.dayMaster.element}/${partner.dayMaster.element}`);

  const elementRelation = relateElement(mineIdx as ElementIndex, partnerIdx as ElementIndex);
  const harmony = zodiacHarmony(me.zodiac, partner.zodiac);
  const synergy = mbtiSynergy(me.mbti.type, partner.mbti.type);
  const blood = bloodSynergy(me.blood.type, partner.blood.type); // 프로필엔 혈액형이 항상 있다
  const bond = computeBond(me.pillars.day, partner.pillars.day);

  const iFillPartner = fillingElements(me.elements, partner.elements.lacking);
  const partnerFillsMe = fillingElements(partner.elements, me.elements.lacking);
  // 서로 채우는 오행 하나당 +4, 최대 +12 — 보완이 심층 궁합의 보상이 된다.
  const complementBonus = Math.min(12, (iFillPartner.length + partnerFillsMe.length) * 4);

  const w = MODE_WEIGHTS[mode];
  const raw =
    50 +
    RELATION_POINTS[elementRelation] * w.element +
    HARMONY_POINTS[harmony] * w.zodiac +
    synergy * 4 * w.mbti +
    bloodPoints(blood) +
    bondPoints(bond) +
    complementBonus;
  const score = Math.max(0, Math.min(100, Math.round(raw)));

  return {
    mode,
    partner: {
      dayGanzhi: partner.pillars.day,
      element: partner.dayMaster.element,
      zodiac: partner.zodiac,
      mbti: partner.mbti.type,
      bloodType: partner.blood.type,
    },
    elementRelation,
    zodiacHarmony: harmony,
    mbtiSynergy: synergy,
    bloodSynergy: blood,
    bond,
    score,
    complement: { iFillPartner, partnerFillsMe },
    myDayGanzhi: me.pillars.day,
  };
}
