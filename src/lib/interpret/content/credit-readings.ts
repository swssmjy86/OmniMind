// 크레딧 풀이 4종 조립(3단계 스펙 §3) — 순수 템플릿, LLM 문단은 액션이 성공 시에만 덧붙인다.
// 구조(해석 축 위계 §3): ①상품별 핵심 결(십성 5갈래 — 팔자 주축) ②오행 ③운의 계절(대운)
// ④보조축(신강/신약 수식 + 강한 오행 마무리 — 결론을 만들지 않고 앞의 결을 받아 수식만 한다.
// 전부 사주 한 장 안에서 나오는 결이라 외부 체계 없이도 성립한다).
//
// 페르소나 전면 몰입(2026-07-23, persona-plan.md 7인 체제): 상품별 본문이 담당 페르소나의
// 말투·결로 쓰인다 — career=벼리(짧고 단단한 요체), love=홍연(다정한 반말), wealth=금오
// (호쾌한 하오체), marriage=온새(포근한 지요체). 공용 문구(신강약·오행·대운)는 Voice 갈래로
// 어미만 맞추고, 캐릭터의 결(비유·리듬)은 이 파일의 상품별 문구가 담는다.
import type { ProfileContext } from "@/lib/engine/index";
import type { InterpretationSection } from "../types";
import type { DayMasterStrength } from "@/lib/engine/strength";
import type { Voice } from "@/lib/persona/personas";
import { PERSONAS } from "@/lib/persona/personas";
import { PRODUCT_PERSONA } from "@/lib/persona/products";
import { dominantCategory, type TenGodCategory } from "./ten-gods";
import { ELEMENT_BALANCE_TEXT } from "./elements";
import { daeunSeasonBody } from "./chongun";
import { strengthText, patternsText } from "./strength";
import { traitsText, type Traits } from "./traits";

export type CreditReadingProduct = "career" | "love" | "wealth" | "marriage";
export const CREDIT_READING_PRODUCTS: CreditReadingProduct[] = [
  "career", "love", "wealth", "marriage",
];
export const isCreditReadingProduct = (v: string): v is CreditReadingProduct =>
  (CREDIT_READING_PRODUCTS as string[]).includes(v);

// LLM 문단(⑤) 제목 — 호칭이 담긴 제목이라 말투를 따른다(AUX_TITLE과 같은 이유).
const LLM_TITLE: Record<Voice, string> = {
  yo: "당신만을 위한 이야기",
  banmal: "너만을 위한 이야기",
  hao: "그대만을 위한 이야기",
  jiyo: "당신만을 위한 이야기",
};

/** 말투 무관 기본 제목(요체) — 궁합(연리·요체) 등 크레딧 4종 밖 호출부용. */
export const LLM_SECTION_TITLE = LLM_TITLE.yo;

/** 상품 → 담당 페르소나의 어미 갈래. PRODUCT_PERSONA(파생)를 다시 옮겨 적지 않는다. */
const PRODUCT_VOICE = Object.fromEntries(
  CREDIT_READING_PRODUCTS.map((p) => [p, PERSONAS[PRODUCT_PERSONA[p]].voice]),
) as Record<CreditReadingProduct, Voice>;

const KEY_TITLE: Record<CreditReadingProduct, string> = {
  career: "일의 결", love: "마음의 결", wealth: "재물의 결", marriage: "함께의 결",
};

const PRODUCT_LABEL: Record<CreditReadingProduct, string> = {
  career: "직업", love: "연애", wealth: "재물", marriage: "결혼",
};

