// P4-1 공유 카드 카피 — 유형 조합 티저 카드(§6.2) + 오늘의 나 카드(전체 문구). 개인정보
// (생년월일시)는 절대 담지 않는다. /api/card 쿼리와 1:1 대응.
import type { ProfileContext } from "@/lib/engine";
import type { BloodType, Mbti } from "@/lib/engine/types";
import { HEAVENLY_STEMS, ELEMENTS, stemElement } from "@/lib/engine/constants";
import { isMbti } from "@/lib/engine/mbti";
import { isBloodType } from "@/lib/engine/blood";
import { isZodiacSign, type ZodiacSign } from "@/lib/engine/zodiac";
import type { DailyGuide } from "@/lib/interpret/content/daily";
import type { InterpretationSection } from "@/lib/interpret/types";

const STEM_HANJA: Record<string, string> = {
  갑: "甲", 을: "乙", 병: "丙", 정: "丁", 무: "戊", 기: "己", 경: "庚", 신: "辛", 임: "壬", 계: "癸",
};
const ELEMENT_HANJA: Record<string, string> = { 목: "木", 화: "火", 토: "土", 금: "金", 수: "水" };

/** 일간 천간↔오행 일치 검증. 모든 카드 모드의 dm/el 쿼리 파라미터가 공유. */
function validDmEl(dm: string, el: string): boolean {
  const si = (HEAVENLY_STEMS as readonly string[]).indexOf(dm);
  return si >= 0 && ELEMENTS[stemElement(si)] === el;
}

/** 일간 한자 조합("甲木") — 카드 장식 심볼. dm/el 유효성은 호출 전 validDmEl로 확인돼 있어야 한다. */
function hanjaOf(dm: string, el: string): string {
  return `${STEM_HANJA[dm]}${ELEMENT_HANJA[el]}`;
}

// 조합 수(일간 10 × MBTI 16 × 별자리 12 = 1,920). 궁금증 유발용 훅.
export const COMBO_COUNT = 10 * 16 * 12;

/** 카드에 실리는 유형 조합. /api/card 쿼리 파라미터와 동일 키. */
export interface CardParams {
  dm: string; // 일간 천간 "갑"
  el: string; // 일간 오행 "목"
  mbti: Mbti;
  zo: ZodiacSign;
  blood: BloodType | null; // 선택 — 없으면 카드에서 생략
}

export interface CardCopy {
  line1: string; // 갑목(甲木)의 ENFJ
  line2: string; // 사자자리 · O형
  hook: string; // 1,920가지 조합 중 하나의 나
  slogan: string;
  hanja: string; // 甲木 — 카드 장식 심볼
}

export function copyFromParams(p: CardParams): CardCopy {
  const hanja = hanjaOf(p.dm, p.el);
  return {
    line1: `${p.dm}${p.el}(${hanja})의 ${p.mbti}`,
    line2: p.blood ? `${p.zo} · ${p.blood}형` : p.zo,
    hook: `${COMBO_COUNT.toLocaleString("en-US")}가지 조합 중 하나의 나`,
    slogan: "나보다 나를 더 잘 아는, 옴니마인드",
    hanja,
  };
}

export function cardParams(ctx: ProfileContext): CardParams {
  return {
    dm: ctx.dayMaster.stem,
    el: ctx.dayMaster.element,
    mbti: ctx.mbti.type,
    zo: ctx.zodiac,
    blood: ctx.blood.type,
  };
}

export function cardCopy(ctx: ProfileContext): CardCopy {
  return copyFromParams(cardParams(ctx));
}

/** /api/card용 쿼리 문자열. ratio 미지정 = 9:16, "1" = 1:1. */
export function cardQuery(ctx: ProfileContext, ratio?: "916" | "1"): string {
  const p = cardParams(ctx);
  const sp = new URLSearchParams({ dm: p.dm, el: p.el, mbti: p.mbti, zo: p.zo });
  if (p.blood) sp.set("blood", p.blood);
  if (ratio === "1") sp.set("ratio", "1");
  return sp.toString();
}

/** 쿼리 파라미터 검증·파싱. 하나라도 어긋나면 null (dm↔el 오행 일치까지 확인). */
export function parseCardParams(sp: URLSearchParams): CardParams | null {
  const dm = sp.get("dm") ?? "";
  const el = sp.get("el") ?? "";
  const mbti = sp.get("mbti") ?? "";
  const zo = sp.get("zo") ?? "";
  const blood = sp.get("blood");

  if (!validDmEl(dm, el)) return null;
  if (!isMbti(mbti)) return null;
  if (!isZodiacSign(zo)) return null;
  if (blood !== null && !isBloodType(blood)) return null;

  return { dm, el, mbti, zo, blood: blood as BloodType | null };
}

// ── 오늘의 나 카드 — 데일리 가이드 전체 문구(§P4-보강: 티저가 아니라 그날의 이야기를 담는다) ──

/** 필드별 최대 길이 — 정상 문구 길이보다 넉넉히, 쿼리 남용(과도한 폰트 서브셋 요청) 방지용. */
const DAILY_FIELD_MAX = { headline: 120, mind: 160, personal: 220, color: 20, keyword: 20, lucky: 30 };

export interface DailyCardParams {
  dm: string; // 일간 천간 — 카드 장식 심볼용
  el: string;
  headline: string;
  mind: string;
  personal: string | null;
  color: string;
  keyword: string;
  lucky: string;
}

export interface DailyCardCopy {
  hanja: string;
  headline: string;
  mind: string;
  personal: string | null;
  color: string;
  keyword: string;
  lucky: string;
  cta: string;
  slogan: string;
}

