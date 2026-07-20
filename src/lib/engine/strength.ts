import type { TenGod, TenGodChart } from "./ten-gods";

// 일간의 신강/신약과 격국(구조) 패턴 — 순수 계산(계산과 해석의 분리).
// 신강/신약: 억부법(抑扶法) — 일간을 돕는 세력(비겁·인성)과 설극하는 세력(식상·재성·관성)의
// 수를 비교한다. 학파마다 지장간 가중 등 세부 방식이 갈리지만, "돕는 쪽 vs 설극하는 쪽" 비교
// 자체는 억부법의 공통 골격이다. 월지(月支)는 '월령(月令)' — 태어난 계절의 기운 그 자체라
// 2배 가중한다(월간은 가중하지 않는다 — 월령은 지지 하나를 가리키는 말이다).

export type DayMasterStrength = "신강" | "신약" | "중화";

const SUPPORT_GODS: ReadonlySet<TenGod> = new Set(["비견", "겁재", "편인", "정인"]);
const DRAIN_GODS: ReadonlySet<TenGod> = new Set(["식신", "상관", "편재", "정재", "편관", "정관"]);

function chartGods(chart: TenGodChart): TenGod[] {
  return [
    chart.yearStem, chart.monthStem, chart.hourStem,
    chart.yearBranch, chart.monthBranch, chart.dayBranch, chart.hourBranch,
  ].filter((g): g is TenGod => g !== null);
}

/** 일간 자체를 뺀 7자리(시주 미상이면 5자리)로 억부법 신강/신약을 가른다. */
export function dayMasterStrength(chart: TenGodChart): DayMasterStrength {
  const gods = chartGods(chart);
  gods.push(chart.monthBranch); // 월령 가중 — 월지를 한 번 더 센다.

  let support = 0;
  let drain = 0;
  for (const g of gods) {
    if (SUPPORT_GODS.has(g)) support += 1;
    else if (DRAIN_GODS.has(g)) drain += 1;
  }
  if (support > drain) return "신강";
  if (support < drain) return "신약";
  return "중화";
}

function godCounts(chart: TenGodChart): Record<TenGod, number> {
  const counts = {
    비견: 0, 겁재: 0, 식신: 0, 상관: 0, 편재: 0,
    정재: 0, 편관: 0, 정관: 0, 편인: 0, 정인: 0,
  };
  for (const g of chartGods(chart)) counts[g] += 1;
  return counts;
}

export type GyeokPattern = "식신제살" | "상관제살" | "식상생재" | "군비쟁재";

/**
 * 격국(구조) 패턴 — 존재/세력 기반 구조 감지. 오행상생상극 순환 구조상 식상 오행은 항상
 * 관살 오행을 극하고(食傷剋官殺), 식상 오행은 항상 재성 오행을 생한다(食傷生財) — 어느
 * 일간이든 성립하는 고정 관계라 "식신+편관 동시 존재" 같은 존재 기반 판정이 성립한다.
 * 단정("당신은 ○○격이에요")이 아니라 원재료(있음/없음)만 낸다 — 문구는 해석 계층 몫.
 */
export function detectPatterns(chart: TenGodChart): GyeokPattern[] {
  const c = godCounts(chart);
  const patterns: GyeokPattern[] = [];
  if (c.식신 > 0 && c.편관 > 0) patterns.push("식신제살");
  if (c.상관 > 0 && c.편관 > 0) patterns.push("상관제살");
  if (c.식신 + c.상관 > 0 && c.편재 + c.정재 > 0) patterns.push("식상생재");
  if (c.비견 + c.겁재 >= 3 && c.편재 + c.정재 <= 1) patterns.push("군비쟁재");
  return patterns;
}