// ① 핵심 결 — 십성 5갈래 × 상품별. 전부 팔자가 주어(§3.2), 말투는 담당 페르소나.
const KEY_TEXT: Record<CreditReadingProduct, Record<TenGodCategory, string>> = {
  // 벼리(대장장이) — 짧고 단단한 요체. 한 문장에 한 가지만. 쇠·연장·담금질의 결.
  career: {
    비겁: "일에서 당신은 판을 스스로 이끄는 쪽이에요. 지시받기보다 재량이 주어질 때 힘이 나요. 협업이라면 방향을 정하는 자리가 어울려요.",
    식상: "당신의 쇠는 표현과 창작에서 빛나요. 만들고, 쓰고, 보여주는 자리 — 결과물이 눈에 보일 때 힘이 오래가요.",
    재성: "당신은 성과가 손에 잡히는 일에서 힘이 나요. 숫자·거래·운영처럼 실리를 다루는 자리에서 감각이 살아나요. 기회를 알아보는 눈, 그게 당신의 연장이에요.",
    관성: "맡은 자리를 지켜내는 힘이 당신 커리어의 중심이에요. 체계 안에서 신뢰를 쌓아 올라가는 길이죠. 책임이 주어질수록 오히려 단단해져요.",
    인성: "당신의 일은 배우고 정리해 전하는 데서 깊어져요. 연구·기획·가르침 — 앎을 다루는 자리예요. 꾸준함이 곧 당신의 담금질이에요.",
  },
  // 홍연(붉은 실) — 오랜 친구 같은 다정한 반말.
  love: {
    비겁: "마음을 줄 때도 너는 대등한 관계를 원해. 기대기보다 나란히 걷는 사이 — 서로의 영역을 존중해주는 상대를 만날 때 마음이 오래가.",
    식상: "너는 마음을 표현으로 건네는 쪽이야. 말과 몸짓, 작은 선물로 애정이 흐르지. 표현을 받아주고 되돌려주는 상대에게 마음이 깊어져.",
    재성: "네 애정은 구체적이야. 마음만큼 행동으로 챙기고, 함께하는 시간을 현실로 만들어가지. 막연한 약속보다 손에 잡히는 다정함에 끌리는 결이야.",
    관성: "너는 관계에 진심과 책임을 다하는 쪽이야. 가볍게 시작하기보다 믿음이 쌓인 뒤에 깊어지는 결 — 그만큼 한번 이어진 마음은 쉽게 흔들리지 않아.",
    인성: "너는 마음을 천천히 받아들이며 깊어지는 쪽이야. 대화가 통하고 생각의 결이 맞는 상대에게 끌리고, 이해받는다는 느낌에서 사랑을 확인하지.",
  },
  // 금오(금까마귀) — 호쾌한 하오체. 물길의 비유.
  wealth: {
    비겁: "그대의 재물은 스스로 벌어 스스로 지키는 결이오. 동업보다 내 몫이 분명한 구조가 마음 편하고, 나눠 쓰는 지출에는 기준을 세워두면 좋소.",
    식상: "그대의 재물은 재주에서 나오는 결이오. 만들어내는 것, 표현하는 것이 수입의 물길이 되니 — 재능에 들이는 지출이 곧 저축이오.",
    재성: "그대는 돈의 흐름을 읽는 감각을 타고났소. 벌 곳과 쓸 곳을 알아보는 눈이 밝으니, 관리의 습관만 더해지면 재물이 꾸준히 쌓이는 결이오.",
    관성: "그대의 재물은 신용에서 자라는 결이오. 꾸준한 자리, 안정된 흐름에서 모이는 법 — 급한 수익보다 오래가는 물길이 어울리오.",
    인성: "그대의 재물은 앎이 앞서고 돈이 따라오는 결이오. 배움과 자격에 들인 시간이 뒤에 큰 물길로 돌아오는 법이오. 서두르지 않는 마음, 그것이 곧 그대의 재테크라오.",
  },
  // 온새(나무 기러기) — 포근한 지요체. 느린 리듬, 나무·길의 비유.
  marriage: {
    비겁: "결혼에서 당신은 각자의 영역이 살아 있는 동반자를 원하지요. 서로의 삶을 존중하는 두 사람이 나란히 걷는 그림 — 하나로 녹아들기보다 나란히 서는 데서 안정을 찾는 결이지요.",
    식상: "당신의 가정은 표현이 흐르는 곳일 때 따뜻하지요. 말하고 웃고 함께 만드는 일상 — 침묵이 길어지는 집보다 소소한 수다가 이어지는 집이 어울리지요.",
    재성: "당신은 가정을 현실로 단단히 꾸리는 쪽이지요. 함께의 삶을 구체적으로 그리고 챙기는 결 — 생활의 합이 맞는 상대와 오래 편안하지요.",
    관성: "당신에게 결혼은 약속의 무게를 함께 지는 일이지요. 신의로 쌓아가는 관계에서 깊은 안정을 느끼는 결 — 서두르지 않고 확신 위에 시작해도 늦지 않지요.",
    인성: "당신의 가정은 서로를 이해하는 대화 위에 서지요. 말없이도 통하는 순간을 소중히 여기고, 배우자에게서 배우고 기대는 데서 편안함을 찾는 결이지요.",
  },
};

