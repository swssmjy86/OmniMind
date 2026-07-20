// 궁합 심층의 화면 계약(3단계 스펙 §5) — 조립은 기존 assembleDeepMatch(P7-2 검증)를 그대로
// 쓰고, 여기는 엿보기 제목 목록과 유료 LLM 프롬프트만 둔다.
import type { MatchMode } from "@/lib/engine/match";
import type { InterpretationSection } from "../types";
import { LLM_SECTION_TITLE } from "./credit-readings";

/** 엿보기용 제목(P9 §5.1 — 잠김 상태에도 제목은 공개). assembleDeepMatch의 실제 제목 순서. */
export function matchDeepSectionTitles(mode: MatchMode): string[] {
  return [
    "우리의 온도", "기운의 흐름", "서로를 채우는 조각", "인연의 매듭",
    "별이 말하길", `${mode}로서 함께할 때`, LLM_SECTION_TITLE,
  ];
}

/**
 * LLM 개인화 요청문 — 두 사람의 결을 이어 길게 풀어쓰기만, 새 단정 금지(§5.4). 길이는
 * credit-readings.ts의 creditReadingPrompt와 같은 근거(무료 모델 실측 안전 상한)로 잡았다.
 */
export function matchDeepPrompt(sections: InterpretationSection[]): string {
  return [
    "[궁합 심층 · 개인화 · 긴 서술형]",
    ...sections.map((s) => `${s.title}: ${s.body}`),
    "위 궁합의 결(오행 관계·별자리·간지의 인연·오행 보완) 위에서, 두 사람만을 위한 궁합 이야기를",
    "500~700자 분량으로 넉넉하게 들려줘요. 2~3개 문단으로 나눠서, ①두 사람의 결이 지금 어떤",
    "모습으로 만나는지 구체적인 장면처럼 풀어쓰고, ②그 결이 함께하는 일상에서 어떻게 드러날",
    "수 있는지 예시를 들어 짚어주고, ③지금 두 사람이 함께 해볼 만한 구체적인 제안 한 가지로",
    "마무리해요. 위 문장을 그대로 반복하지 말고, 새로운 단정을 만들지 말고, 결을 이어서",
    "더 깊고 구체적으로 풀어써요. 문단 사이는 빈 줄로 구분해요.",
  ].join("\n");
}
