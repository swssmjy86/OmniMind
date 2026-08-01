"use server";

import { computeDaily } from "@/lib/engine/daily";
import { toKstParts } from "@/lib/engine/kst";
import {
  assembleConcern, concernPrompt, isConcernCategory,
} from "@/lib/interpret/content/concern";
import { respond } from "@/lib/interpret/interpret";
import type { ProfileContext } from "@/lib/engine";
import type { InterpretationSection } from "@/lib/interpret/types";
import { CONCERN_MAX_LENGTH } from "./constants";

export type ConcernResult =
  | { ok: true; sections: InterpretationSection[]; source: "llm" | "template" }
  | { ok: false };

/**
 * 고민 입력 → 프로필+오늘 운기 종합 조언(익명 로컬). 템플릿이 항상 답하고, LLM이 가능하면
 * '당신에게' 문단을 더한다. 저장·계정·쿼터 없음 — 기록은 클라이언트(localStorage)가 관리한다.
 * 이 액션은 계산 + LLM 프록시 역할만 한다(무료 티어 모델).
 */
export async function submitConcern(args: {
  profile: ProfileContext;
  nickname: string;
  category: string;
  concern: string;
}): Promise<ConcernResult> {
  const concern = args.concern.trim().slice(0, CONCERN_MAX_LENGTH);
  if (!concern || !isConcernCategory(args.category)) return { ok: false };

  try {
    const t = toKstParts(new Date());
    const daily = computeDaily(
      { y: t.y, mo: t.mo, d: t.d },
      args.profile.dayMaster.element,
      args.profile.dayMaster.stem,
    );
    const input = {
      profile: args.profile,
      daily,
      category: args.category,
      nickname: args.nickname,
    };
    const sections: InterpretationSection[] = [
      { title: "고민", body: concern },
      ...assembleConcern(input),
    ];

    // LLM 개인화 — 실패하면 빈 문자열 템플릿으로 떨어져 조용히 생략된다.
    const r = await respond(
      {
        profile: args.profile,
        nickname: args.nickname,
        history: [],
        message: concernPrompt(input, concern),
      },
      { template: { chat: async () => "" } },
    );
    const source: "llm" | "template" = r.source === "llm" && r.text ? "llm" : "template";
    if (source === "llm") sections.push({ title: "당신에게", body: r.text });

    return { ok: true, sections, source };
  } catch {
    return { ok: false };
  }
}
