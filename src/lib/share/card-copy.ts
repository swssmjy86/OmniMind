// P4-1 공유 카드 카피 — §6.2 궁금증 유발형. 개인정보(생년월일시)는 절대 담지 않고
// 유형 조합(일간·오행·MBTI·별자리·혈액형)만 다룬다. /api/card 쿼리와 1:1 대응.
import type { ProfileContext } from "@/lib/engine";
import type { BloodType, Mbti } from "@/lib/engine/types";
import { HEAVENLY_STEMS, ELEMENTS, stemElement } from "@/lib/engine/constants";
import { isMbti } from "@/lib/engine/mbti";
import { isBloodType } from "@/lib/engine/blood";
import { isZodiacSign, type ZodiacSign } from "@/lib/engine/zodiac";

const STEM_HANJA: Record<string, string> = {
  갑: "甲", 을: "乙", 병: "丙", 정: "丁", 무: "戊", 기: "己", 경: "庚", 신: "辛", 임: "壬", 계: "癸",
};
const ELEMENT_HANJA: Record<string, string> = { 목: "木", 화: "火", 토: "土", 금: "金", 수: "水" };

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
  const dm = `${p.dm}${p.el}(${STEM_HANJA[p.dm]}${ELEMENT_HANJA[p.el]})`;
  return {
    line1: `${dm}의 ${p.mbti}`,
    line2: p.blood ? `${p.zo} · ${p.blood}형` : p.zo,
    hook: `${COMBO_COUNT.toLocaleString("en-US")}가지 조합 중 하나의 나`,
    slogan: "나보다 나를 더 잘 아는, 옴니마인드",
    hanja: `${STEM_HANJA[p.dm]}${ELEMENT_HANJA[p.el]}`,
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

  const si = (HEAVENLY_STEMS as readonly string[]).indexOf(dm);
  if (si < 0) return null;
  if (ELEMENTS[stemElement(si)] !== el) return null;
  if (!isMbti(mbti)) return null;
  if (!isZodiacSign(zo)) return null;
  if (blood !== null && !isBloodType(blood)) return null;

  return { dm, el, mbti, zo, blood: blood as BloodType | null };
}
