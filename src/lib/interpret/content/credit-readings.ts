// 크레딧 풀이 4종 조립(3단계 스펙 §3) — 순수 템플릿, LLM 문단은 액션이 성공 시에만 덧붙인다.
// 구조(해석 축 위계 §3): ①상품별 핵심 결(십성 5갈래 — 팔자 주축) ②오행 ③운의 계절(대운)
// ④보조축(MBTI E/I 수식 + 혈액형 마무리 — 결론을 만들지 않고 앞의 결을 받아 수식만 한다).
import type { ProfileContext } from "@/lib/engine/index";
import type { InterpretationSection } from "../types";
import { dominantCategory, type TenGodCategory } from "./ten-gods";
import { ELEMENT_BALANCE_TEXT } from "./elements";
import { daeunSeasonBody } from "./chongun";
import { strengthText, patternsText } from "./strength";

export type CreditReadingProduct = "career" | "love" | "wealth" | "marriage";
export const CREDIT_READING_PRODUCTS: CreditReadingProduct[] = [
  "career", "love", "wealth", "marriage",
];
export const isCreditReadingProduct = (v: string): v is CreditReadingProduct =>
  (CREDIT_READING_PRODUCTS as string[]).includes(v);

export const LLM_SECTION_TITLE = "당신만을 위한 이야기";

const KEY_TITLE: Record<CreditReadingProduct, string> = {
  career: "일의 결", love: "마음의 결", wealth: "재물의 결", marriage: "함께의 결",
};

const PRODUCT_LABEL: Record<CreditReadingProduct, string> = {
  career: "직업", love: "연애", wealth: "재물", marriage: "결혼",
};

// ① 핵심 결 — 십성 5갈래 × 상품별. 전부 팔자가 주어(§3.2).
const KEY_TEXT: Record<CreditReadingProduct, Record<TenGodCategory, string>> = {
  career: {
    비겁: "일에서 당신은 스스로 판을 이끄는 쪽이 어울려요. 지시받기보다 재량이 주어질 때 힘이 나고, 독립적인 역할에서 결이 살아나죠. 협업에서는 방향을 정하는 자리를 맡아보아요.",
    식상: "당신의 일은 표현과 창작에서 빛나요. 만들고, 쓰고, 보여주는 자리 — 결과물이 눈에 보이는 일에서 유난히 오래 힘이 이어져요.",
    재성: "당신은 성과가 손에 잡히는 일에서 힘이 나요. 숫자·거래·운영처럼 실리를 다루는 자리에서 감각이 살아나고, 기회를 알아보는 눈이 커리어의 무기가 되죠.",
    관성: "당신에게는 맡은 자리를 지켜내는 힘이 커리어의 중심이에요. 체계 안에서 신뢰를 쌓아 올라가는 길 — 책임이 주어질수록 오히려 안정감을 느끼는 결이에요.",
    인성: "당신의 일은 배우고 정리해 전하는 데서 깊어져요. 연구·기획·가르침처럼 앎을 다루는 자리에서 남다른 꾸준함이 드러나죠.",
  },
  love: {
    비겁: "마음을 줄 때도 당신은 대등한 관계를 원해요. 기대기보다 나란히 걷는 사이 — 서로의 영역을 존중해주는 상대와 만날 때 마음이 오래가요.",
    식상: "당신은 마음을 표현으로 건네는 쪽이에요. 말과 몸짓, 작은 선물로 애정이 흐르죠. 표현을 받아주고 되돌려주는 상대에게 마음이 깊어져요.",
    재성: "당신의 애정은 구체적이에요. 마음만큼 행동으로 챙기고, 함께하는 시간을 현실로 만들어가죠. 막연한 약속보다 손에 잡히는 다정함에 끌리는 결이에요.",
    관성: "당신은 관계에 진심과 책임을 다하는 쪽이에요. 가볍게 시작하기보다 믿음이 쌓인 뒤에 깊어지는 결 — 그만큼 한번 이어진 마음은 쉽게 흔들리지 않죠.",
    인성: "당신은 마음을 천천히 받아들이며 깊어지는 쪽이에요. 대화가 통하고 생각의 결이 맞는 상대에게 끌리고, 이해받는다는 느낌에서 사랑을 확인하죠.",
  },
  wealth: {
    비겁: "당신의 재물은 스스로 벌어 스스로 지키는 결이에요. 동업보다 내 몫이 분명한 구조가 마음 편하고, 나눠 쓰는 지출에는 기준을 세워두면 좋아요.",
    식상: "당신의 재물은 재주에서 나와요. 만들어내는 것, 표현하는 것이 수입의 통로가 되는 결 — 재능에 들이는 지출이 곧 저축이 되죠.",
    재성: "당신은 돈의 흐름을 읽는 감각을 타고났어요. 벌 곳과 쓸 곳을 알아보는 눈이 밝아, 관리의 습관만 더해지면 재물이 꾸준히 쌓이는 결이에요.",
    관성: "당신의 재물은 신용에서 자라요. 꾸준한 자리, 안정된 흐름에서 모이는 결 — 급한 수익보다 오래가는 구조가 어울려요.",
    인성: "당신의 재물은 앎이 앞서고 돈이 따라오는 결이에요. 배움과 자격에 들인 시간이 뒤에 큰 흐름으로 돌아오죠. 서두르지 않는 마음이 곧 재테크예요.",
  },
  marriage: {
    비겁: "결혼에서 당신은 각자의 영역이 살아있는 동반자를 원해요. 서로의 삶을 존중하는 두 사람이 나란히 걷는 그림 — 하나로 녹아들기보다 나란히 서는 데서 안정을 찾는 결이에요.",
    식상: "당신의 가정은 표현이 흐르는 곳일 때 따뜻해요. 말하고 웃고 함께 만드는 일상 — 침묵이 길어지는 관계보다 소소한 수다가 이어지는 집이 어울려요.",
    재성: "당신은 가정을 현실로 단단히 꾸리는 쪽이에요. 함께의 삶을 구체적으로 설계하고 챙기는 결 — 생활의 합이 맞는 상대와 오래 편안해요.",
    관성: "당신에게 결혼은 약속의 무게를 함께 지는 일이에요. 신의로 쌓아가는 관계에서 깊은 안정을 느끼는 결 — 서두르지 않고 확신 위에 시작하는 편이 어울려요.",
    인성: "당신의 가정은 서로를 이해하는 대화 위에 서요. 말없이도 통하는 순간을 소중히 여기고, 배우자에게서 배우고 기대는 데서 편안함을 찾는 결이에요.",
  },
};