// ①-보강 직업적성 예시(career 전용) — 십성 5갈래별 구체적인 분야·역할 2~3개. 단정("이 직업이
// 맞아요")이 아니라 KEY_TEXT 문장 끝에 벼리의 짧은 문장으로 이어붙여, 있는 결을 구체화하는
// 용도로만 쓴다. "분석"·"진단" 등 tone-guard가 막는 낱말은 피한다.
const CAREER_EXAMPLES: Record<TenGodCategory, string[]> = {
  비겁: ["창업", "프리랜서", "1인 사업"],
  식상: ["콘텐츠 제작", "공연·전시", "마케팅"],
  재성: ["영업", "유통", "자산 관리"],
  관성: ["조직 운영", "행정", "관리자 역할"],
  인성: ["교육", "연구", "기획"],
};

// ③ 운의 계절 도입 한 줄(상품 맥락·페르소나 말투) — 대운 본문(daeunSeasonBody) 앞에 붙는다.
const FLOW_INTRO: Record<CreditReadingProduct, string> = {
  career: "일의 흐름에도 계절이 있어요.",
  love: "인연의 때도 계절처럼 흘러가.",
  wealth: "재물의 물길에도 계절이 있소.",
  marriage: "함께의 때도 계절처럼 오지요.",
};

// ④ 보조축 — 신강/신약/중화 수식(상품별·페르소나 말투). 전부 "이 …" 로 시작해 앞 섹션(팔자)의
// 결을 받는다.
const AUX_TEXT: Record<CreditReadingProduct, Record<DayMasterStrength, string>> = {
  career: {
    신강: "이 결이 힘 있게 뻗는 사주예요. 주도하는 자리일수록 성과가 또렷해져요.",
    신약: "이 결이 아직 힘을 키워가는 사주예요. 넓히기보다 한 걸음씩 다지는 쪽이 오래가요.",
    중화: "이 결이 무리 없이 자리 잡은 사주예요. 급히 밀어붙이지 않아도 성과가 쌓여요.",
  },
  love: {
    신강: "이 마음이 힘 있게 뻗어나가는 사주야. 표현할수록 관계가 깊어져.",
    신약: "이 마음이 아직 힘을 키워가는 사주야. 서두르지 말고 천천히 다가가는 쪽이 너한테 잘 맞아.",
    중화: "이 마음이 무리 없이 자리 잡은 사주야. 있는 그대로 다가가도 관계가 편안하게 이어져.",
  },
  wealth: {
    신강: "이 감각이 힘 있게 뻗어나가는 사주이니, 기회를 크게 벌릴수록 결실도 커지는 법이오.",
    신약: "이 감각이 아직 힘을 키워가는 사주이니, 한 번에 크게 벌리기보다 하나씩 쌓는 쪽이 안전하오.",
    중화: "이 감각이 무리 없이 자리 잡은 사주이니, 무리한 확장 없이도 꾸준히 실속을 챙길 수 있소.",
  },
  marriage: {
    신강: "이 결이 힘 있게 뻗어나가는 사주지요. 두 사람의 그림을 적극적으로 그려갈수록 가정이 단단해지지요.",
    신약: "이 결이 아직 힘을 키워가는 사주지요. 서두르지 않고 천천히 쌓아가는 쪽이 당신에게 잘 맞지요.",
    중화: "이 결이 무리 없이 자리 잡은 사주지요. 있는 그대로도 편안한 가정을 꾸릴 수 있지요.",
  },
};

// ④ 마무리 절 — 강한 오행(공용 5종 × 어미 갈래). 보조축 안에서 한 문장 수식으로만 쓰인다.
const ELEMENT_CLOSE: Record<Voice, Record<"목" | "화" | "토" | "금" | "수", string>> = {
  yo: {
    목: "목(木)의 기운이 그 위에 성장의 활력을 더해줘요.",
    화: "화(火)의 기운이 그 위에 환한 생기를 더해줘요.",
    토: "토(土)의 기운이 그 위에 든든한 안정감을 더해줘요.",
    금: "금(金)의 기운이 그 위에 단단한 결단력을 더해줘요.",
    수: "수(水)의 기운이 그 위에 유연한 지혜를 더해줘요.",
  },
  banmal: {
    목: "목(木)의 기운이 그 위에 성장의 활력을 더해줘.",
    화: "화(火)의 기운이 그 위에 환한 생기를 더해줘.",
    토: "토(土)의 기운이 그 위에 든든한 안정감을 더해줘.",
    금: "금(金)의 기운이 그 위에 단단한 결단력을 더해줘.",
    수: "수(水)의 기운이 그 위에 유연한 지혜를 더해줘.",
  },
  hao: {
    목: "목(木)의 기운이 그 위에 성장의 활력을 더해 주오.",
    화: "화(火)의 기운이 그 위에 환한 생기를 더해 주오.",
    토: "토(土)의 기운이 그 위에 든든한 안정감을 더해 주오.",
    금: "금(金)의 기운이 그 위에 단단한 결단력을 더해 주오.",
    수: "수(水)의 기운이 그 위에 유연한 지혜를 더해 주오.",
  },
  jiyo: {
    목: "목(木)의 기운이 그 위에 성장의 활력을 더해 주지요.",
    화: "화(火)의 기운이 그 위에 환한 생기를 더해 주지요.",
    토: "토(土)의 기운이 그 위에 든든한 안정감을 더해 주지요.",
    금: "금(金)의 기운이 그 위에 단단한 결단력을 더해 주지요.",
    수: "수(水)의 기운이 그 위에 유연한 지혜를 더해 주지요.",
  },
};

