// 년도 하나로 구하는 년간지·띠와, 두 지지의 전통 관계(육합·삼합·충·형·해·파) 판정.
// 순수 산술 — 절기·시각 무관. 띠는 양력 연도 기준이며 입춘 경계는 화면에서 고지한다(설계서 §4).
import { HEAVENLY_STEMS, EARTHLY_BRANCHES } from "./constants";

/** EARTHLY_BRANCHES(자~해)와 같은 인덱스의 띠 동물. */
export const ZODIAC_ANIMALS = [
  "쥐", "소", "호랑이", "토끼", "용", "뱀", "말", "양", "원숭이", "닭", "개", "돼지",
] as const;

export interface YearSign {
  stem: number;   // 년간 인덱스(0=갑)
  branch: number; // 년지 인덱스(0=자)
  ganzhi: string; // "경오"
  animal: string; // "말"
}

/** 서기 년도 → 년간지·띠. 서기 4년=갑자년 앵커 산술(음수 모듈로 안전). */
export function yearSign(year: number): YearSign {
  const stem = (((year - 4) % 10) + 10) % 10;
  const branch = (((year - 4) % 12) + 12) % 12;
  return {
    stem,
    branch,
    ganzhi: HEAVENLY_STEMS[stem] + EARTHLY_BRANCHES[branch],
    animal: ZODIAC_ANIMALS[branch],
  };
}

export type BranchRelation = "육합" | "삼합" | "충" | "형" | "해" | "파";

// 관계 테이블 — 지지 인덱스 쌍(순서 무관). 삼합은 국(局) 단위.
const YUKHAP: [number, number][] = [[0, 1], [2, 11], [3, 10], [4, 9], [5, 8], [6, 7]];
//                                  자축      인해       묘술      진유     사신     오미
const SAMHAP: number[][] = [[8, 0, 4], [11, 3, 7], [2, 6, 10], [5, 9, 1]];
//                          신자진(수)  해묘미(목)   인오술(화)   사유축(금)
const HYEONG_GROUPS: number[][] = [[2, 5, 8], [1, 10, 7]]; // 인사신 · 축술미 (상호형)
const HYEONG_PAIRS: [number, number][] = [[0, 3]]; // 자묘형
const SELF_HYEONG = new Set([4, 6, 9, 11]); // 진·오·유·해 (자형 — 같은 지지끼리)
const HAE: [number, number][] = [[0, 7], [1, 6], [2, 5], [3, 4], [8, 11], [9, 10]];
const PA: [number, number][] = [[0, 9], [1, 4], [2, 11], [3, 6], [5, 8], [10, 7]];

const inPairs = (pairs: [number, number][], a: number, b: number) =>
  pairs.some(([x, y]) => (x === a && y === b) || (x === b && y === a));
const inGroup = (groups: number[][], a: number, b: number) =>
  a !== b && groups.some((g) => g.includes(a) && g.includes(b));

/**
 * 두 지지의 전통 관계. 겹치는 쌍(인-해=육합+파, 사-신=육합+형+파, 인-사=형+해 등)은
 * 설계서 §4의 우선순위 — 충 > 육합 > 삼합 > 형 > 해 > 파 — 로 하나만 돌려준다. 무관계면 null.
 */
export function branchRelation(a: number, b: number): BranchRelation | null {
  if ((a + 6) % 12 === b) return "충";
  if (inPairs(YUKHAP, a, b)) return "육합";
  if (inGroup(SAMHAP, a, b)) return "삼합";
  if (inGroup(HYEONG_GROUPS, a, b) || inPairs(HYEONG_PAIRS, a, b) || (a === b && SELF_HYEONG.has(a)))
    return "형";
  if (inPairs(HAE, a, b)) return "해";
  if (inPairs(PA, a, b)) return "파";
  return null;
}
