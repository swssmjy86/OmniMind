// P4-1 공유 카드 카피 — 유형 조합 티저 카드(§6.2) + 오늘의 나 카드(전체 문구). 개인정보
// (생년월일시)는 절대 담지 않는다. /api/card 쿼리와 1:1 대응.
import type { ProfileContext } from "@/lib/engine";
import { HEAVENLY_STEMS, ELEMENTS, stemElement } from "@/lib/engine/constants";
import type { DayMasterStrength } from "@/lib/engine/strength";
import { isZodiacSign, type ZodiacSign } from "@/lib/engine/zodiac";
import { dominantCategory, type TenGodCategory } from "@/lib/interpret/content/ten-gods";
import type { DailyGuide } from "@/lib/interpret/content/daily";
import type { InterpretationSection } from "@/lib/interpret/types";

const STRENGTHS: readonly DayMasterStrength[] = ["신강", "신약", "중화"];
const isStrength = (v: string): v is DayMasterStrength =>
  (STRENGTHS as readonly string[]).includes(v);

const CATEGORIES: readonly TenGodCategory[] = ["비겁", "식상", "재성", "관성", "인성"];
const isCategory = (v: string): v is TenGodCategory =>
  (CATEGORIES as readonly string[]).includes(v);

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

// 조합 수(일간 10 × 별자리 12 × 신강/신약/중화 3 × 십성 우세갈래 5 = 1,800). 전부 사주 한 장
// 안에서 나오는 결이라, 외부 체계(MBTI 등) 없이도 궁금증 유발용 훅으로 충분하다.
export const COMBO_COUNT = 10 * 12 * 3 * 5;

/** 카드에 실리는 유형 조합. /api/card 쿼리 파라미터와 동일 키. */
export interface CardParams {
  dm: string; // 일간 천간 "갑"
  el: string; // 일간 오행 "목"
  zo: ZodiacSign;
  strength: DayMasterStrength; // 신강/신약/중화
  category: TenGodCategory; // 십성 우세 갈래
}

export interface CardCopy {
  line1: string; // 갑목(甲木)의 신강
  line2: string; // 사자자리 · 재성 우세
  hook: string; // 1,800가지 조합 중 하나의 나
  slogan: string;
  hanja: string; // 甲木 — 카드 장식 심볼
}

export function copyFromParams(p: CardParams): CardCopy {
  const hanja = hanjaOf(p.dm, p.el);
  return {
    line1: `${p.dm}${p.el}(${hanja})의 ${p.strength}`,
    line2: `${p.zo} · ${p.category} 우세`,
    hook: `${COMBO_COUNT.toLocaleString("en-US")}가지 조합 중 하나의 나`,
    slogan: "나보다 나를 더 잘 아는, 옴니마인드",
    hanja,
  };
}

export function cardParams(ctx: ProfileContext): CardParams {
  return {
    dm: ctx.dayMaster.stem,
    el: ctx.dayMaster.element,
    zo: ctx.zodiac,
    strength: ctx.strength,
    category: dominantCategory(ctx.tenGods),
  };
}

export function cardCopy(ctx: ProfileContext): CardCopy {
  return copyFromParams(cardParams(ctx));
}

/** /api/card용 쿼리 문자열. ratio 미지정 = 9:16, "1" = 1:1. */
export function cardQuery(ctx: ProfileContext, ratio?: "916" | "1"): string {
  const p = cardParams(ctx);
  const sp = new URLSearchParams({ dm: p.dm, el: p.el, zo: p.zo, strength: p.strength, category: p.category });
  if (ratio === "1") sp.set("ratio", "1");
  return sp.toString();
}

/** 쿼리 파라미터 검증·파싱. 하나라도 어긋나면 null (dm↔el 오행 일치까지 확인). */
export function parseCardParams(sp: URLSearchParams): CardParams | null {
  const dm = sp.get("dm") ?? "";
  const el = sp.get("el") ?? "";
  const zo = sp.get("zo") ?? "";
  const strength = sp.get("strength") ?? "";
  const category = sp.get("category") ?? "";

  if (!validDmEl(dm, el)) return null;
  if (!isZodiacSign(zo)) return null;
  if (!isStrength(strength)) return null;
  if (!isCategory(category)) return null;

  return { dm, el, zo, strength, category };
}

// ── 오늘의 나 카드 — 데일리 가이드 전체 문구(§P4-보강: 티저가 아니라 그날의 이야기를 담는다) ──

/** 필드별 최대 길이 — 정상 문구 길이보다 넉넉히, 쿼리 남용(과도한 폰트 서브셋 요청) 방지용. */
const DAILY_FIELD_MAX = {
  headline: 120, mind: 160, personal: 220, color: 20, keyword: 20, lucky: 30, sky: 240, zodiac: 120,
  llm: 260,
};

export interface DailyCardParams {
  dm: string; // 일간 천간 — 카드 장식 심볼용
  el: string;
  headline: string;
  mind: string;
  personal: string | null;
  color: string;
  keyword: string;
  lucky: string;
  /** 오늘의 하늘 — 월령·출몰시각·태양고도 3줄을 "\n"으로 이어 담는다(오늘의운세 화면의
   *  하늘 박스와 동일 문구·동일 줄 구성 §동기화 원칙). "\n" 없는 옛 한 줄 값이나 이 필드가
   *  생기기 전에 공유된 카드 링크도 계속 렌더되어야 해 선택으로 둔다. */
  sky: string | null;
  /** 띠(년지) × 오늘 일진 관계 한 줄 — 오늘의운세 화면과 같은 문구. 프로필 네 기둥 있을 때만,
   *  이 필드가 생기기 전 공유 링크도 계속 렌더되어야 해 선택으로 둔다(sky와 동일 패턴). */
  zodiac: string | null;
  /** LLM 개인화 문단("오늘, 당신만을 위한 이야기") — 오늘의운세 화면과 같은 문구. 캐시에
   *  없거나(무료 쿼터 소진 등) 이 필드가 생기기 전 공유 링크는 없을 수 있어 선택으로 둔다. */
  llm: string | null;
}

