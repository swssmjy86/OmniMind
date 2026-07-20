import type { ProfileContext } from "@/lib/engine";
import type { InterpretationSection } from "../types";
import type { DayMasterStrength } from "@/lib/engine/strength";
import { dominantCategory, tenGodTheme, type TenGodCategory } from "./ten-gods";
import { DAY_MASTER_TEXT } from "./day-master";
import { ELEMENT_BALANCE_TEXT } from "./elements";
import { ZODIAC_TEXT } from "./zodiac";

// '종합' 교차 해석 — 십성(재능의 갈래)과 신강/신약(그 힘의 크기)이 서로를 비추는 지점을 읽는다.
// 둘 다 같은 사주 한 장에서 나오는 결이라, MBTI 같은 외부 체계 없이도 "조각이 만나는 자리"를
// 보여줄 수 있다. §5.4 문체.
const SYNTHESIS: Record<TenGodCategory, Record<DayMasterStrength, string>> = {
  비겁: {
    신강: "스스로 서려는 사주의 힘이 이미 넉넉히 차 있어서, 어디서든 중심을 잃지 않는 조합이에요. 가끔은 그 힘을 내려놓고 곁의 손길에 기대보는 연습도 필요해요.",
    신약: "스스로 서려는 힘이 아직 여물어가는 중이라, 혼자 다 짊어지기보다 믿을 수 있는 사람들과 함께일 때 더 크게 자라는 조합이에요.",
    중화: "스스로 서려는 힘과 그걸 다듬어주는 기운이 균형을 이뤄, 무리하지 않으면서도 흔들리지 않는 단단함을 지닌 조합이에요.",
  },
  식상: {
    신강: "표현하고 싶은 기운이 이미 넘치도록 강해서, 담아두기보다 꺼내놓을 때 훨씬 편안해지는 조합이에요. 때로는 속도를 늦추고 숨 고르는 시간도 필요해요.",
    신약: "표현하고 싶은 기운을 아직 힘을 아껴 쓰는 조합이라, 조금씩 꺼내놓는 연습이 쌓일수록 더 자유로워질 거예요.",
    중화: "표현하고 싶은 기운과 그걸 받쳐주는 힘이 알맞게 어울려, 무리하지 않고도 자연스럽게 마음을 나눌 수 있는 조합이에요.",
  },
  재성: {
    신강: "결실을 만들어내는 감각이 힘 있게 뻗어나가는 조합이라, 마음먹은 걸 현실로 끌어오는 추진력이 좋아요. 이따금 속도를 늦추고 쉼표를 찍어주면 그 힘이 더 오래가요.",
    신약: "결실을 만들어내는 감각은 있지만 아직 힘을 비축하는 중이라, 한 번에 크게 벌리기보다 하나씩 다져가는 쪽이 당신에게 더 잘 맞아요.",
    중화: "결실을 향한 감각과 그걸 지켜줄 힘이 고르게 자리해, 무리한 확장 없이도 실속을 챙길 수 있는 조합이에요.",
  },
  관성: {
    신강: "책임을 마다하지 않는 결이 이미 단단해서, 무거운 자리도 기꺼이 맡아내는 힘이 있어요. 가끔은 그 무게를 내려놓는 저녁도 필요해요.",
    신약: "책임을 마다하지 않는 마음은 있지만 아직 힘을 길러가는 중이라, 감당할 수 있는 만큼만 맡아도 충분해요.",
    중화: "책임을 지키려는 결과 그걸 버텨주는 힘이 알맞게 맞물려, 무리 없이 자리를 지켜내는 조합이에요.",
  },
  인성: {
    신강: "받아들이고 곱씹는 깊이가 이미 넉넉해서, 배운 것을 자기 것으로 삼는 힘이 좋은 조합이에요. 가끔은 머릿속에서 꺼내 실제로 움직여보는 것도 필요해요.",
    신약: "받아들이고 곱씹는 깊이는 있지만 아직 힘을 채워가는 중이라, 서두르지 않고 하나씩 쌓아가는 배움이 당신에게 잘 맞아요.",
    중화: "받아들이는 깊이와 그걸 밖으로 꺼내는 힘이 균형을 이뤄, 배운 것을 무리 없이 자기 것으로 만드는 조합이에요.",
  },
};

