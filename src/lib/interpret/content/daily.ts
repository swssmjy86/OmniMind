import type { DailyContext, DailyRelation } from "@/lib/engine/daily";
import type { InterpretationSection } from "../types";

// 오행별 그날의 무드 — 키워드·색·마음가짐. §5.4 문체.
const ELEMENT_MOOD: Record<string, { keyword: string; color: string; mind: string; lucky: string }> = {
  목: { keyword: "새로운 시작", color: "연둣빛", mind: "천천히 싹을 틔우듯, 서두르지 않아도 괜찮아요.", lucky: "가까운 산책" },
  화: { keyword: "따뜻한 표현", color: "포근한 코랄", mind: "마음속 이야기를 살짝 꺼내 보이면 어떨까요?", lucky: "안부 인사 한마디" },
  토: { keyword: "든든한 안정", color: "포근한 베이지", mind: "무리해서 나아가기보다, 자리를 지키는 하루도 좋아요.", lucky: "정돈된 책상" },
  금: { keyword: "차분한 정리", color: "은은한 아이보리", mind: "흐트러진 것들을 하나씩 매만지기 좋은 날이에요.", lucky: "작은 비우기" },
  수: { keyword: "부드러운 흐름", color: "깊은 남빛", mind: "흐르는 물처럼, 마음을 유연하게 두어도 돼요.", lucky: "잔잔한 음악" },
};

// 오늘 기운이 나와 맺는 관계별 한 줄.
const RELATION_TEXT: Record<DailyRelation, string> = {
  동행: "오늘의 기운이 당신과 결이 같아, 당신다움이 자연스럽게 드러나는 날이에요.",
  채움: "오늘은 당신을 북돋아주는 기운이 흘러요. 받아들이고 채워가기 좋은 날이에요.",
  발산: "당신 안에 담아둔 것을 밖으로 표현하기 좋은 날이에요.",
  결실: "정성을 들인 만큼, 손에 잡히는 결실이 어울리는 날이에요.",
  단련: "살짝 마음을 다잡게 하는 기운이에요. 무리하지 말고 천천히 가도 괜찮아요.",
};

export interface DailyGuide {
  headline: string; // 오늘의 기운 한 줄
  mind: string; // 마음가짐
  color: string; // 오늘의 색
  keyword: string; // 오늘의 키워드
  lucky: string; // 행운 포인트
  personal: string | null; // 프로필 있을 때 개인화 한 줄
}

/** 데일리 가이드 문구 조립(템플릿, 항상 동작). */
export function assembleDaily(daily: DailyContext, nickname?: string): DailyGuide {
  const mood = ELEMENT_MOOD[daily.element];
  const who = nickname ? `${nickname}님, ` : "";
  return {
    headline: `${who}오늘은 ${daily.element}(${daily.dayGanzhi})의 기운이 흐르는 날이에요.`,
    mind: mood.mind,
    color: mood.color,
    keyword: mood.keyword,
    lucky: mood.lucky,
    personal: daily.relation ? RELATION_TEXT[daily.relation] : null,
  };
}

/** interpretations 캐시용 섹션 형태(향후 저장 시). */
export function dailyToSections(guide: DailyGuide): InterpretationSection[] {
  return [
    { title: "오늘의 기운", body: guide.headline },
    { title: "마음가짐", body: guide.mind },
    { title: "오늘의 색과 키워드", body: `${guide.color} · ${guide.keyword}` },
    { title: "행운 포인트", body: guide.lucky },
    ...(guide.personal ? [{ title: "당신에게", body: guide.personal }] : []),
  ];
}
