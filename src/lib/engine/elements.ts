import type { FourPillars, ElementIndex } from "./types";
import { ELEMENTS, stemElement, branchElement } from "./constants";

export type ElementName = (typeof ELEMENTS)[number];

export interface ElementDistribution {
  counts: Record<ElementName, number>;
  dominant: ElementName; // 최다 오행(월지 득령 가중 반영)
  /**
   * 가중치 최대가 복수인 경우 전부 — 동률이면 '나란히 흐른다'로 서술한다.
   * optional: 이 필드 도입 전에 저장된 profile_context(JSON 캐시)와의 호환.
   */
  coDominant?: ElementName[];
  lacking: ElementName[]; // count 0 인 오행
}

/**
 * 8글자(천간4 + 지지4, 지지는 정기 오행) 집계.
 * counts는 눈에 보이는 개수 그대로(명식표 표시용), dominant 판정에는
 * 월지(月支) 오행에 +1 가중 — 계절의 기운(득령)이 사주의 중심이라는 명리 원칙.
 * (dominantCategory의 월간·월지 2배 가중과 같은 철학 — 내부 일관성)
 * v1은 지장간 가중 없이 정기 1개로만 센다(향후 확장 여지).
 */
export function elementDistribution(fp: FourPillars): ElementDistribution {
  const counts: Record<ElementName, number> = { 목: 0, 화: 0, 토: 0, 금: 0, 수: 0 };
  const add = (e: ElementIndex) => { counts[ELEMENTS[e]] += 1; };
  for (const p of [fp.year, fp.month, fp.day, fp.hour]) {
    if (!p) continue;
    add(stemElement(p.stem));
    add(branchElement(p.branch));
  }

  // 판정용 가중치: 개수 + 월지 득령 가중(+1)
  const weights: Record<ElementName, number> = { ...counts };
  weights[ELEMENTS[branchElement(fp.month.branch)]] += 1;

  const entries = Object.entries(weights) as [ElementName, number][];
  const max = Math.max(...entries.map(([, n]) => n));
  let coDominant = entries.filter(([, n]) => n === max).map(([k]) => k);
  // 동률이면 월지(계절) 오행을 대표로 앞세운다 — "계절의 흐름을 탄다"는 서술의 근거.
  const seasonEl = ELEMENTS[branchElement(fp.month.branch)];
  if (coDominant.includes(seasonEl)) {
    coDominant = [seasonEl, ...coDominant.filter((e) => e !== seasonEl)];
  }
  const dominant = coDominant[0];
  const lacking = (Object.entries(counts) as [ElementName, number][])
    .filter(([, n]) => n === 0)
    .map(([k]) => k);
  return { counts, dominant, coDominant, lacking };
}