/** 십성(재능의 갈래)과 신강/신약(힘의 크기)이 만나는 자리 — '종합' 섹션 본문. */
export function synthesisText(ctx: ProfileContext): string {
  return SYNTHESIS[dominantCategory(ctx.tenGods)][ctx.strength];
}

const PATTERN_TEXT: Record<string, string> = {
  식신제살: "식신이 부담스러운 기운을 부드럽게 눌러주는 결이 보여요.",
  상관제살: "상관의 재치가 날카로운 기운을 능숙하게 받아넘기는 결이 보여요.",
  식상생재: "표현하는 힘이 결실로 자연스럽게 이어지는 결이 보여요.",
  군비쟁재: "가진 힘은 넘치는데 나눠 가질 결실이 좁아, 경쟁이 잦아지는 결이 보여요.",
};

/**
 * P8 로그인 전용 심층 리포트 요청 — 사주(일간·오행·십성·신강신약·격국)와 별자리, 이미 정의된
 * "요약이 아닌 전체 서술"(DAY_MASTER_TEXT·ELEMENT_BALANCE_TEXT·tenGodTheme·ZODIAC_TEXT)을
 * 그대로 프롬프트에 실어, LLM이 이 사람의 실제 결 위에서 성격·취향·색·현재와 미래·네 가지
 * 운(연애·사업/커리어·관계·금전)을 엮게 한다. 응답 형식(대괄호 제목 구조)은
 * chatSystemPrompt(..., {report:true})가 지시하고, parseReportSections()가 파싱한다.
 */
export function profileSynthesisPrompt(ctx: ProfileContext, nickname: string): string {
  const dayMaster = DAY_MASTER_TEXT[ctx.dayMaster.stem]?.body ?? "";
  const elements = ELEMENT_BALANCE_TEXT(ctx.elements);
  const talent = tenGodTheme(ctx.tenGods);
  const zodiac = ZODIAC_TEXT[ctx.zodiac]?.intro ?? "";
  const patterns = ctx.patterns.map((p) => PATTERN_TEXT[p]).filter(Boolean);

  return [
    "[온전한 나 · 심층 리포트 — 로그인 전용]",
    `일간(${ctx.dayMaster.stem}, ${ctx.dayMaster.element}): ${dayMaster}`,
    `오행 균형: ${elements}`,
    `타고난 재능(십성): ${talent}`,
    `힘의 크기(신강/신약): ${ctx.strength}`,
    ...(patterns.length ? [`구조(격국): ${patterns.join(" ")}`] : []),
    `별자리(${ctx.zodiac}): ${zodiac}`,
    `${nickname}님을 위해, 위 결들을 각각 나열하지 말고 한 사람의 이야기로 엮어서,`,
    "시스템 프롬프트가 지시한 형식(성격과 취향·당신의 색·지금과 앞으로·연애운·사업운·커리어·",
    "관계운·금전운) 그대로, 지금까지의 요약보다 훨씬 더 깊고 구체적으로 들려줘요.",
  ].join("\n");
}

/**
 * "[제목]\n내용…" 형식의 리포트 텍스트를 InterpretationSection[]으로 분리한다.
 * 대괄호 제목을 하나도 못 찾으면(LLM이 형식을 안 지켰으면) 전체를 한 섹션으로 담아
 * 안전하게 돌려준다 — 파싱 실패가 콘텐츠 자체를 버리게 하지 않는다.
 */
export function parseReportSections(text: string, fallbackTitle: string): InterpretationSection[] {
  const markers = [...text.matchAll(/\[([^\]]{1,20})\]\s*/g)];
  if (markers.length === 0) return [{ title: fallbackTitle, body: text.trim() }];

  const sections: InterpretationSection[] = [];
  for (let i = 0; i < markers.length; i++) {
    const title = markers[i][1].trim();
    const start = markers[i].index! + markers[i][0].length;
    const end = i + 1 < markers.length ? markers[i + 1].index! : text.length;
    const body = text.slice(start, end).trim();
    if (title && body) sections.push({ title, body });
  }
  return sections.length > 0 ? sections : [{ title: fallbackTitle, body: text.trim() }];
}
