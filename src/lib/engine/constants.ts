import type { ElementIndex } from "./types";

export const HEAVENLY_STEMS = ["갑","을","병","정","무","기","경","신","임","계"] as const;
export const EARTHLY_BRANCHES = ["자","축","인","묘","진","사","오","미","신","유","술","해"] as const;
export const ELEMENTS = ["목","화","토","금","수"] as const; // 인덱스 = ElementIndex

// 천간 오행: 갑을木 병정火 무기土 경신金 임계水
const STEM_ELEMENT: readonly ElementIndex[] = [0,0,1,1,2,2,3,3,4,4];
// 지지 오행(정기): 자水 축土 인木 묘木 진土 사火 오火 미土 신金 유金 술土 해水
const BRANCH_ELEMENT: readonly ElementIndex[] = [4,2,0,0,2,1,1,2,3,3,2,4];
// 지지 지장간 정기(대표 천간): 자癸 축己 인甲 묘乙 진戊 사丙 오丁 미己 신庚 유辛 술戊 해壬
const BRANCH_PRIMARY_STEM: readonly number[] = [9,5,0,1,4,2,3,5,6,7,4,8];

/** 양(陽)=true. 천간·지지 모두 짝수 인덱스가 양. (지지는 자인진오신술=양) */
export const isYang = (index: number): boolean => index % 2 === 0;

export const stemElement = (stem: number): ElementIndex => STEM_ELEMENT[stem];
export const stemYang = (stem: number): boolean => isYang(stem);
export const branchElement = (branch: number): ElementIndex => BRANCH_ELEMENT[branch];
export const branchYang = (branch: number): boolean => isYang(branch);
export const branchPrimaryStem = (branch: number): number => BRANCH_PRIMARY_STEM[branch];

/** 60갑자 인덱스(0~59) → {stem, branch}. 갑자=0 */
export const sexagenary = (index: number) => {
  const i = ((index % 60) + 60) % 60;
  return { stem: i % 10, branch: i % 12 };
};

/** 오행 생: e → (e+1)%5, 오행 극: e → (e+2)%5 */
export const generates = (e: ElementIndex): ElementIndex => ((e + 1) % 5) as ElementIndex;
export const controls = (e: ElementIndex): ElementIndex => ((e + 2) % 5) as ElementIndex;