export interface DailyCardCopy {
  hanja: string;
  headline: string;
  mind: string;
  personal: string | null;
  color: string;
  keyword: string;
  lucky: string;
  sky: string | null;
  zodiac: string | null;
  llm: string | null;
  cta: string;
  slogan: string;
}

export function dailyCardParams(
  ctx: ProfileContext,
  guide: DailyGuide,
  llmParagraph?: string | null,
): DailyCardParams {
  return {
    dm: ctx.dayMaster.stem,
    el: ctx.dayMaster.element,
    headline: guide.headline,
    mind: guide.mind,
    // 궁 캡션(형충회합)은 별도 필드를 늘리지 않고 personal에 이어붙인다 — 카드도 오늘의운세와
    // 같은 개인화 문장을 담아야 하므로(§동기화 원칙).
    personal: [guide.personal, guide.palace].filter(Boolean).join(" ") || null,
    color: guide.color,
    keyword: guide.keyword,
    lucky: guide.lucky,
    sky: [guide.skyLines.moon, guide.skyLines.riseSet, guide.skyLines.altitude].join("\n"),
    zodiac: guide.zodiacSign ? `${guide.zodiacSign.animal}띠인 당신에게 — ${guide.zodiacSign.line}` : null,
    llm: llmParagraph ?? null,
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
    sky: p.sky,
    zodiac: p.zodiac,
    llm: p.llm,
    cta: "오늘의 이야기 더 보기 →",
    slogan: "나보다 나를 더 잘 아는, 옴니마인드",
  };
}

/** /api/card?mode=daily 쿼리 문자열. */
export function dailyCardQuery(ctx: ProfileContext, guide: DailyGuide, llmParagraph?: string | null): string {
  const p = dailyCardParams(ctx, guide, llmParagraph);
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
  if (p.sky) sp.set("sky", p.sky);
  if (p.personal) sp.set("personal", p.personal);
  if (p.zodiac) sp.set("zodiac", p.zodiac);
  if (p.llm) sp.set("llm", p.llm);
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
  // sky·zodiac·llm은 이 필드가 생기기 전에 공유된 링크에는 없을 수 있어 선택 취급(personal과 동일 패턴).
  const sky = sp.get("sky");
  const personal = sp.get("personal");
  const zodiac = sp.get("zodiac");
  const llm = sp.get("llm");

  if (!validDmEl(dm, el)) return null;
  if (!headline || !mind || !color || !keyword || !lucky) return null;
  if (
    headline.length > DAILY_FIELD_MAX.headline ||
    mind.length > DAILY_FIELD_MAX.mind ||
    color.length > DAILY_FIELD_MAX.color ||
    keyword.length > DAILY_FIELD_MAX.keyword ||
    lucky.length > DAILY_FIELD_MAX.lucky ||
    (sky && sky.length > DAILY_FIELD_MAX.sky) ||
    (personal && personal.length > DAILY_FIELD_MAX.personal) ||
    (zodiac && zodiac.length > DAILY_FIELD_MAX.zodiac) ||
    (llm && llm.length > DAILY_FIELD_MAX.llm)
  ) {
    return null;
  }

  return { dm, el, headline, mind, personal, color, keyword, lucky, sky, zodiac, llm };
}

// ── 나의 조각 카드 — "온전한 나" 프로필 전체 섹션(§P4-보강: 조각들을 전부 이미지로) ──

const PROFILE_FIELD_MAX = { nickname: 20, sectionTitle: 20, sectionBody: 260 };
// assembleProfile은 7섹션 고정이지만, P8 로그인 전용 심층 리포트가 최대 7섹션(성격과 취향·
// 당신의 색·지금과 앞으로·연애운·사업운·커리어·관계운·금전운)을 더할 수 있어 여유를 크게 둔다.
const PROFILE_MAX_SECTIONS = 16;

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

/**
 * nickname·sections 길이를 카드 표시 상한에 맞춰 방어적으로 자른다. 호출부(온보딩 등)의
 * 입력 검증이 느슨해지거나 향후 LLM 개인화 섹션이 더 길어져도, 쿼리가 항상
 * parseProfileCardParams를 통과해 공유 카드가 조용히 깨지는 일이 없도록 한다.
 */
export function profileCardParams(
  ctx: ProfileContext,
  nickname: string,
  sections: InterpretationSection[],
): ProfileCardParams {
  return {
    dm: ctx.dayMaster.stem,
    el: ctx.dayMaster.element,
    nickname: nickname.slice(0, PROFILE_FIELD_MAX.nickname),
    sections: sections.slice(0, PROFILE_MAX_SECTIONS).map((s) => ({
      title: s.title.slice(0, PROFILE_FIELD_MAX.sectionTitle),
      body: s.body.slice(0, PROFILE_FIELD_MAX.sectionBody),
    })),
  };
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
