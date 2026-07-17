import type { ProfileContext } from "@/lib/engine";
import type { InterpretationSection } from "../types";
import { dominantCategory, tenGodTheme, type TenGodCategory } from "./ten-gods";
import { DAY_MASTER_TEXT } from "./day-master";
import { ELEMENT_BALANCE_TEXT } from "./elements";
import { MBTI_AXIS_TEXT } from "./mbti";
import { BLOOD_TEXT } from "./blood";
import { ZODIAC_TEXT } from "./zodiac";

// '종합' 교차 해석 — 사주(십성 갈래)와 MBTI(E/I)가 서로를 비추는 지점을 읽는다.
// 개별 나열을 넘어 "조각이 만나는 자리"를 보여주는 것이 옴니마인드의 핵심 가치. §5.4 문체.
const SYNTHESIS: Record<TenGodCategory, Record<"E" | "I", string>> = {
  비겁: {
    E: "스스로 서려는 사주의 힘이 E의 활달한 결과 만나, 사람들 속에서 앞장설 때 가장 크게 자라는 조합이에요. 다만 모든 걸 혼자 끌고 가려 할 땐, 곁의 손길에 한 번쯤 기대보아도 좋아요.",
    I: "스스로 서려는 사주의 힘이 I의 조용한 결과 만나, 혼자만의 시간에 뿌리를 내리며 단단해지는 조합이에요. 묵묵히 쌓아온 것이 어느 날 문득 큰 그늘을 드리우죠.",
  },
  식상: {
    E: "표현하고 싶은 사주의 기운이 E의 결을 타고 밖으로 시원하게 흐르는 조합이에요. 말하고 나누고 보여줄수록 생기가 돌죠.",
    I: "표현하고 싶은 사주의 기운이 I의 결 안에 고여, 겉으론 잔잔해도 속엔 하고 싶은 이야기가 가득한 조합이에요. 글이나 작업물처럼 혼자 빚어내는 통로를 만나면 그 기운이 가장 아름답게 흘러요.",
  },
  재성: {
    E: "결실을 만들어내는 사주의 감각이 E의 추진력과 만나, 마음먹은 것을 현실로 끌어오는 힘이 좋은 조합이에요. 이따금 속도를 늦추고 쉼표를 찍어주면 그 힘이 더 오래가요.",
    I: "결실을 만들어내는 사주의 감각이 I의 신중함과 만나, 조용히 그러나 실속 있게 챙겨가는 조합이에요. 드러내지 않아도 결과가 당신을 말해주죠.",
  },
  관성: {
    E: "책임을 마다하지 않는 사주의 결이 E의 기운과 만나, 사람들 사이에서 믿고 맡길 수 있는 기둥이 되는 조합이에요. 가끔은 그 무게를 내려놓는 저녁도 필요해요.",
    I: "책임을 마다하지 않는 사주의 결이 I의 기운과 만나, 티 내지 않고 자리를 지키는 은은한 무게감의 조합이에요. 당신의 성실은 소리 없이도 멀리까지 전해져요.",
  },
  인성: {
    E: "받아들이고 곱씹는 사주의 깊이가 E의 기운과 만나, 배운 것을 사람들에게 나누며 빛나는 조합이에요. 앎과 사람 사이에 다리를 놓아주죠.",
    I: "받아들이고 곱씹는 사주의 깊이가 I의 기운과 만나, 안으로 고요히 세계를 넓혀가는 조합이에요. 서두르지 않는 그 깊이가 당신만의 답을 길어 올려요.",
  },
};

/** 사주(십성)와 MBTI가 만나는 자리 — '종합' 섹션 본문. */
export function synthesisText(ctx: ProfileContext): string {
  return SYNTHESIS[dominantCategory(ctx.tenGods)][ctx.mbti.axes.EI];
}

/**
 * P8 로그인 전용 심층 리포트 요청 — 사주·MBTI·혈액형·별자리 네 체계 각각에 이미 정의된
 * "요약이 아닌 전체 서술"(DAY_MASTER_TEXT·ELEMENT_BALANCE_TEXT·tenGodTheme·MBTI_AXIS_TEXT·
 * BLOOD_TEXT·ZODIAC_TEXT — 유형 라벨만이 아니라 각 체계가 이미 갖고 있는 완전한 결 서술)를
 * 그대로 프롬프트에 실어, LLM이 이 사람의 실제 결 위에서 성격·취향·색·현재와 미래·네 가지
 * 운(연애·사업/커리어·관계·금전)을 엮게 한다. 응답 형식(대괄호 제목 구조)은
 * chatSystemPrompt(..., {report:true})가 지시하고, parseReportSections()가 파싱한다.
 */
export function profileSynthesisPrompt(ctx: ProfileContext, nickname: string): string {
  const dayMaster = DAY_MASTER_TEXT[ctx.dayMaster.stem]?.body ?? "";
  const elements = ELEMENT_BALANCE_TEXT(ctx.elements);
  const talent = tenGodTheme(ctx.tenGods);
  const mbti = MBTI_AXIS_TEXT(ctx.mbti);
  const blood = BLOOD_TEXT[ctx.blood.type]?.body ?? "";
  const zodiac = ZODIAC_TEXT[ctx.zodiac]?.intro ?? "";

  return [
    "[온전한 나 · 심층 리포트 — 로그인 전용]",
    `일간(${ctx.dayMaster.stem}, ${ctx.dayMaster.element}): ${dayMaster}`,
    `오행 균형: ${elements}`,
    `타고난 재능(십성): ${talent}`,
    `MBTI(${ctx.mbti.type}): ${mbti}`,
    `혈액형(${ctx.blood.type}형): ${blood}`,
    `별자리(${ctx.zodiac}): ${zodiac}`,
    `${nickname}님을 위해, 위 여섯 가지 결을 각각 나열하지 말고 한 사람의 이야기로 엮어서,`,
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
