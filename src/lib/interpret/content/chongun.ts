// 총운 풀이 조립(2단계 스펙 §4) — 순수 템플릿, LLM 없음(항상 동작).
// 본문 = 기존 assembleProfile(해석 축 위계 §3의 검증된 구현) + '운의 계절'(대운) 한 섹션.
// 페르소나 인사는 여기 없다 — 표현 계층은 화면이 렌더하고, 캐시에는 해석만 담는다.
import type { ProfileContext } from "@/lib/engine/index";
import type { InterpretationSection } from "../types";
import type { Voice } from "@/lib/persona/personas";
import { assembleProfile } from "../templates";
import { currentDaeun } from "@/lib/engine/daeun";
import { daeunSeasonText } from "./daeun";

export const SEASON_TITLE = "운의 계절";

// 골격 세 분기(진행 중/첫 대운 이전/성별 미상) × 어미 4갈래 — 내용은 동일, 어미·호칭만 다르다.
const SEASON_SKELETON: Record<Voice, {
  noGender: string;
  before: (when: string) => string;
  current: (ganzhi: string, from: number, to: number) => string;
}> = {
  yo: {
    noGender: "성별을 알려주시면 10년 단위 운의 흐름(대운)까지 읽어드려요. 온보딩에서 이야기를 다시 이어볼 수 있어요.",
    before: (when) => `당신의 첫 대운은 ${when} 무렵부터 시작돼요. 아직은 타고난 결이 자라나는 계절이에요.`,
    current: (g, from, to) => `지금 당신은 ${g} 대운을 지나고 있어요 — ${from}세부터 ${to}세까지, 10년의 큰 계절이에요. `,
  },
  banmal: {
    noGender: "성별을 알려주면 10년 단위 운의 흐름(대운)까지 읽어줄게. 온보딩에서 이야기를 다시 이어가자.",
    before: (when) => `네 첫 대운은 ${when} 무렵부터 시작돼. 아직은 타고난 결이 자라나는 계절이야.`,
    current: (g, from, to) => `지금 너는 ${g} 대운을 지나고 있어 — ${from}세부터 ${to}세까지, 10년의 큰 계절이야. `,
  },
  hao: {
    noGender: "성별을 알려주면 10년 단위 운의 흐름(대운)까지 짚어 보겠소. 온보딩에서 이야기를 다시 이어가 보오.",
    before: (when) => `그대의 첫 대운은 ${when} 무렵부터 시작되오. 아직은 타고난 결이 자라나는 계절이오.`,
    current: (g, from, to) => `지금 그대는 ${g} 대운을 지나고 있소 — ${from}세부터 ${to}세까지, 10년의 큰 계절이오. `,
  },
  jiyo: {
    noGender: "성별을 알려주시면 10년 단위 운의 흐름(대운)까지 읽어드리지요. 온보딩에서 이야기를 다시 이어가 보아요.",
    before: (when) => `당신의 첫 대운은 ${when} 무렵부터 시작되지요. 아직은 타고난 결이 자라나는 계절이지요.`,
    current: (g, from, to) => `지금 당신은 ${g} 대운을 지나고 있지요 — ${from}세부터 ${to}세까지, 10년의 큰 계절이지요. `,
  },
};

/** 운의 계절 본문 — 총운·크레딧 풀이가 함께 쓴다(3a). 세 분기: 진행 중/첫 대운 이전/성별 미상. */
export function daeunSeasonBody(ctx: ProfileContext, age: number | null, voice: Voice = "yo"): string {
  const sk = SEASON_SKELETON[voice];
  if (!ctx.daeun) return sk.noGender;
  const season = age !== null ? currentDaeun(ctx.daeun, age) : null;
  if (!season) {
    const { years, months } = ctx.daeun.startAgePrecise;
    const when = months > 0 ? `${years}세 ${months}개월` : `${years}세`;
    return sk.before(when);
  }
  return `${sk.current(season.ganzhi, season.fromAge, season.toAge)}${daeunSeasonText(season.ganzhi, voice)}`;
}

/** 대운 섹션 — /me와 같은 3분기: 진행 중 / 첫 대운 이전 / 성별 미상(폴백, 항상 동작). */
function seasonSection(ctx: ProfileContext, age: number | null): InterpretationSection {
  return { title: SEASON_TITLE, body: daeunSeasonBody(ctx, age) };
}

/** 총운 섹션 전체 — assembleProfile 뒤에 운의 계절이 붙는다(팔자 주축 순서 유지). */
export function assembleChongun(
  ctx: ProfileContext,
  nickname: string,
  age: number | null,
): InterpretationSection[] {
  return [...assembleProfile(ctx, nickname), seasonSection(ctx, age)];
}
