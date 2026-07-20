import type { FourPillars } from "./types";
import { HEAVENLY_STEMS, EARTHLY_BRANCHES, stemYang, sexagenary } from "./constants";
import { adjacentMonthNodes } from "./solar-terms";

// 대운(大運) — 10년 단위 운의 흐름. "생애 주기별 멘탈 가이드"의 핵심 명리 장치.
// 방향: 양년생 남·음년생 여 = 순행, 그 외 = 역행 (양남음녀 순행).
// 대운수: 순행은 다음 절입까지, 역행은 직전 절입부터의 일수 ÷ 3 (3일 = 1년).
// 남는 일수는 버리지 않고 전통 세분화(1일 = 4개월)로 개월까지 낸다(startAgePrecise) —
// startAge(정수, 반올림)는 기존 소비자(브래킷 계산 등) 호환을 위해 그대로 둔다.

export type Gender = "male" | "female";

export interface Daeun {
  direction: "순행" | "역행";
  /** 첫 대운이 시작되는 나이(만 나이 근사, 1~10, days/3의 반올림) */
  startAge: number;
  /** startAge와 같은 값을 년+개월로 더 정밀하게 표현(버림 없이 1일=4개월로 환산) */
  startAgePrecise: { years: number; months: number };
  /** 첫 대운부터 10개(100년)의 간지 흐름 — "갑자" 형식 */
  pillars: string[];
}

const DAY_MS = 86_400_000;

/** 절입까지 남은 일수(days, 3일=1년) → 정밀 나이(년+개월). 나머지 일수는 1일=4개월로 환산. */
function preciseStartAge(days: number): { years: number; months: number } {
  const years = Math.floor(days / 3);
  const remDays = days - years * 3; // [0, 3)
  const monthsRounded = Math.round(remDays * 4); // [0, 12]
  return monthsRounded === 12 ? { years: years + 1, months: 0 } : { years, months: monthsRounded };
}

/** 월주 간지의 60갑자 인덱스. */
function ganzhiIndex(stem: number, branch: number): number {
  for (let i = 0; i < 60; i++) {
    if (i % 10 === stem && i % 12 === branch) return i;
  }
  throw new Error(`유효하지 않은 간지: stem=${stem}, branch=${branch}`);
}

/**
 * 대운 산출 — 순수 함수(현재 시각 미사용).
 * @param birthInstant 출생 절대 instant (시 미상이면 그날 정오 기준 근사 허용)
 */
export function computeDaeun(
  birthInstant: Date,
  fp: FourPillars,
  gender: Gender,
): Daeun {
  const yang = stemYang(fp.year.stem);
  const forward = (yang && gender === "male") || (!yang && gender === "female");

  const { prev, next } = adjacentMonthNodes(birthInstant);
  const days = forward
    ? (next.getTime() - birthInstant.getTime()) / DAY_MS
    : (birthInstant.getTime() - prev.getTime()) / DAY_MS;
  const startAge = Math.min(10, Math.max(1, Math.round(days / 3)));
  const startAgePrecise = preciseStartAge(days);

  const base = ganzhiIndex(fp.month.stem, fp.month.branch);
  const step = forward ? 1 : -1;
  const pillars: string[] = [];
  for (let i = 1; i <= 10; i++) {
    const gz = sexagenary(base + step * i);
    pillars.push(HEAVENLY_STEMS[gz.stem] + EARTHLY_BRANCHES[gz.branch]);
  }

  return { direction: forward ? "순행" : "역행", startAge, startAgePrecise, pillars };
}

export interface CurrentDaeun {
  ganzhi: string;
  fromAge: number; // 이 대운이 시작된 나이
  toAge: number; // 이 대운이 끝나는 나이(포함)
}

/** 나이(만 나이 근사)로 현재 대운을 찾는다. 첫 대운 전이면 null. */
export function currentDaeun(daeun: Daeun, age: number): CurrentDaeun | null {
  if (age < daeun.startAge) return null;
  const idx = Math.min(
    daeun.pillars.length - 1,
    Math.floor((age - daeun.startAge) / 10),
  );
  const fromAge = daeun.startAge + idx * 10;
  return { ganzhi: daeun.pillars[idx], fromAge, toAge: fromAge + 9 };
}
