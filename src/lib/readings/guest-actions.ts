"use server";

// 게스트(비로그인) 풀이 — 로그인이 아니라 "DB에 프로필이 없는 것"이 진짜 잠금 이유였다.
// 온보딩을 마친 게스트는 이미 localStorage(onboarding/draft.ts)에 자기 사주 입력을 들고
// 있으므로, 그걸 그대로 받아 매번 새로 계산한다 — 저장도 캐시도 없다(순수 계산이라 비용 無).
//
// 로그인 경로(readings/actions.ts)와의 결정적 차이: 여기는 respond()/OpenRouterProvider를
// 절대 호출하지 않는다. 총운·상품·궁합 풀이는 이미 있는 3단 해석 엔진의 ①②단계(규칙 계산→
// 템플릿)까지만 게스트에게 열고, ③LLM 개인화는 로그인해야 받는 보너스로 남겨둔다 — 계정 없이
// 공유 LLM 무료 풀을 반복 호출할 수 있는 새 어뷰징 창구를 만들지 않기 위해서다.
import type { Draft } from "@/app/onboarding/draft";
import { computeProfile } from "@/lib/engine/index";
import { computeDeepMatch, isMatchModeSlug, SLUG_TO_MODE } from "@/lib/engine/match";
import { toKstParts } from "@/lib/engine/kst";
import { assembleChongun } from "@/lib/interpret/content/chongun";
import {
  assembleCreditReading, isCreditReadingProduct, type CreditReadingProduct,
} from "@/lib/interpret/content/credit-readings";
import { assembleDeepMatch } from "@/lib/interpret/content/match";
import type { ProfileContext } from "@/lib/engine";
import type { InterpretationSection } from "@/lib/interpret/types";
import type { UnlockResult } from "./actions";

export type GuestReadingResult =
  | { ok: true; ctx: ProfileContext; sections: InterpretationSection[] }
  | { ok: false };

function ageFrom(birthDate: string, now: Date): number {
  const t = toKstParts(now);
  return Math.max(0, t.y - Number(birthDate.slice(0, 4)));
}

function profileFromDraft(draft: Draft): ProfileContext {
  return computeProfile({
    birthDate: draft.birthDate,
    birthTime: draft.timeUnknown ? null : draft.birthTime,
    timeUnknown: draft.timeUnknown,
    ...(draft.gender ? { gender: draft.gender } : {}),
  });
}

/** draft의 보조축 입력(MBTI·혈액형) — 없으면 null(풀이는 그대로 동작). */
function traitsFromDraft(draft: Draft) {
  return { mbti: draft.mbti ?? null, blood: draft.blood ?? null };
}

/** 총운 — 게스트. assembleProfile + 운의 계절, 로그인 경로와 문구 동일(LLM 없음은 원래도 같음). */
export async function computeGuestChongun(draft: Draft): Promise<GuestReadingResult> {
  try {
    const ctx = profileFromDraft(draft);
    const age = ageFrom(draft.birthDate, new Date());
    return {
      ok: true, ctx,
      sections: assembleChongun(ctx, draft.nickname, age, traitsFromDraft(draft)),
    };
  } catch {
    return { ok: false };
  }
}

/** 직업/연애/재물/결혼 풀이 — 게스트. 템플릿 4섹션까지만(LLM 문단은 로그인 전용). */
export async function computeGuestCreditReading(
  productRaw: string,
  draft: Draft,
): Promise<GuestReadingResult> {
  if (!isCreditReadingProduct(productRaw)) return { ok: false };
  const product: CreditReadingProduct = productRaw;
  try {
    const ctx = profileFromDraft(draft);
    const age = ageFrom(draft.birthDate, new Date());
    return {
      ok: true, ctx,
      sections: assembleCreditReading(product, ctx, draft.nickname, age, traitsFromDraft(draft)),
    };
  } catch {
    return { ok: false };
  }
}

/**
 * 궁합 심층 — 게스트. 상대 입력 검증은 로그인 경로(unlockMatchDeep)와 같은 규칙을 그대로 쓴다.
 * 반환 타입을 UnlockResult에 맞춰(readingId 항상 null) MatchDeepForm이 두 경로를 한 방식으로
 * 다룰 수 있게 한다.
 */
export async function computeGuestMatchDeep(
  myDraft: Draft,
  raw: unknown,
): Promise<UnlockResult> {
  if (raw === null || typeof raw !== "object") return { ok: false, reason: "invalid" };
  const d = raw as Record<string, unknown>;
  if (typeof d.birthDate !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(d.birthDate))
    return { ok: false, reason: "invalid" };
  if (typeof d.timeUnknown !== "boolean") return { ok: false, reason: "invalid" };
  let birthTime: string | null = null;
  if (!d.timeUnknown) {
    if (typeof d.birthTime !== "string") return { ok: false, reason: "invalid" };
    const t = /^(\d{2}):(\d{2})$/.exec(d.birthTime);
    if (!t || Number(t[1]) > 23 || Number(t[2]) > 59) return { ok: false, reason: "invalid" };
    birthTime = d.birthTime;
  }
  if (typeof d.mode !== "string" || !isMatchModeSlug(d.mode)) return { ok: false, reason: "invalid" };
  const mode = SLUG_TO_MODE[d.mode];

  try {
    const ctx = profileFromDraft(myDraft);
    const partnerCtx = computeProfile({ birthDate: d.birthDate, birthTime, timeUnknown: d.timeUnknown });
    const match = computeDeepMatch(ctx, partnerCtx, mode);
    const sections = assembleDeepMatch({
      match, myElement: ctx.dayMaster.element, myName: myDraft.nickname, partnerName: "상대",
    });
    return { ok: true, sections, usedCredit: false, remaining: 0, readingId: null };
  } catch {
    return { ok: false, reason: "invalid" };
  }
}