// 공통 섹션 제목 — 조립과 엿보기 제목 목록이 같은 상수를 참조해 구조적으로 어긋날 수 없다.
// 보조축 제목의 호칭만 페르소나 말투를 따른다(당신/너/그대).
const ELEMENTS_TITLE = "오행이 건네는 조언";
const SEASON_TITLE = "운의 계절";
const AUX_TITLE: Record<Voice, string> = {
  yo: "당신에게 드러나는 방식",
  banmal: "너에게 드러나는 방식",
  hao: "그대에게 드러나는 방식",
  jiyo: "당신에게 드러나는 방식",
};

/** 받침 유무에 따른 부름말 어미 선택 — 한글 음절로 끝나지 않으면(빈 이름 포함) null. */
function finalConsonant(name: string): boolean | null {
  const code = name.charCodeAt(name.length - 1) - 0xac00;
  if (Number.isNaN(code) || code < 0 || code >= 11172) return null;
  return code % 28 !== 0;
}

/** 페르소나 말투별 부름말 — 홍연 "새벽아,"/"하나야," · 금오 "새벽이여,"(연극적 하오체) ·
 *  그 외 "새벽님,". 이름이 비었거나 한글로 끝나지 않으면 어미 없이 안전하게 줄인다. */
function address(nickname: string, voice: Voice): string {
  const name = nickname.trim();
  if (!name) return "";
  const batchim = finalConsonant(name);
  if (voice === "banmal") return batchim === null ? `${name}, ` : `${name}${batchim ? "아" : "야"}, `;
  if (voice === "hao") return batchim === null ? `${name}, ` : `${name}${batchim ? "이여" : "여"}, `;
  return `${name}님, `;
}

/** LLM 문단(⑤) 제목 — 상품의 담당 페르소나 말투로. */
export function llmSectionTitle(product: CreditReadingProduct): string {
  return LLM_TITLE[PRODUCT_VOICE[product]];
}

/** 엿보기·화면이 쓰는 섹션 제목 목록(잠김 상태에서도 제목은 공개 — P9 §5.1). */
export function readingSectionTitles(product: CreditReadingProduct): string[] {
  return [
    KEY_TITLE[product], ELEMENTS_TITLE, SEASON_TITLE,
    AUX_TITLE[PRODUCT_VOICE[product]], llmSectionTitle(product),
  ];
}

/** 4종 공통 조립 — ①~④, 담당 페르소나 말투로. LLM 문단(⑤)은 액션이 성공 시에만 덧붙인다.
 *  traits(MBTI·혈액형)는 선택 — 있으면 보조축 섹션에 수식 문장이 더해진다(위계 §3: 결론은
 *  팔자가 이미 냈고, 겉으로 드러나는 방식만 덧그린다). 없으면 기존과 완전히 동일(폴백). */
