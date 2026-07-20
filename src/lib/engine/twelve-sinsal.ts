import type { FourPillars } from "./types";

// 십이신살(十二神殺) — 삼합(三合) 그룹과 지지의 관계로 결정되는 12갈래 결정론적 분류.
// 인오술(화국)·신자진(수국)·사유축(금국)·해묘미(목국) 네 그룹은 각각 생지(寅申巳亥)를
// "지살"로 놓고 지지 순행(자→축→인…) 순서로 [지살,년살,월살,망신살,장성살,반안살,
// 역마살,육해살,화개살,겁살,재살,천살] 12갈래를 그대로 배정한다 — 이 순환 하나로 4국
// 표 전체(48칸)가 정합적으로 재현됨을 검증했다(twelve-sinsal.test.ts).
//
// 기준 지지는 전통적으로 년지를 썼으나, 현대 명리 실무는 대부분 일지를 기준으로 삼는다
// (계산 규칙 자체는 기준이 어디든 동일 — 기준 지지가 속한 삼합국만 정해지면 나머지는 고정).
export type Sinsal =
  | "겁살" | "재살" | "천살" | "지살" | "년살" | "월살"
  | "망신살" | "장성살" | "반안살" | "역마살" | "육해살" | "화개살";

const ORDER: readonly Sinsal[] = [
  "지살", "년살", "월살", "망신살", "장성살", "반안살",
  "역마살", "육해살", "화개살", "겁살", "재살", "천살",
];

// 지지 인덱스(0=자…11=해) → 그 지지가 속한 삼합국의 생지 인덱스.
// 인오술(화국, 생지 인=2) · 신자진(수국, 생지 신=8) · 사유축(금국, 생지 사=5) · 해묘미(목국, 생지 해=11)
const SAMHAP_START: Record<number, number> = {
  2: 2, 6: 2, 10: 2,
  8: 8, 0: 8, 4: 8,
  5: 5, 9: 5, 1: 5,
  11: 11, 3: 11, 7: 11,
};

/**
 * 기준 지지(refBranch)가 속한 삼합국에서, 대상 지지(targetBranch)가 어느 신살에 해당하는지.
 * 기준 지지는 "어느 국을 쓸지"만 정하고(같은 국 안의 다른 지지를 기준으로 잡아도 결과는 같다),
 * 실제 배정은 그 국의 생지로부터 대상 지지까지의 순행 거리로 결정된다.
 */
export function sinsalOf(refBranch: number, targetBranch: number): Sinsal {
  const start = SAMHAP_START[refBranch];
  const offset = ((targetBranch - start) % 12 + 12) % 12;
  return ORDER[offset];
}

export interface FourPillarSinsal {
  year: Sinsal;
  month: Sinsal;
  day: Sinsal;
  hour: Sinsal | null;
}

/** 일지를 기준으로 네 기둥 각각의 신살을 산출(현대 실무 관례 — 일지 기준). */
export function computeSinsal(fp: FourPillars): FourPillarSinsal {
  const ref = fp.day.branch;
  return {
    year: sinsalOf(ref, fp.year.branch),
    month: sinsalOf(ref, fp.month.branch),
    day: sinsalOf(ref, fp.day.branch),
    hour: fp.hour ? sinsalOf(ref, fp.hour.branch) : null,
  };
}
