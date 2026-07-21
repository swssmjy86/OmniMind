import type { ProfileContext } from "./index";
import { HEAVENLY_STEMS, stemsCombine } from "./constants";

// 사주 내 네 기둥 천간합 — 궁합(match.ts)이 "두 사람"의 일간끼리 합을 보는 것과 달리, 이건
// "한 사람"의 네 기둥(년·월·일·시) 천간끼리 서로 합을 이루는지를 본다. 계산은 기존
// stemsCombine(갑기·을경·병신·정임·무계)을 그대로 재사용 — 새 규칙 없음.

export type PillarKey = "year" | "month" | "day" | "hour";
const KEYS: readonly PillarKey[] = ["year", "month", "day", "hour"];

export interface StemCombinePair {
  a: PillarKey;
  b: PillarKey;
}

/** 네 기둥 중 천간합을 이루는 쌍 전부(0~복수). 시주 미상(hour=null)이면 그 궁은 제외된다. */
export function stemCombinePairs(pillars: ProfileContext["pillars"]): StemCombinePair[] {
  const stems: Partial<Record<PillarKey, number>> = {};
  for (const key of KEYS) {
    const gz = pillars[key];
    if (!gz) continue;
    const i = HEAVENLY_STEMS.indexOf(gz[0] as (typeof HEAVENLY_STEMS)[number]);
    if (i >= 0) stems[key] = i;
  }

  const pairs: StemCombinePair[] = [];
  for (let i = 0; i < KEYS.length; i++) {
    for (let j = i + 1; j < KEYS.length; j++) {
      const a = KEYS[i];
      const b = KEYS[j];
      const sa = stems[a];
      const sb = stems[b];
      if (sa === undefined || sb === undefined) continue;
      if (stemsCombine(sa, sb)) pairs.push({ a, b });
    }
  }
  return pairs;
}
