import type { Pillar, FourPillars } from "./types";
import { sexagenary } from "./constants";
import { resolveMonth } from "./solar-terms";
import { applyDst } from "./dst";
import { toKstParts, kstPartsToInstant, type KstParts } from "./kst";

// ─────────────────────────────────────────────────────────────
// 년주·월주 (절기 기준)
// ─────────────────────────────────────────────────────────────

/** 년주: 입춘 기준 절기해로 60갑자. (solarYear-4) → 1984=갑자 정렬 */
export function yearPillar(instant: Date): Pillar {
  const { solarYear } = resolveMonth(instant);
  const stem = ((solarYear - 4) % 10 + 10) % 10;
  const branch = ((solarYear - 4) % 12 + 12) % 12;
  return { stem, branch };
}

/**
 * 월주: 월지는 절기(12절)로, 월간은 오호둔(五虎遁).
 * 寅월(월지 2) 천간 = (년간*2 + 2) mod 10, 이후 월지 순서(寅→…)대로 +1씩.
 */
export function monthPillar(instant: Date): Pillar {
  const { monthBranch, solarYear } = resolveMonth(instant);
  const yearStem = ((solarYear - 4) % 10 + 10) % 10;
  const yinBaseStem = (yearStem * 2 + 2) % 10; // 寅월 천간
  const offsetFromYin = ((monthBranch - 2) % 12 + 12) % 12; // 寅(2)부터의 순서 거리
  const stem = (yinBaseStem + offsetFromYin) % 10;
  return { stem, branch: monthBranch };
}

// ─────────────────────────────────────────────────────────────
// 일주·시주
// ─────────────────────────────────────────────────────────────

const DAY_BOUNDARY_HOUR = 23; // 결정 노트: 23:00에 일주가 다음날로(야자시)

/** 그레고리력(KST 날짜) → 정오 기준 JDN(정수). Meeus 7장. */
function jdnNoon(y: number, m: number, d: number): number {
  let Y = y;
  let M = m;
  if (M <= 2) { Y -= 1; M += 12; }
  const A = Math.floor(Y / 100);
  const B = 2 - A + Math.floor(A / 4);
  return Math.floor(365.25 * (Y + 4716)) + Math.floor(30.6001 * (M + 1)) + d + B - 1524;
}

// 앵커: 2000-01-07 = 갑자일(60갑자 index 0). 포스텔러/만세력 대조로 확정.
// dayGanzhiIndex = (jdn - ANCHOR_JDN + ANCHOR_GZ) mod 60
const ANCHOR_JDN = jdnNoon(2000, 1, 7);
const ANCHOR_GZ = 0;

/** KST 날짜 컴포넌트로 일주(60갑자). 23시 경계는 호출 전 반영. */
function dayPillarFromParts(y: number, mo: number, d: number): Pillar {
  const jdn = jdnNoon(y, mo, d);
  const idx = (((jdn - ANCHOR_JDN + ANCHOR_GZ) % 60) + 60) % 60;
  return sexagenary(idx);
}

/** 일주. KST 23:00 이후 출생이면 다음날로 넘긴다(야자시). */
export function dayPillar(instant: Date): Pillar {
  const parts = toKstParts(instant);
  let { y, mo, d } = parts;
  if (parts.h >= DAY_BOUNDARY_HOUR) {
    const nx = new Date(Date.UTC(y, mo - 1, d + 1));
    y = nx.getUTCFullYear();
    mo = nx.getUTCMonth() + 1;
    d = nx.getUTCDate();
  }
  return dayPillarFromParts(y, mo, d);
}

/** 시지: 23·0시=자(0), 1·2시=축(1) … 21·22시=해(11) */
export function hourBranchIndex(hour: number): number {
  return Math.floor(((hour + 1) % 24) / 2) % 12;
}

/** 시주: 시간(時干)은 오서둔(五鼠遁). 子시 천간=(일간*2) mod10, 시지 순서대로 +1. */
export function hourPillar(instant: Date): Pillar {
  const day = dayPillar(instant); // 23시 경계 반영된 '그날'의 일간
  const branch = hourBranchIndex(toKstParts(instant).h);
  const ziStem = (day.stem * 2) % 10;
  const stem = (ziStem + branch) % 10;
  return { stem, branch };
}

/**
 * 통합: DST 보정 → 4주 산출. 출생시간 미상이면 hour=null,
 * 일주는 경계(23시)를 피하도록 그날 정오 기준으로 계산.
 */
export function computePillars(
  rawInstant: Date,
  opts: { timeUnknown: boolean },
): FourPillars {
  const instant = applyDst(rawInstant); // 서머타임 구간이면 −1h

  if (opts.timeUnknown) {
    const p = toKstParts(instant);
    const noon: KstParts = { y: p.y, mo: p.mo, d: p.d, h: 12, mi: 0 };
    const noonInstant = kstPartsToInstant(noon);
    return {
      year: yearPillar(noonInstant),
      month: monthPillar(noonInstant),
      day: dayPillar(noonInstant),
      hour: null,
    };
  }
  return {
    year: yearPillar(instant),
    month: monthPillar(instant),
    day: dayPillar(instant),
    hour: hourPillar(instant),
  };
}
