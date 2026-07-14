export type ZodiacSign =
  | "양자리" | "황소자리" | "쌍둥이자리" | "게자리" | "사자자리" | "처녀자리"
  | "천칭자리" | "전갈자리" | "사수자리" | "염소자리" | "물병자리" | "물고기자리";

// [시작월, 시작일, 별자리] — 해당일 이상이면 그 별자리 시작. 확정 경계표(트로피컬).
const CUTOFFS: [number, number, ZodiacSign][] = [
  [1, 20, "물병자리"], [2, 19, "물고기자리"], [3, 21, "양자리"], [4, 20, "황소자리"],
  [5, 21, "쌍둥이자리"], [6, 22, "게자리"], [7, 23, "사자자리"], [8, 23, "처녀자리"],
  [9, 23, "천칭자리"], [10, 24, "전갈자리"], [11, 23, "사수자리"], [12, 22, "염소자리"],
];

/** 생월·생일 → 별자리 12궁. 12/22~1/19 = 염소자리. */
export function zodiacSign(month: number, day: number): ZodiacSign {
  for (let i = CUTOFFS.length - 1; i >= 0; i--) {
    const [m, d, sign] = CUTOFFS[i];
    if (month > m || (month === m && day >= d)) return sign;
  }
  return "염소자리"; // 1/1~1/19
}
