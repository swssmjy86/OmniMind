import type { ProfileContext } from "@/lib/engine";
import type { DailyContext, DailyRelation } from "@/lib/engine/daily";
import type { InterpretationSection } from "../types";
import { tenGodTheme } from "./ten-gods";

// P6 의사결정 도우미 — 고민 카테고리별 조언 조립(템플릿, 항상 동작). §5.4 문체.

export const CONCERN_CATEGORIES = ["일·커리어", "관계", "선택·결정", "마음"] as const;
export type ConcernCategory = (typeof CONCERN_CATEGORIES)[number];

export const isConcernCategory = (v: string): v is ConcernCategory =>
  (CONCERN_CATEGORIES as readonly string[]).includes(v);

// 첫 공감 — 고민을 꺼낸 마음부터 알아준다.
const OPENER: Record<ConcernCategory, string> = {
  "일·커리어": "일의 갈림길에서 마음이 분주하시군요. 함께 천천히 들여다봐요.",
  관계: "사람 사이의 일로 마음을 많이 쓰고 계시는군요. 그 마음이 참 다정해요.",
  "선택·결정": "쉽게 정하기 어려운 선택 앞에 서 계시는군요. 서두르지 않아도 괜찮아요.",
  마음: "요즘 마음의 결이 잔잔하지 않으시군요. 지금 이대로도 충분하다는 말부터 건네고 싶어요.",
};

// 오늘의 기운이 결정과 맺는 관계 — 의사결정 관점의 힌트.
const RELATION_HINT: Record<DailyRelation, string> = {
  동행: "당신과 결이 같은 기운이 흘러, 평소의 감각을 믿어도 좋은 날이에요.",
  채움: "당신을 북돋아주는 기운이 흘러, 배우고 받아들이며 답을 찾기 좋은 날이에요.",
  발산: "담아둔 것을 꺼내기 좋은 기운이라, 속마음을 표현해보며 실마리를 찾기 좋은 날이에요.",
  결실: "결실의 기운이 함께해, 마음을 정하고 매듭짓기에 어울리는 날이에요.",
  단련: "마음을 다잡게 하는 기운이라, 큰 결정은 하루쯤 미뤄도 괜찮은 날이에요.",
};

// 카테고리별 '함께 생각해볼 방향' — 다그치지 않는 제안형.
const DIRECTION: Record<ConcernCategory, string> = {
  "일·커리어":
    "지금의 자리에서 얻고 있는 것과 잃고 있는 것을 하나씩 적어보면 어때요? 머릿속에만 있던 고민이 눈앞에 놓이면, 마음이 향하는 쪽이 조금 더 선명해질 거예요.",
  관계:
    "상대의 말보다, 그 말을 들었을 때의 내 마음을 먼저 들여다봐요. 서운함 아래에 어떤 바람이 숨어 있었는지 알아차리면, 건네야 할 말도 자연스레 떠오를 거예요.",
  "선택·결정":
    "두 갈래 길을 각각 선택했다고 상상하고, 하루씩 살아본 셈 쳐봐요. 어느 쪽 아침이 더 가볍게 느껴지는지 — 그 몸의 대답이 생각보다 정직하답니다.",
  마음:
    "지금 느끼는 감정에 이름을 붙여봐요. '불안'인지 '아쉬움'인지 '피로'인지 — 이름을 알게 된 마음은 절반쯤 가벼워지곤 해요. 오늘은 해결보다 돌봄이 먼저여도 좋아요.",
};

export interface ConcernInput {
  profile: ProfileContext;
  daily: DailyContext;
  category: ConcernCategory;
  nickname: string;
}

/** 고민 조언 조립 — 공감 → 오늘의 기운 → 타고난 결 → 방향 제안. */
export function assembleConcern(input: ConcernInput): InterpretationSection[] {
  const { profile, daily, category, nickname } = input;
  const talent = tenGodTheme(profile.tenGods).split(".")[0];
  const relationLine = daily.relation
    ? RELATION_HINT[daily.relation]
    : "오늘의 기운을 가만히 느끼며, 마음의 속도에 맞춰 가요.";

  return [
    { title: "마음 읽기", body: `${nickname}님, ${OPENER[category]}` },
    {
      title: "지금의 기운",
      body: `오늘은 ${daily.element}(${daily.dayGanzhi})의 기운이 흐르는 날이에요. ${relationLine}`,
    },
    {
      title: "당신의 결",
      body: `${profile.dayMaster.element}의 기운을 타고난 당신에게는 이런 결이 있어요. ${talent}. 이 힘은 고민 앞에서도 당신 편이에요.`,
    },
    { title: "함께 생각해볼 방향", body: DIRECTION[category] },
  ];
}

/** LLM 개인화 요청 메시지 — 프로필 시스템 프롬프트(§5.4)는 Provider가 붙인다. */
export function concernPrompt(input: ConcernInput, text: string): string {
  const { daily, category } = input;
  const relation = daily.relation ? ` (나와의 관계: ${daily.relation})` : "";
  return [
    `[고민 나누기 · ${category}]`,
    `오늘의 기운: ${daily.element}(${daily.dayGanzhi})${relation}.`,
    `나의 고민: ${text}`,
    "이 고민에 대해, 나의 타고난 결과 오늘의 기운을 담아 3~4문장으로 다정하게 함께 생각해줘요. 정답을 정해주기보다 마음이 향할 방향을 비춰줘요.",
  ].join("\n");
}