// ③ 운의 계절 도입 한 줄(상품 맥락) — 대운 본문(daeunSeasonBody) 앞에 붙는다.
const FLOW_INTRO: Record<CreditReadingProduct, string> = {
  career: "일의 흐름도 계절을 타요.",
  love: "인연의 때도 계절처럼 흘러요.",
  wealth: "재물의 물길도 계절을 타요.",
  marriage: "함께의 때도 계절처럼 와요.",
};

// ④ 보조축 — MBTI E/I 수식(상품별). 전부 "이 …" 로 시작해 앞 섹션(팔자)의 결을 받는다.
const AUX_TEXT: Record<CreditReadingProduct, Record<"E" | "I", string>> = {
  career: {
    E: "이 결이 E의 기운을 타면 사람들 앞에서 성과가 드러나는 자리에서 더 크게 자라요.",
    I: "이 결이 I의 기운과 만나면 혼자 몰입하는 시간에서 성과가 깊어져요 — 조용한 집중을 지켜주는 환경을 골라보아요.",
  },
  love: {
    E: "이 마음이 E의 결을 타면 표현이 앞서 나가요 — 속도를 상대에게 맞춰주면 더 오래 흘러요.",
    I: "이 마음이 I의 결 안에 있으면 겉으로 잔잔해 보여요 — 이따금 마음을 소리 내어 건네면 관계가 한결 가까워져요.",
  },
  wealth: {
    E: "이 감각이 E의 추진력과 만나면 벌리는 힘이 커져요 — 매듭짓는 손만 더해주면 돼요.",
    I: "이 감각이 I의 신중함과 만나면 새는 돈이 적어요 — 기회 앞에서 반 박자만 빨라져도 충분해요.",
  },
  marriage: {
    E: "이 결이 E의 기운과 만나면 사람들로 북적이는 따뜻한 집의 그림이에요 — 둘만의 시간도 함께 챙겨보아요.",
    I: "이 결이 I의 기운과 만나면 조용하고 아늑한 가정의 그림이에요 — 서로의 혼자 시간을 존중하는 약속이 힘이 돼요.",
  },
};

