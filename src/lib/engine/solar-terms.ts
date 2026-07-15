import { SOLAR_TERMS } from "./solar-terms.data";
import { kstStringToInstant, toKstParts } from "./kst";

export const YEAR_MIN = 1900;
export const YEAR_MAX = 2100;

// SOLAR_TERMS 인덱스: 소한0,대한1,입춘2,우수3,경칩4,춘분5,청명6,곡우7,입하8,소만9,
//   망종10,하지11,소서12,대서13,입추14,처서15,백로16,추분17,한로18,상강19,
//   입동20,소설21,대설22,동지23
// 사주 월지는 12절(節)로 경계가 정해진다.
//   월지: 인2,묘3,진4,사5,오6,미7,신8,유9,술10,해11,자0,축1
const MONTH_NODE_TERMS = [2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 0] as const;
const MONTH_BRANCHES = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 0, 1] as const;

export function assertYearInRange(year: number): void {
  if (year < YEAR_MIN || year > YEAR_MAX)
    throw new RangeError(`지원 연도 범위(${YEAR_MIN}~${YEAR_MAX}) 밖: ${year}`);
}

/** SOLAR_TERMS 순서 인덱스(0~23)의 절입 시각(절대 instant) */
export function termInstant(year: number, orderIndex: number): Date {
  assertYearInRange(year);
  return kstStringToInstant(SOLAR_TERMS[year][orderIndex]);
}

/** 입춘 절입 시각 — 년주 경계 */
export const ipchunInstant = (year: number): Date => termInstant(year, 2);

/**
 * 주어진 instant의 직전·다음 절입(12절) 시각 — 대운수 계산용.
 * 순행 대운수 = 다음 절입까지 일수/3, 역행 = 직전 절입부터 일수/3.
 */
export function adjacentMonthNodes(instant: Date): { prev: Date; next: Date } {
  const kstYear = toKstParts(instant).y;
  const t = instant.getTime();
  const times: number[] = [];
  for (const yy of [kstYear - 1, kstYear, kstYear + 1]) {
    if (yy < YEAR_MIN || yy > YEAR_MAX) continue;
    for (const termIdx of MONTH_NODE_TERMS) times.push(termInstant(yy, termIdx).getTime());
  }
  times.sort((a, b) => a - b);
  let prev = times[0];
  let next = times[times.length - 1];
  for (const at of times) {
    if (at <= t) prev = at;
    if (at > t) { next = at; break; }
  }
  return { prev: new Date(prev), next: new Date(next) };
}

/**
 * 주어진 instant가 속한 사주 '월'의 월지와, 그 월이 귀속되는 절기해(년주 기준 해).
 * monthBranch: 0~11(지지), solarYear: 입춘 기준 조정 연도.
 */
export function resolveMonth(instant: Date): { monthBranch: number; solarYear: number } {
  const kstYear = toKstParts(instant).y;
  const t = instant.getTime();
  const nodes: { at: number; branch: number; solarYear: number }[] = [];
  for (const yy of [kstYear - 1, kstYear, kstYear + 1]) {
    if (yy < YEAR_MIN || yy > YEAR_MAX) continue;
    MONTH_NODE_TERMS.forEach((termIdx, i) => {
      const at = termInstant(yy, termIdx).getTime();
      // 소한(termIdx 0, 축월)은 1월이지만 직전 절기해에 귀속
      const solarYear = termIdx === 0 ? yy - 1 : yy;
      nodes.push({ at, branch: MONTH_BRANCHES[i], solarYear });
    });
  }
  nodes.sort((a, b) => a.at - b.at);
  let chosen = nodes[0];
  for (const n of nodes) if (n.at <= t) chosen = n;
  return { monthBranch: chosen.branch, solarYear: chosen.solarYear };
}
