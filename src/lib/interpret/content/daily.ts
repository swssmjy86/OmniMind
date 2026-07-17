import type { DailyContext, DailyRelation } from "@/lib/engine/daily";
import type { TenGod } from "@/lib/engine/ten-gods";
import type { InterpretationSection } from "../types";

// 천간 10종 그날의 무드 — 같은 오행이라도 음양(갑/을, 병/정…)에 따라 결이 다르다.
// 오행 5종만 쓰면 이틀 연속 같은 문구가 반복되므로, 물상(物象)을 살려 10종으로 나눈다. §5.4 문체.
const STEM_MOOD: Record<string, { keyword: string; color: string; mind: string; lucky: string }> = {
  갑: { keyword: "곧은 시작", color: "짙은 초록빛", mind: "큰 나무가 위로 뻗듯, 미뤄둔 일의 첫걸음을 떼기 좋은 날이에요.", lucky: "아침의 기지개" },
  을: { keyword: "부드러운 성장", color: "연둣빛", mind: "덩굴이 담을 타고 오르듯, 곧장 가지 않고 돌아가는 길도 길이에요.", lucky: "가까운 산책" },
  병: { keyword: "환한 표현", color: "밝은 코랄", mind: "해가 만물을 비추듯, 마음속 이야기를 환하게 꺼내 보여도 좋은 날이에요.", lucky: "안부 인사 한마디" },
  정: { keyword: "은은한 온기", color: "노을빛 코랄", mind: "촛불이 오래 타듯, 가까운 사람에게 조용한 정성을 건네보아요.", lucky: "따뜻한 차 한 잔" },
  무: { keyword: "든든한 중심", color: "짙은 베이지", mind: "산이 자리를 지키듯, 무리해 나아가기보다 중심을 지키는 하루도 좋아요.", lucky: "정돈된 책상" },
  기: { keyword: "조용한 보살핌", color: "포근한 베이지", mind: "흙이 씨앗을 품듯, 나와 곁을 가만히 돌보기 좋은 날이에요.", lucky: "화분에 물 주기" },
  경: { keyword: "단단한 결단", color: "은빛 회색", mind: "무쇠를 벼리듯, 미뤄둔 매듭 하나를 짓기 좋은 날이에요.", lucky: "작은 비우기" },
  신: { keyword: "섬세한 다듬기", color: "은은한 아이보리", mind: "보석을 닦듯, 이미 가진 것을 정성껏 매만지기 좋은 날이에요.", lucky: "반짝이는 소품 하나" },
  임: { keyword: "넓은 흐름", color: "깊은 남빛", mind: "큰 물이 흐르듯, 마음을 넓게 두고 흘러가는 대로 맡겨도 돼요.", lucky: "잔잔한 음악" },
  계: { keyword: "스며드는 여유", color: "새벽 안개빛", mind: "이슬이 조용히 스미듯, 서두르지 않고 천천히 젖어드는 하루면 충분해요.", lucky: "느긋한 반신욕" },
};

// 오늘의 천간이 내 일간에게 갖는 십성 — 음양까지 반영한 열 갈래 개인화.
const TEN_GOD_TEXT: Record<TenGod, string> = {
  비견: "오늘의 기운은 당신과 나란히 걷는 비견의 결이에요. 평소의 당신다움을 믿고 가면 되는 날이죠.",
  겁재: "오늘은 당신과 닮았지만 결이 조금 다른 겁재의 기운이에요. 남의 속도에 마음을 뺏기지 말고, 내 걸음을 지켜보아요.",
  식신: "오늘은 당신의 재주가 자연스럽게 흘러나오는 식신의 기운이에요. 좋아하는 일에 손을 대보면 유난히 잘 풀리죠.",
  상관: "오늘은 표현이 반짝이며 튀어나오는 상관의 기운이에요. 톡톡 튀는 생각은 살리되, 말은 한 번 다듬어 건네보아요.",
  편재: "오늘은 기회가 여기저기서 반짝이는 편재의 기운이에요. 눈에 들어온 것 중 하나만 골라 정성을 들여보아요.",
  정재: "오늘은 차곡차곡 쌓기 좋은 정재의 기운이에요. 작은 일을 성실히 매듭지으면 손에 잡히는 결실이 남죠.",
  편관: "오늘은 당신을 단단히 조여주는 편관의 기운이에요. 새 도전보다, 지킬 것을 지키는 데 마음을 두면 든든한 날이죠.",
  정관: "오늘은 자리를 반듯하게 지켜주는 정관의 기운이에요. 약속과 순서를 따르는 하루가 오히려 마음을 가볍게 해줘요.",
  편인: "오늘은 낯선 배움이 스며드는 편인의 기운이에요. 평소와 다른 책, 다른 길을 기웃거려보아도 좋아요.",
  정인: "오늘은 당신을 품어 채워주는 정인의 기운이에요. 배우고 쉬고 받아들이며, 안을 채우기 좋은 날이죠.",
};

// 오행 관계 5단 문구 — 일간 천간을 모르는 경우(구버전 캐시 등)용 폴백.
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

/** 데일리 가이드 문구 조립(템플릿, 항상 동작). 무드는 일진 천간(10종) 기준. */
export function assembleDaily(daily: DailyContext, nickname?: string): DailyGuide {
  const mood = STEM_MOOD[daily.dayGanzhi[0]];
  const who = nickname ? `${nickname}님, ` : "";
  const personal = daily.tenGod
    ? TEN_GOD_TEXT[daily.tenGod]
    : daily.relation
      ? RELATION_TEXT[daily.relation]
      : null;
  return {
    headline: `${who}오늘은 ${daily.element}(${daily.dayGanzhi})의 기운이 흐르는 날이에요.`,
    mind: mood.mind,
    color: mood.color,
    keyword: mood.keyword,
    lucky: mood.lucky,
    personal,
  };
}

/** interpretations 캐시용 섹션 형태. llmParagraph가 있으면 P8 로그인 전용 개인화 문단을 더한다. */
export function dailyToSections(guide: DailyGuide, llmParagraph?: string): InterpretationSection[] {
  return [
    { title: "오늘의 기운", body: guide.headline },
    { title: "마음가짐", body: guide.mind },
    { title: "오늘의 색과 키워드", body: `${guide.color} · ${guide.keyword}` },
    { title: "행운 포인트", body: guide.lucky },
    ...(guide.personal ? [{ title: "당신에게", body: guide.personal }] : []),
    ...(llmParagraph ? [{ title: "오늘, 당신만을 위한 이야기", body: llmParagraph }] : []),
  ];
}

/**
 * P8 로그인 전용 LLM 개인화 요청 — 데일리는 하루 1회만 생성(캐시)되므로 무료 모델을 그대로 쓴다.
 * 프로필 시스템 프롬프트(§5.4)는 Provider가 붙인다.
 */
export function dailyPrompt(daily: DailyContext, guide: DailyGuide): string {
  return [
    "[오늘의 기운 · 개인화]",
    `오늘은 ${daily.element}(${daily.dayGanzhi})의 기운이 흐르는 날이에요.`,
    `템플릿 마음가짐: ${guide.mind}`,
    "이 사람의 사주·MBTI·별자리 결을 살려, 오늘 하루를 보내는 다정한 조언을 2~3문장으로 더 구체적으로 들려줘요. 위 템플릿 문장을 그대로 반복하지 말고, 새로운 표현으로.",
  ].join("\n");
}
