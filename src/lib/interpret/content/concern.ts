import type { ProfileContext } from "@/lib/engine";
import type { DailyContext, DailyRelation } from "@/lib/engine/daily";
import type { InterpretationSection } from "../types";
import { dominantCategory, tenGodStrength, type TenGodCategory } from "./ten-gods";

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

// '함께 생각해볼 방향' — 카테고리 × 십성 갈래(20종). 같은 고민이라도
// 타고난 힘에 따라 다른 길을 비춘다. 다그치지 않는 제안형(§5.4).
const DIRECTION: Record<ConcernCategory, Record<TenGodCategory, string>> = {
  "일·커리어": {
    비겁: "지금의 자리에서 내 힘으로 세울 수 있는 것이 무엇인지 적어보면 어때요? 스스로 서는 힘이 강한 당신이라, 남의 기준보다 내 기준이 선명해질 때 길이 열리곤 해요.",
    식상: "이 일에서 나를 표현할 자리가 있는지 들여다봐요. 만들어내고 보여주는 기운이 강한 당신에겐, 조건보다 '내 것을 빚어낼 여백'이 더 오래가는 기준이 되어줘요.",
    재성: "얻는 것과 잃는 것을 한번 나란히 적어봐요. 결실의 감각이 밝은 당신이라, 눈앞의 실익을 정리하고 나면 마음이 향하는 쪽이 또렷해질 거예요.",
    관성: "책임의 무게가 기준이 되어줄 거예요. 어느 자리가 당신이 지켜낼 만한 가치가 있는 자리인지 — 그 물음에 마음이 먼저 답하곤 해요.",
    인성: "결정 전에 배움의 크기를 견주어봐요. 받아들이고 쌓아가는 힘이 깊은 당신에겐, 더 자라게 하는 쪽이 결국 더 멀리 데려다줘요.",
  },
  관계: {
    비겁: "상대에게 기대는 일이 서툴러 혼자 삭이고 있진 않았나요? 곧게 선 당신이지만, 마음 한 조각을 먼저 내보이는 것도 용기예요.",
    식상: "마음속 말을 꺼내는 재주가 있는 당신이니, 서운함도 표현으로 풀어봐요. 다만 말의 온도를 한 번 매만져 건네면 더 깊이 닿아요.",
    재성: "사람을 알아보는 눈이 밝은 당신이라, 이미 답을 느끼고 있을지도 몰라요. 이 관계에서 내가 정말 바라는 것이 무엇인지부터 짚어봐요.",
    관성: "관계에서도 책임을 먼저 지려는 당신이죠. 다만 모든 무게를 혼자 들지 않아도 돼요. 절반은 상대의 몫으로 남겨두어요.",
    인성: "곱씹는 힘이 깊은 만큼, 말 한마디를 너무 오래 품고 있진 않았나요? 생각의 절반만 상대에게 들려줘도 마음의 거리가 줄어들 거예요.",
  },
  "선택·결정": {
    비겁: "남의 조언보다 내 발의 감각을 믿어봐요. 두 길을 각각 하루씩 걸어본 셈 치고, 어느 쪽에서 내가 더 나답게 서 있는지 그려봐요.",
    식상: "각 선택지에서 내가 만들어낼 수 있는 것을 상상해봐요. 표현의 기운이 강한 당신에겐, 더 많이 빚어낼 수 있는 쪽이 대개 마음의 답과 가까워요.",
    재성: "두 갈래의 결실을 손에 잡히는 모습으로 그려봐요. 어느 쪽 열매가 더 오래 남을지 — 현실 감각이 밝은 당신의 눈이 이미 알고 있을 거예요.",
    관성: "원칙을 하나 정해두면 결정이 한결 가벼워져요. '내가 지키고 싶은 것'을 첫 줄에 적고, 그 기준에 더 가까운 쪽을 골라봐요.",
    인성: "서두르지 않아도 괜찮아요. 깊이 새기는 당신의 속도대로, 하룻밤 재워둔 생각이 아침에 건네는 답을 들어봐요.",
  },
  마음: {
    비겁: "혼자 버티는 데 익숙한 당신이지만, 오늘은 기대어도 되는 날이에요. 단단한 뿌리는 잠시 쉬어간다고 흔들리지 않아요.",
    식상: "마음속에 고인 것들을 밖으로 꺼내봐요. 글이든 그림이든 흥얼거림이든 — 표현되는 순간, 마음은 절반쯤 가벼워지곤 해요.",
    재성: "애쓰는 마음을 잠시 내려놓고, 오늘 하루 손에 잡히는 작은 기쁨 하나를 챙겨봐요. 따뜻한 밥 한 끼도 충분한 돌봄이에요.",
    관성: "잘 해내야 한다는 무게를 오늘은 조금 내려놓아요. 자리를 지켜온 당신에겐, 쉬어가는 것도 책임의 한 방식이에요.",
    인성: "지금 느끼는 감정에 이름을 붙여봐요. '불안'인지 '아쉬움'인지 '피로'인지 — 이름을 알게 된 마음은 절반쯤 가벼워지곤 해요.",
  },
};

export interface ConcernInput {
  profile: ProfileContext;
  daily: DailyContext;
  category: ConcernCategory;
  nickname: string;
}

/** 고민 조언 조립 — 공감 → 오늘의 기운 → 타고난 힘 → 방향 제안(십성 갈래별). */
export function assembleConcern(input: ConcernInput): InterpretationSection[] {
  const { profile, daily, category, nickname } = input;
  const strength = tenGodStrength(profile.tenGods); // "…힘" 명사구
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
      title: "당신이 지닌 힘",
      body: `${profile.dayMaster.element}의 기운을 타고난 당신에게는 ${strength}이 있어요. 이 힘은 고민 앞에서도 당신 편이에요.`,
    },
    {
      title: "함께 생각해볼 방향",
      body: DIRECTION[category][dominantCategory(profile.tenGods)],
    },
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
