import type { Mbti } from "./types";

export interface MbtiTrait {
  type: Mbti;
  axes: { EI: "E" | "I"; SN: "S" | "N"; TF: "T" | "F"; JP: "J" | "P" };
  keywords: string[]; // 템플릿 조합용 키워드(문장 아님)
}

const AXES = (t: Mbti): MbtiTrait["axes"] => ({
  EI: t[0] as "E" | "I",
  SN: t[1] as "S" | "N",
  TF: t[2] as "T" | "F",
  JP: t[3] as "J" | "P",
});

// 16유형 키워드 — 문장이 아닌 조합용 키워드. 문체·해석은 P2 템플릿에서.
const KEYWORDS: Record<Mbti, string[]> = {
  INTJ: ["전략", "통찰", "독립"],
  INTP: ["탐구", "논리", "가능성"],
  ENTJ: ["추진", "결단", "비전"],
  ENTP: ["기지", "도전", "아이디어"],
  INFJ: ["신념", "공감", "이상"],
  INFP: ["내면", "이상", "섬세함"],
  ENFJ: ["따뜻한 주도", "공감", "이끔"],
  ENFP: ["열정", "영감", "자유"],
  ISTJ: ["성실", "책임", "질서"],
  ISFJ: ["헌신", "배려", "안정"],
  ESTJ: ["실행", "체계", "리더십"],
  ESFJ: ["조화", "친절", "협력"],
  ISTP: ["실용", "냉정", "손재주"],
  ISFP: ["감성", "온화", "예술"],
  ESTP: ["활력", "현실감각", "모험"],
  ESFP: ["생동", "친화", "즐거움"],
};

export function mbtiTrait(type: Mbti): MbtiTrait {
  return { type, axes: AXES(type), keywords: KEYWORDS[type] };
}

export const isMbti = (v: string): v is Mbti => v in KEYWORDS;
