// 궁합 심층의 화면 계약(3단계 스펙 §5) — 조립은 기존 assembleDeepMatch(P7-2 검증)를 그대로
// 쓰고, 여기는 엿보기 제목 목록과 유료 LLM 프롬프트만 둔다.
import type { MatchMode } from "@/lib/engine/match";
import type { InterpretationSection } from "../types";
import { LLM_SECTION_TITLE } from "./credit-readings";

/** 엿보기용 제목(P9 §5.1 — 잠김 상태에도 제목은 공개). assembleDeepMatch의 실제 제목 순서. */
export function matchDeepSectionTitles(mode: MatchMode): string[] {
  return [
    "우리의 온도", "기운의 흐름", "서로를 채우는 조각", "별이 말하길",
    "마음이 만나는 자리", "혈액형이 말하길", `${mode}로서 함께할 때`, LLM_SECTION_TITLE,
  ];
}

/** 유료 LLM 개인화 요청문 — 두 사람의 결을 이어 다듬기만, 새 단정 금지(§5.4). */
export function matchDeepPrompt(sections: InterpretationSection[]): string {
  return [
    "[궁합 심층 · 유료 개인화]",
    ...sections.map((s) => `${s.title}: ${s.body}`),
    "위 궁합의 결 위에서, 두 사람이 지금 함께 살려볼 수 있는 구체적인 이야기를 3~4문장으로 들려줘요.",
    "위 문장을 반복하지 말고, 새로운 단정을 만들지 말고, 결을 이어서 다듬어줘요.",
  ].join("\n");
}