export function dailyCardParams(ctx: ProfileContext, guide: DailyGuide): DailyCardParams {
  return {
    dm: ctx.dayMaster.stem,
    el: ctx.dayMaster.element,
    headline: guide.headline,
    mind: guide.mind,
    personal: guide.personal,
    color: guide.color,
    keyword: guide.keyword,
    lucky: guide.lucky,
  };
}

export function dailyCopyFromParams(p: DailyCardParams): DailyCardCopy {
  return {
    hanja: hanjaOf(p.dm, p.el),
    headline: p.headline,
    mind: p.mind,
    personal: p.personal,
    color: p.color,
    keyword: p.keyword,
    lucky: p.lucky,
    cta: "오늘의 이야기 더 보기 →",
    slogan: "나보다 나를 더 잘 아는, 옴니마인드",
  };
}

/** /api/card?mode=daily 쿼리 문자열. */
export function dailyCardQuery(ctx: ProfileContext, guide: DailyGuide): string {
  const p = dailyCardParams(ctx, guide);
  const sp = new URLSearchParams({
    mode: "daily",
    dm: p.dm,
    el: p.el,
    headline: p.headline,
    mind: p.mind,
    color: p.color,
    keyword: p.keyword,
    lucky: p.lucky,
  });
  if (p.personal) sp.set("personal", p.personal);
  return sp.toString();
}

/** 쿼리 파라미터 검증·파싱. 길이 초과·필드 누락·일간↔오행 불일치면 null. */
export function parseDailyCardParams(sp: URLSearchParams): DailyCardParams | null {
  const dm = sp.get("dm") ?? "";
  const el = sp.get("el") ?? "";
  const headline = sp.get("headline") ?? "";
  const mind = sp.get("mind") ?? "";
  const color = sp.get("color") ?? "";
  const keyword = sp.get("keyword") ?? "";
  const lucky = sp.get("lucky") ?? "";
  const personal = sp.get("personal");

  if (!validDmEl(dm, el)) return null;
  if (!headline || !mind || !color || !keyword || !lucky) return null;
  if (
    headline.length > DAILY_FIELD_MAX.headline ||
    mind.length > DAILY_FIELD_MAX.mind ||
    color.length > DAILY_FIELD_MAX.color ||
    keyword.length > DAILY_FIELD_MAX.keyword ||
    lucky.length > DAILY_FIELD_MAX.lucky ||
    (personal && personal.length > DAILY_FIELD_MAX.personal)
  ) {
    return null;
  }

  return { dm, el, headline, mind, personal, color, keyword, lucky };
}

// ── 나의 조각 카드 — "온전한 나" 프로필 전체 섹션(§P4-보강: 조각들을 전부 이미지로) ──

const PROFILE_FIELD_MAX = { nickname: 20, sectionTitle: 20, sectionBody: 260 };
const PROFILE_MAX_SECTIONS = 10; // assembleProfile은 7섹션 고정이지만 LLM 캐시본을 대비해 여유를 둔다.

export interface ProfileCardParams {
  dm: string;
  el: string;
  nickname: string;
  sections: InterpretationSection[];
}

export interface ProfileCardCopy {
  hanja: string;
  nickname: string;
  sections: InterpretationSection[];
  cta: string;
  slogan: string;
}

export function profileCardParams(
  ctx: ProfileContext,
  nickname: string,
  sections: InterpretationSection[],
): ProfileCardParams {
  return { dm: ctx.dayMaster.stem, el: ctx.dayMaster.element, nickname, sections };
}

export function profileCopyFromParams(p: ProfileCardParams): ProfileCardCopy {
  return {
    hanja: hanjaOf(p.dm, p.el),
    nickname: p.nickname,
    sections: p.sections,
    cta: "나의 조각 다시 보기 →",
    slogan: "나보다 나를 더 잘 아는, 옴니마인드",
  };
}

/** /api/card?mode=profile 쿼리 문자열. sections는 JSON으로 직렬화해 담는다. */
export function profileCardQuery(
  ctx: ProfileContext,
  nickname: string,
  sections: InterpretationSection[],
): string {
  const p = profileCardParams(ctx, nickname, sections);
  const sp = new URLSearchParams({
    mode: "profile",
    dm: p.dm,
    el: p.el,
    nickname: p.nickname,
    sections: JSON.stringify(p.sections),
  });
  return sp.toString();
}

function isValidSection(v: unknown): v is InterpretationSection {
  if (typeof v !== "object" || v === null) return false;
  const s = v as Record<string, unknown>;
  return (
    typeof s.title === "string" && typeof s.body === "string" &&
    s.title.length > 0 && s.title.length <= PROFILE_FIELD_MAX.sectionTitle &&
    s.body.length > 0 && s.body.length <= PROFILE_FIELD_MAX.sectionBody
  );
}

/** 쿼리 파라미터 검증·파싱. 길이 초과·형식 오류·일간↔오행 불일치면 null. */
export function parseProfileCardParams(sp: URLSearchParams): ProfileCardParams | null {
  const dm = sp.get("dm") ?? "";
  const el = sp.get("el") ?? "";
  const nickname = sp.get("nickname") ?? "";
  const raw = sp.get("sections") ?? "";

  if (!validDmEl(dm, el)) return null;
  if (!nickname || nickname.length > PROFILE_FIELD_MAX.nickname) return null;
  if (!raw) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!Array.isArray(parsed) || parsed.length === 0 || parsed.length > PROFILE_MAX_SECTIONS) return null;
  if (!parsed.every(isValidSection)) return null;

  return { dm, el, nickname, sections: parsed };
}
