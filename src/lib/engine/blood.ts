import type { BloodType } from "./types";

export interface BloodTrait {
  type: BloodType;
  keywords: string[];
}

// 대중적 혈액형 4유형 키워드 — 조합용 키워드. 문체·해석은 P2 템플릿에서.
const KEYWORDS: Record<BloodType, string[]> = {
  A: ["신중", "배려", "섬세"],
  B: ["자유", "몰입", "개성"],
  O: ["대범", "리더십", "활력"],
  AB: ["다면", "이성", "독창"],
};

export function bloodTrait(type: BloodType): BloodTrait {
  return { type, keywords: KEYWORDS[type] };
}

export const isBloodType = (v: string): v is BloodType => v in KEYWORDS;
