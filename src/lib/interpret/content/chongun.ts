// 총운 풀이 조립(2단계 스펙 §4) — 순수 템플릿, LLM 없음(항상 동작).
// 본문 = 기존 assembleProfile(해석 축 위계 §3의 검증된 구현) + '운의 계절'(대운) 한 섹션.
// 페르소나 인사는 여기 없다 — 표현 계층은 화면이 렌더하고, 캐시에는 해석만 담는다.
import type { ProfileContext } from "@/lib/engine/index";
import type { InterpretationSection } from "../types";
import { assembleProfile } from "../templates";
import { currentDaeun } from "@/lib/engine/daeun";
import { daeunSeasonText } from "./daeun";

export const SEASON_TITLE = "운의 계절";

/** 운의 계절 본문 — 총운·크레딧 풀이가 함께 쓴다(3a). 세 분기: 진행 중/첫 대운 이전/성별 미상. */
export function daeunSeasonBody(ctx: ProfileContext, age: number | null): string {
  if (!ctx.daeun) {
    return "성별을 알려주시면 10년 단위 운의 흐름(대운)까지 읽어드려요. 온보딩에서 이야기를 다시 이어볼 수 있어요.";
  }
  const season = age !== null ? currentDaeun(ctx.daeun, age) : null;
  if (!season) {
    return `당신의 첫 대운은 ${ctx.daeun.startAge}세에 시작돼요. 아직은 타고난 결이 자라나는 계절이에요.`;
  }
  return `지금 당신은 ${season.ganzhi} 대운을 지나고 있어요 — ${season.fromAge}세부터 ${season.toAge}세까지, 10년의 큰 계절이에요. ${daeunSeasonText(season.ganzhi)}`;
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
