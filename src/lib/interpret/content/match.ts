import type { MatchContext, MatchMode, ZodiacHarmony } from "@/lib/engine/match";
import type { DailyRelation } from "@/lib/engine/daily";
import type { InterpretationSection } from "../types";

// P7 궁합 해석 — "우리의 조합" 문장 조립(템플릿, 항상 동작). §5.4 문체.
// 어떤 조합도 좋고 나쁨으로 가르지 않는다 — 서로 다른 결이 만나는 방식을 읽어줄 뿐.

const RELATION_TEXT: Record<DailyRelation, string> = {
  동행:
    "두 분은 같은 오행의 결을 지녔어요. 말하지 않아도 통하는 순간이 많고, 서로의 마음을 자기 일처럼 알아차리곤 하죠. 다만 닮은 만큼, 서로의 그늘도 닮아 있다는 걸 기억해요.",
  채움:
    "상대의 기운이 당신을 살며시 북돋아주는 조합이에요. 함께 있으면 어쩐지 마음이 차오르고, 배우게 되는 것이 많죠. 받은 온기를 한 번씩 되돌려주면 이 결은 더 오래가요.",
  발산:
    "당신의 기운이 상대를 자라게 하는 조합이에요. 당신 곁에서 상대는 조금씩 피어나죠. 주는 기쁨이 크지만, 가끔은 당신의 마음도 살펴주기로 해요.",
  결실:
    "당신이 이끌고 상대가 다듬어지는, 결실을 함께 만드는 조합이에요. 무언가를 같이 도모할 때 유난히 손발이 맞죠. 이끄는 쪽일수록 상대의 속도를 한 번 더 물어봐주면 좋아요.",
  단련:
    "상대의 기운이 당신을 단단하게 벼려주는 조합이에요. 편하기만 한 사이는 아닐 수 있지만, 이 관계를 지나며 당신은 분명 자라나죠. 부딪힘이 있는 날엔 한 템포 쉬어가요.",
};

const HARMONY_TEXT: Record<ZodiacHarmony, string> = {
  닮음:
    "별자리의 원소도 같은 결이라, 세상을 바라보는 온도가 비슷해요. 함께 있으면 설명이 줄고 공감이 늘어나죠.",
  어울림:
    "별자리의 원소가 서로를 살리는 짝이에요. 한쪽이 불씨라면 다른 쪽은 바람처럼 — 함께일 때 각자보다 커지는 조합이죠.",
  다름:
    "별자리의 원소가 서로 다른 결이에요. 처음엔 낯설 수 있지만, 그만큼 서로가 못 보던 풍경을 보여줄 수 있는 사이죠.",
};

// MBTI 어울림 0~5 → 3단 문구
function synergyText(synergy: number | null): string {
  if (synergy === null)
    return "상대의 MBTI까지 알게 되면, 마음의 결이 만나는 방식도 더 깊이 읽어드릴 수 있어요.";
  if (synergy >= 4)
    return "성향의 결이 서로를 예쁘게 보완해요. 같은 곳을 바라보면서도 각자 다른 힘을 보태는 조합이죠.";
  if (synergy >= 2)
    return "성향이 닮은 구석과 다른 구석이 고루 섞여 있어요. 익숙함과 새로움을 오가며 서로를 알아가게 되죠.";
  return "성향의 결이 꽤 다른 편이에요. 서로의 방식을 번역하는 데 품이 들지만, 그만큼 세계가 두 배로 넓어지는 사이죠.";
}

const MODE_CLOSING: Record<MatchMode, string> = {
  연인:
    "사랑은 닮음보다 리듬이에요. 오늘 서로의 속도를 한 번씩 물어봐주는 것 — 그게 이 조합을 가장 아름답게 하는 습관이에요.",
  친구:
    "좋은 우정은 자주가 아니라 깊이로 자라요. 문득 생각날 때 건네는 안부 한마디면, 이 결은 오래오래 이어질 거예요.",
  동료:
    "함께 일할 땐 서로의 강점에 기대보아요. 역할의 결을 나누고 나면, 이 조합은 생각보다 큰 일을 해낼 수 있어요.",
};

/** 점수 → 따뜻한 온도 표현(서열화 없이). */
export function scoreLine(score: number): string {
  if (score >= 85) return "함께 있을 때 서로가 더 커지는, 보기 드문 결이에요.";
  if (score >= 70) return "결이 잘 스며드는, 편안하고 든든한 조합이에요.";
  if (score >= 55) return "서로 다른 결이 리듬을 맞춰가는, 자라나는 조합이에요.";
  return "낯선 결이 만나 서로의 세계를 넓혀주는 조합이에요.";
}

export interface MatchAssembleInput {
  match: MatchContext;
  myElement: string;
  nickname?: string;
}

/** '우리의 조합' 해석 조립. */
export function assembleMatch(input: MatchAssembleInput): InterpretationSection[] {
  const { match, myElement, nickname } = input;
  const who = nickname ? `${nickname}님과 ` : "";
  return [
    {
      title: "우리의 온도",
      body: `${who}상대의 조합, 우리의 온도는 ${match.score}°예요. ${scoreLine(match.score)}`,
    },
    {
      title: "기운의 결",
      body: `당신은 ${myElement}, 상대는 ${match.partner.element}(${match.partner.dayGanzhi})의 기운이에요. ${RELATION_TEXT[match.elementRelation]}`,
    },
    { title: "별이 말하길", body: HARMONY_TEXT[match.zodiacHarmony] },
    { title: "마음의 결", body: synergyText(match.mbtiSynergy) },
    { title: `${match.mode}로서 함께할 때`, body: MODE_CLOSING[match.mode] },
  ];
}
