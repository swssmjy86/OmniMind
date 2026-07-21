// 사생지(四生地)·사왕지(四旺地)·사고지(四庫地) — 12지지를 절대적 성질 3갈래로 나누는
// 고전 분류. 십이신살(twelve-sinsal.ts)이 일지 기준 "상대적" 위치를 매기는 것과 달리, 이건
// 지지 그 자체가 가진 성질이라 기준점(일지) 없이 항상 같은 값이다 — 서로 다른 정보라 대체
// 관계가 아니다. sarang.ts의 여기/중기/정기 층수 배분(생지·고지=3층, 왕지=2층·午만 3층 예외)도
// 이 3분류를 그대로 따른다.
export type BranchStage = "생지" | "왕지" | "고지";

// 생지(寅申巳亥) — 새로 열고 뻗어가는 자리.
const SAENGJI: ReadonlySet<number> = new Set([2, 5, 8, 11]);
// 왕지(子午卯酉) — 기운이 가장 왕성한 정점의 자리.
const WANGJI: ReadonlySet<number> = new Set([0, 3, 6, 9]);
// 고지(辰戌丑未) — 갈무리하고 다지는 자리. (나머지 전부)

/** 지지 인덱스(0=자…11=해) → 생지/왕지/고지. */
export function branchStageOf(branch: number): BranchStage {
  if (SAENGJI.has(branch)) return "생지";
  if (WANGJI.has(branch)) return "왕지";
  return "고지";
}
