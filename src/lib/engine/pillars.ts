import type { Pillar, FourPillars } from "./types";
import { sexagenary } from "./constants";
import { resolveMonth } from "./solar-terms";
import { toTrueInstant } from "./clock";
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
 * 기록된 출생 벽시계 → 사주를 세울 절대 instant. 사주의 모든 갈래(4주·대운)가 이 한 시각을 쓴다.
 *
 * - 시간을 알면: 역사적 시계 보정(서머타임 −1h, 표준시 오프셋 +30m)만 되돌린다.
 * - 시간 미상이면: 그날 정오를 쓴다. 입력은 00:00으로 들어오는데 그대로 보정하면
 *   −1h가 전날로 밀어 일주가 하루 어긋난다. 정오는 어느 보정에도 같은 날에 머물고,
 *   하루의 중간이라 대운수 근사 오차도 가장 작다.
 */
export function resolveBirthInstant(rawInstant: Date, timeUnknown: boolean): Date {
  if (!timeUnknown) return toTrueInstant(rawInstant);
  const p = toKstParts(rawInstant); // 날짜는 '기록된' 출생일 기준
  const noon: KstParts = { y: p.y, mo: p.mo, d: p.d, h: 12, mi: 0 };
  return toTrueInstant(kstPartsToInstant(noon));
}

/**
 * 통합: 역사적 시계 보정(서머타임·표준시 오프셋) → 4주 산출. 출생시간 미상이면 hour=null.
 */
export function computePillars(
  rawInstant: Date,
  opts: { timeUnknown: boolean },
): FourPillars {
  const instant = resolveBirthInstant(rawInstant, opts.timeUnknown);
  return {
    year: yearPillar(instant),
    month: monthPillar(instant),
    day: dayPillar(instant),
    hour: opts.timeUnknown ? null : hourPillar(instant),
  };
}
