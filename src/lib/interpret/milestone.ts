// 동행일 마일스톤 — 압박이 아닌 애착. 설계서 §6.1.
export interface Milestone {
  days: number;
  label: string;
  emoji: string;
}

// 낮은 것부터 정렬 유지.
export const MILESTONES: Milestone[] = [
  { days: 7, label: "새싹", emoji: "🌱" },
  { days: 30, label: "잎", emoji: "🌿" },
  { days: 100, label: "나무", emoji: "🌳" },
  { days: 365, label: "숲", emoji: "🌲" },
];

/** 현재까지 도달한 가장 높은 마일스톤(없으면 null). 배지 표시용. */
export function currentMilestone(companionDays: number): Milestone | null {
  let reached: Milestone | null = null;
  for (const m of MILESTONES) {
    if (companionDays >= m.days) reached = m;
  }
  return reached;
}

/** 오늘이 정확히 마일스톤 당일인지(특별 축하용). */
export function isMilestoneToday(companionDays: number): Milestone | null {
  return MILESTONES.find((m) => m.days === companionDays) ?? null;
}