export function assembleCreditReading(
  product: CreditReadingProduct,
  ctx: ProfileContext,
  nickname: string,
  age: number | null,
  traits?: Traits | null,
): InterpretationSection[] {
  const voice = PRODUCT_VOICE[product];
  const cat = dominantCategory(ctx.tenGods);
  const structure = [strengthText(ctx.strength, voice), patternsText(ctx.patterns, voice)]
    .filter((t): t is string => t !== null)
    .join(" ");
  const examples = product === "career"
    ? ` 예를 들면 ${CAREER_EXAMPLES[cat].join("·")} 같은 자리 — 거기서 결이 서요.`
    : "";
  const aux = [
    AUX_TEXT[product][ctx.strength],
    ELEMENT_CLOSE[voice][ctx.elements.dominant],
    traitsText(traits, voice),
  ].filter((t): t is string => t !== null).join(" ");
  return [
    { title: KEY_TITLE[product], body: `${address(nickname, voice)}${KEY_TEXT[product][cat]} ${structure}${examples}` },
    { title: ELEMENTS_TITLE, body: ELEMENT_BALANCE_TEXT(ctx.elements, voice) },
    { title: SEASON_TITLE, body: `${FLOW_INTRO[product]} ${daeunSeasonBody(ctx, age, voice)}` },
    { title: AUX_TITLE[voice], body: aux },
  ];
}

/**
 * LLM 개인화 요청문 — 템플릿 결론 위에서 길게 풀어쓰기만, 새 단정 금지(§5.4).
 * "각 운을 풍성한 서술형으로" 요청에 맞춰 짧은 조언 한 문단이 아니라, 여러 문단으로 풀어쓴
 * 넉넉한 분량을 요청한다. 길이는 무료 모델 실측(2026-07-20: gemma-4-26b-a4b-it:free 기준
 * 초당 ~33~36토큰, 공용 무료 풀이라 가변적) 기준으로 잡았다 — openrouter-provider.ts의 25초
 * 내부 타임아웃 안에 안전하게 끝나는 선. 유효한 유료 모델을 설정하면(OPENROUTER_PREMIUM_MODEL)
 * 더 큰 예산(longForm+premium)을 쓰지만, 이 프롬프트 문구는 손대지 않았다 — 유료 모델은 보통
 * 더 빨라 이 분량은 여유 있게 채우고, 무료 모델은 이 분량이 안전 상한에 가깝다.
 * 말투는 시스템 프롬프트(chat-prompt.ts)의 페르소나 toneInstruction이 정한다 — 위 섹션
 * 본문이 이미 그 말투라, LLM 문단도 자연스럽게 같은 목소리로 이어진다.
 */
export function creditReadingPrompt(
  product: CreditReadingProduct,
  ctx: ProfileContext,
  sections: InterpretationSection[],
): string {
  return [
    `[${PRODUCT_LABEL[product]} 풀이 · 개인화 · 긴 서술형]`,
    ...sections.map((s) => `${s.title}: ${s.body}`),
    `위 ${PRODUCT_LABEL[product]} 풀이의 결(십성·오행·신강신약·운의 계절) 위에서, 이 사람만을 위한`,
    `${PRODUCT_LABEL[product]} 이야기를 500~700자 분량으로 넉넉하게 들려줘요. 2~3개 문단으로 나눠서,`,
    "①지금 이 결이 어떤 모습으로 드러나는지 구체적인 장면처럼 풀어쓰고, ②그 결이 실생활에서",
    "어떻게 나타날 수 있는지 예시를 들어 짚어주고, ③지금·이번 계절에 해볼 만한 구체적인 제안",
    "한 가지로 마무리해요. 위 문장을 그대로 반복하지 말고, 새로운 단정(예언)을 만들지 말고,",
    "이미 나온 결을 더 깊고 구체적으로 풀어써요. 문단 사이는 빈 줄로 구분해요.",
    "말투는 위 섹션 본문과 같은 어조(시스템 지시의 페르소나 말투)를 그대로 이어가요.",
  ].join("\n");
}

/** 테스트 전용 — 전 카피 톤·말투 서명 검사용 목록(상품별). 런타임 사용 금지. */
export const __TEXT_BY_PRODUCT_FOR_TEST: Record<CreditReadingProduct, string[]> =
  Object.fromEntries(
    CREDIT_READING_PRODUCTS.map((p) => [p, [
      ...Object.values(KEY_TEXT[p]),
      ...Object.values(AUX_TEXT[p]),
      ...Object.values(ELEMENT_CLOSE[PRODUCT_VOICE[p]]),
      FLOW_INTRO[p],
      KEY_TITLE[p],
      AUX_TITLE[PRODUCT_VOICE[p]],
      LLM_TITLE[PRODUCT_VOICE[p]],
      ...(p === "career"
        ? Object.values(CAREER_EXAMPLES).map(
            (ex) => `예를 들면 ${ex.join("·")} 같은 자리 — 거기서 결이 서요.`,
          )
        : []),
    ]]),
  ) as Record<CreditReadingProduct, string[]>;
