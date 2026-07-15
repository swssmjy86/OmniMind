import { HEAVENLY_STEMS, EARTHLY_BRANCHES, stemYang } from "./constants";

// 12운성 — 일간의 기운이 각 지지에서 갖는 생멸 단계.
// 장생에서 시작해 양(養)으로 끝나는 12단계를, 양간은 순행·음간은 역행으로 돈다.

export const TWELVE_STAGES = [
  "장생", "목욕", "관대", "건록", "제왕", "쇠", "병", "사", "묘", "절", "태", "양",
] as const;
export type TwelveStage = (typeof TWELVE_STAGES)[number];

// 십간의 장생 지지: 갑해 을오 병인 정유 무인 기유 경사 신자 임신 계묘 (화토동법)
const BIRTH_BRANCH: readonly number[] = [11, 6, 2, 9, 2, 9, 5, 0, 8, 3];

/** 일간(천간 인덱스 0~9) × 지지(0~11) → 12운성 인덱스(0=장생 … 11=양). */
export function twelveStageIndex(dayStem: number, branch: number): number {
  const start = BIRTH_BRANCH[dayStem];
  return stemYang(dayStem)
    ? (branch - start + 12) % 12 // 양간 순행
    : (start - branch + 12) % 12; // 음간 역행
}

export function twelveStage(dayStem: number, branch: number): TwelveStage {
  return TWELVE_STAGES[twelveStageIndex(dayStem, branch)];
}

/** 명식표 문자열용 — 일간 글자 × 지지 글자. 사전에 없는 글자는 null. */
export function twelveStageByChar(dayStemCh: string, branchCh: string): TwelveStage | null {
  const s = HEAVENLY_STEMS.indexOf(dayStemCh as (typeof HEAVENLY_STEMS)[number]);
  const b = EARTHLY_BRANCHES.indexOf(branchCh as (typeof EARTHLY_BRANCHES)[number]);
  if (s < 0 || b < 0) return null;
  return twelveStage(s, b);
}
