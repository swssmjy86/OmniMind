import type { DayMasterStrength, GyeokPattern } from "@/lib/engine/strength";

// 신강/신약·격국 패턴을 문장으로 — §5.4 문체(비단정·비명령·공감형). "~구조가 보여요"처럼
// 관찰형으로 끝내 단정하지 않는다.

const STRENGTH_TEXT: Record<DayMasterStrength, string> = {
  신강: "타고난 기운이 넘치는 신강 사주라, 그 힘을 밖으로 뻗어내거나 결실로 바꿔낼 때 삶이 가장 잘 풀려요.",
  신약: "기운을 안으로 다독이며 채워가는 신약 사주라, 무리하게 밀어붙이기보다 곁의 도움을 받아들일 때 결이 살아나요.",
  중화: "기운이 고르게 균형 잡힌 사주라, 어느 한쪽에 치우치지 않고 상황에 맞춰 유연하게 대응하는 결이에요.",
};

export function strengthText(s: DayMasterStrength): string {
  return STRENGTH_TEXT[s];
}

const PATTERN_TEXT: Record<GyeokPattern, string> = {
  식신제살: "어려운 문제를 정면으로 맞서기보다, 자신만의 전문성과 재주로 시원하게 풀어내는 구조가 보여요.",
  상관제살: "날카로운 재기와 표현력으로 까다로운 상황을 돌파해내는 구조가 보여요.",
  식상생재: "쌓은 재주와 표현이 자연스럽게 결실(재물)로 이어지는 구조가 보여요.",
  군비쟁재: "뜻을 함께하는 이들과 자원을 나누게 되는 구조라, 몫을 미리 정해두면 마음이 한결 편해져요.",
};

export function patternText(p: GyeokPattern): string {
  return PATTERN_TEXT[p];
}

/** 감지된 격국 패턴 전부를 한 문단으로. 없으면 null(문장 추가 안 함). */
export function patternsText(patterns: GyeokPattern[]): string | null {
  if (!patterns.length) return null;
  return patterns.map(patternText).join(" ");
}