// ④ 마무리 절 — 혈액형(공용 4종). 보조축 안에서 한 문장 수식으로만 쓰인다.
const BLOOD_CLOSE: Record<"A" | "B" | "O" | "AB", string> = {
  A: "A형 특유의 섬세함이 그 위에 정성을 한 겹 더해줘요.",
  B: "B형의 자유로운 결이 그 위에 생기를 불어넣어요.",
  O: "O형의 뚝심이 그 흐름을 끝까지 밀어줘요.",
  AB: "AB형의 균형 감각이 그 결을 차분히 다듬어줘요.",
};

// 공통 섹션 제목 — 조립과 엿보기 제목 목록이 같은 상수를 참조해 구조적으로 어긋날 수 없다.
const ELEMENTS_TITLE = "오행이 건네는 조언";
const SEASON_TITLE = "운의 계절";
const AUX_TITLE = "당신에게 드러나는 방식";

/** 엿보기·화면이 쓰는 섹션 제목 목록(잠김 상태에서도 제목은 공개 — P9 §5.1). */
export function readingSectionTitles(product: CreditReadingProduct): string[] {
  return [KEY_TITLE[product], ELEMENTS_TITLE, SEASON_TITLE, AUX_TITLE, LLM_SECTION_TITLE];
}

/** 4종 공통 조립 — ①~④. LLM 문단(⑤)은 액션이 성공 시에만 덧붙인다. */
export function assembleCreditReading(
  product: CreditReadingProduct,
  ctx: ProfileContext,
  nickname: string,
  age: number | null,
): InterpretationSection[] {
  const cat = dominantCategory(ctx.tenGods);
  const structure = [strengthText(ctx.strength), patternsText(ctx.patterns)]
    .filter((t): t is string => t !== null)
    .join(" ");
  return [
    { title: KEY_TITLE[product], body: `${nickname}님, ${KEY_TEXT[product][cat]} ${structure}` },
    { title: ELEMENTS_TITLE, body: ELEMENT_BALANCE_TEXT(ctx.elements) },
    { title: SEASON_TITLE, body: `${FLOW_INTRO[product]} ${daeunSeasonBody(ctx, age)}` },
    {
      title: AUX_TITLE,
      body: `${AUX_TEXT[product][ctx.mbti.axes.EI]} ${BLOOD_CLOSE[ctx.blood.type]}`,
    },
  ];
}

/**
 * 유료 LLM 개인화 요청문 — 템플릿 결론 위에서 길게 풀어쓰기만, 새 단정 금지(§5.4).
 * "각 운을 풍성한 서술형으로" 요청에 맞춰 짧은 조언 한 문단이 아니라, 여러 문단으로 이뤄진
 * 넉넉한 분량(원고지 1페이지 안팎)을 요청한다 — max_tokens는 openrouter-provider.ts의
 * premium 모드에서 함께 늘려뒀다(참고: 무료 티어가 아니라 상담 크레딧을 쓰는 자리).
 */
export function creditReadingPrompt(
  product: CreditReadingProduct,
  ctx: ProfileContext,
  sections: InterpretationSection[],
): string {
  return [
    `[${PRODUCT_LABEL[product]} 풀이 · 유료 개인화 · 긴 서술형]`,
    ...sections.map((s) => `${s.title}: ${s.body}`),
    `위 ${PRODUCT_LABEL[product]} 풀이의 결(십성·오행·신강신약·운의 계절) 위에서, 이 사람만을 위한`,
    `${PRODUCT_LABEL[product]} 이야기를 800~1200자 분량으로 넉넉하게 들려줘요. 3~5개 문단으로 나눠서,`,
    "①지금 이 결이 어떤 모습으로 드러나는지 구체적인 장면처럼 풀어쓰고, ②그 결이 실생활에서",
    "어떻게 나타날 수 있는지 예시를 들어 짚어주고, ③지금·이번 계절에 해볼 만한 구체적인 제안",
    "한두 가지로 마무리해요. 위 문장을 그대로 반복하지 말고, 새로운 단정(예언)을 만들지 말고,",
    "이미 나온 결을 더 깊고 구체적으로 풀어써요. 문단 사이는 빈 줄로 구분해요.",
  ].join("\n");
}

/** 테스트 전용 — 전 카피 톤 검사용 평면 목록. 런타임 사용 금지. */
export const __TEXT_FOR_TEST: string[] = [
  ...Object.values(KEY_TEXT).flatMap((m) => Object.values(m)),
  ...Object.values(AUX_TEXT).flatMap((m) => Object.values(m)),
  ...Object.values(BLOOD_CLOSE),
  ...Object.values(FLOW_INTRO),
  ...Object.values(KEY_TITLE),
];
