import type { FourPillars, ElementIndex } from "./types";
import { ELEMENTS, stemElement, branchElement } from "./constants";

export type ElementName = (typeof ELEMENTS)[number];

export interface ElementDistribution {
  counts: Record<ElementName, number>;
  dominant: ElementName; // 최다 오행
  lacking: ElementName[]; // count 0 인 오행
}

/**
 * 8글자(천간4 + 지지4, 지지는 정기 오행) 단순 집계.
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
  const entries = Object.entries(counts) as [ElementName, number][];
  const dominant = entries.reduce((a, b) => (b[1] > a[1] ? b : a))[0];
  const lacking = entries.filter(([, n]) => n === 0).map(([k]) => k);
  return { counts, dominant, lacking };
}
