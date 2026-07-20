import type { DeepMatchContext, MatchBond, MatchContext, MatchMode, ZodiacHarmony } from "@/lib/engine/match";
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

/** 간지의 인연(천간합·일지 합충) — 있을 때만 '기운의 결'에 덧붙는 한 문장. */
export function bondText(bond: MatchBond | null): string {
  if (!bond) return "";
  const parts: string[] = [];
  if (bond.stemCombine)
    parts.push("두 분의 일간은 서로를 끌어안는 합(合)의 짝이라, 처음 만나도 오래 안 사이처럼 마음이 기우는 인연이에요.");
  if (bond.branchBond === "육합")
    parts.push("두 분의 일지도 손을 맞잡는 육합의 자리라, 함께 있는 시간이 자연스럽게 편안해지죠.");
  else if (bond.branchBond === "충")
    parts.push("두 분의 일지는 서로 마주 보는 충(沖)의 자리이기도 해요. 부딪히는 날도 있겠지만, 그만큼 서로를 벼리며 자라게 하는 인연이죠.");
  return parts.join(" ");
}

const MODE_CLOSING: Record<MatchMode, string> = {
  연인:
    "사랑은 닮음보다 리듬이에요. 오늘 서로의 속도를 한 번씩 물어봐주는 것 — 그게 이 조합을 가장 아름답게 하는 습관이에요.",
  친구:
    "좋은 우정은 자주가 아니라 깊이로 자라요. 문득 생각날 때 건네는 안부 한마디면, 이 결은 오래오래 이어질 거예요.",
  동료:
    "함께 일할 땐 서로의 강점에 기대보아요. 역할의 결을 나누고 나면, 이 조합은 생각보다 큰 일을 해낼 수 있어요.",
};

/**
 * 점수 → 따뜻한 온도 표현(서열화 없이).
 * 실제 점수 분포(사주+별자리 재설계 후 약 55~92, 합충 반영)에 맞춘 경계 — 모든 구간이
 * 도달 가능하다. MBTI 시너지가 빠지며 상한이 낮아져(과거 ~100 → 지금 ~92) 경계도 함께 내렸다.
 */
export function scoreLine(score: number): string {
  if (score >= 78) return "함께 있을 때 서로가 더 커지는, 보기 드문 결이에요.";
  if (score >= 70) return "결이 잘 스며드는, 편안하고 든든한 조합이에요.";
  if (score >= 62) return "서로 다른 결이 리듬을 맞춰가는, 자라나는 조합이에요.";
  return "낯선 결이 만나 서로의 세계를 넓혀주는 조합이에요.";
}

export interface MatchAssembleInput {
  match: MatchContext;
  myElement: string;
  nickname?: string;
}

/** 오행 상호 보완(심층 궁합의 보상) 문구. */
export function complementText(c: DeepMatchContext["complement"]): string {
  const i = c.iFillPartner;
  const p = c.partnerFillsMe;
  const list = (xs: string[]) => xs.join("·");
  if (i.length && p.length)
    return `서로가 서로의 빈 자리를 채워주는, 흔치 않은 조합이에요. 당신은 상대에게 ${list(i)}의 기운을, 상대는 당신에게 ${list(p)}의 기운을 건네주죠. 함께 있는 것만으로 각자의 팔자가 조금 더 온전해져요.`;
  if (i.length)
    return `당신에게는 상대에게 없는 ${list(i)}의 기운이 있어요. 당신의 존재가 상대의 빈 자리를 살며시 메워주는 셈이죠. 곁에 있어주는 것만으로 큰 힘이 될 거예요.`;
  if (p.length)
    return `상대에게는 당신에게 없는 ${list(p)}의 기운이 있어요. 그 곁에 있으면 당신의 빈 자리가 조용히 채워지죠. 그 온기를 편히 받아들여도 괜찮아요.`;
  return "두 분 모두 각자의 결이 이미 뚜렷한 편이에요. 채움보다는 나란히 서서 같은 곳을 바라보는 조합이죠.";
}

/** 양방향 심층 궁합 해석 — 두 사람의 사주 전체가 만나는 이야기. */
export function assembleDeepMatch(input: {
  match: DeepMatchContext;
  myElement: string;
  myName: string;
  partnerName: string;
}): InterpretationSection[] {
  const { match, myElement, myName, partnerName } = input;
  const bond = bondText(match.bond);
  return [
    {
      title: "우리의 온도",
      body: `${myName}님과 ${partnerName}님, 두 분의 온도는 ${match.score}°예요. ${scoreLine(match.score)}`,
    },
    {
      title: "기운의 흐름",
      body: `${myName}님은 ${myElement}(${match.myDayGanzhi}), ${partnerName}님은 ${match.partner.element}(${match.partner.dayGanzhi})의 기운이에요. ${RELATION_TEXT[match.elementRelation]}`,
    },
    { title: "서로를 채우는 조각", body: complementText(match.complement) },
    ...(bond ? [{ title: "인연의 매듭", body: bond }] : []),
    { title: "별이 말하길", body: HARMONY_TEXT[match.zodiacHarmony] },
    { title: `${match.mode}로서 함께할 때`, body: MODE_CLOSING[match.mode] },
  ];
}

/** '우리의 조합' 해석 조립. */
export function assembleMatch(input: MatchAssembleInput): InterpretationSection[] {
  const { match, myElement, nickname } = input;
  const who = nickname ? `${nickname}님과 ` : "";
  const bond = bondText(match.bond);
  return [
    {
      title: "우리의 온도",
      body: `${who}상대의 조합, 우리의 온도는 ${match.score}°예요. ${scoreLine(match.score)}`,
    },
    {
      title: "기운의 흐름",
      body: `당신은 ${myElement}, 상대는 ${match.partner.element}(${match.partner.dayGanzhi})의 기운이에요. ${RELATION_TEXT[match.elementRelation]}`,
    },
    ...(bond ? [{ title: "인연의 매듭", body: bond }] : []),
    { title: "별이 말하길", body: HARMONY_TEXT[match.zodiacHarmony] },
    { title: `${match.mode}로서 함께할 때`, body: MODE_CLOSING[match.mode] },
  ];
}
