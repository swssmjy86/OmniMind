import type { MbtiTrait } from "@/lib/engine/mbti";

// MBTI 4축을 조합해 성향 문장을 만든다. 유형 낙인이 아니라 '결'로 서술.
const EI = { E: "사람들 곁에서 생기를 얻는", I: "혼자만의 시간에 마음이 채워지는" };
const SN = { S: "지금 여기의 현실을 살피는", N: "보이지 않는 가능성을 그리는" };
const TF = { T: "이치로 곰곰이 따져보고", F: "마음으로 먼저 헤아리고" };
const JP = { J: "계획으로 하루를 정돈하는", P: "흐름에 유연하게 몸을 맡기는" };

export function MBTI_AXIS_TEXT(mbti: MbtiTrait): string {
  const { EI: ei, SN: sn, TF: tf, JP: jp } = mbti.axes;
  return `${EI[ei]}, ${SN[sn]} 편이에요. ${TF[tf]} ${JP[jp]} 모습도 함께 지녔고요.`;
}
