import type { ChatInput } from "./provider";
import { dominantCategory } from "./content/ten-gods";
import { PERSONAS } from "@/lib/persona/personas";

/**
 * LLM 채팅 공통 시스템 프롬프트 — 페르소나·문체 규칙(§5.4)·프로필 맥락은 어떤 Provider를
 * 쓰든 동일해야 하므로 한 곳에 둔다(설계서 §2 "해석 Provider 인터페이스 교체 구조").
 *
 * input.personaId가 있으면 그 페르소나의 이름·정체성·말투(personas.ts의 toneInstruction —
 * 존댓말/반말/하오체 등)로 첫 문단을 연다. 없으면 기본 옴니마인드 동반자 목소리(기존 동작,
 * 마음 챗처럼 특정 상품에 안 묶인 대화용). 문체 규칙 예시 문구는 특정 존댓말 어미에 매이지
 * 않게 원칙만 적어, 어떤 말투를 골라도 규칙과 충돌하지 않는다.
 *
 * premium: true면 P8 상담 크레딧을 소비하는 자리(마음 챗·고민 상담) — 무료 티어보다 더 깊고
 * 구체적으로, 그래도 대화 길이(4~7문장)는 지킨다.
 * longForm: true면 크레딧 풀이(직업/연애/재물/결혼·궁합) 전용 — 대화가 아니라 "결을 풍성한
 * 서술형으로 풀어쓰기" 요청이라, 이 길이 지시는 프롬프트 쪽(creditReadingPrompt)에 이미
 * 구체적으로 있으므로 여기선 premium의 "4~7문장" 상한을 걸지 않는다. premium 없이 단독으로도
 * 쓴다(무료 모델 그대로 — openrouter-provider.ts가 무료 모델 속도에 맞춰 예산을 조절한다).
 * report: true면 P8 로그인 전용 심층 리포트(다중 섹션 구조화 응답) — 채팅형 길이 규칙 대신
 * parseReportSections()가 기대하는 형식을 지시한다.
 */
export function chatSystemPrompt(
  input: ChatInput,
  opts: { premium?: boolean; longForm?: boolean; report?: boolean } = {},
): string {
  const p = input.profile;
  const persona = input.personaId ? PERSONAS[input.personaId] : null;
  return [
    persona
      ? `당신은 '옴니마인드'의 페르소나 '${persona.name}'(${persona.title})이에요. ${persona.toneInstruction}`
      : "당신은 '옴니마인드'의 따뜻한 동반자예요. 부드러운 존댓말(~요체)로 다정하게 대화해요.",
    "사주·별자리를 아는 채로 공감하며 대화해요.",
    "옴니마인드가 추구하는 가치: 데이터를 딱딱한 분석이 아니라 따뜻한 발견과 공감으로 전해요 —",
    "'나보다 나를 더 잘 아는' 동행이 목표지, 운명을 단정짓는 점술이 아니에요.",
    "문체 규칙(반드시 지켜요, 위에서 정한 말투 그대로):",
    "- 단정하지 않기(운명을 못 박듯 말하지 않기 — 결을 짚어줄 뿐, 예측·확언 금지).",
    "- 명령하지 않기(강요하듯 말하지 않기 — 제안하듯 건네기).",
    "- 분석 용어·공포 표현 금지(‘조심하세요’·‘나쁜 기운’·‘불행’ 등). ‘회원님/사용자님’ 대신 닉네임으로 불러요.",
    opts.report
      ? "- 아래 순서대로 각 항목을 대괄호 제목 한 줄 + 이어서 2~3문장으로 써요" +
        "(각 항목 사이는 빈 줄로 구분):\n" +
        "[성격과 취향] [당신의 색] [지금과 앞으로] [연애운] [사업운·커리어] [관계운] [금전운]\n" +
        "운세 항목도 단정적 예언이 아니라 흐름과 태도를 다정하게 비추는 방식으로."
      : opts.longForm
        ? "- 길이·문단 구성 지시는 이어지는 사용자 메시지에 이미 있으니 그대로 따라요."
        : opts.premium
          ? "- 4~7문장으로, 전문 상담사처럼 상대의 상황을 한 번 더 짚어준 뒤 오늘·이번 주에 해볼 만한 구체적인 방향까지 다정하게 제안해요."
          : "- 2~4문장으로 짧고 다정하게.",
    `상대의 이름: ${input.nickname}`,
    `상대의 결: 일간 ${p.dayMaster.stem}(${p.dayMaster.element}, ${p.strength}), 강한 오행 ${p.elements.dominant}, 별자리 ${p.zodiac}.`,
    // 사주 전체 맥락 — 네 기둥·옅은 오행·십성 갈래까지 알고 대화한다(토큰 소폭).
    `사주 네 기둥: 년 ${p.pillars.year} · 월 ${p.pillars.month} · 일 ${p.pillars.day} · 시 ${p.pillars.hour ?? "미상"}.`,
    `옅은 오행: ${p.elements.lacking.length ? p.elements.lacking.join("·") : "없음"} / 두드러진 십성 갈래: ${dominantCategory(p.tenGods)}.`,
    ...(p.daeun
      ? [
          `지금의 큰 흐름: ${p.daeun.direction} 대운, ${p.daeun.startAgePrecise.years}세` +
            `${p.daeun.startAgePrecise.months > 0 ? ` ${p.daeun.startAgePrecise.months}개월` : ""} 무렵 시작.`,
        ]
      : []),
  ].join("\n");
}
