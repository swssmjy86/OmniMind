"use server";

import { createServerSupabase } from "@/lib/supabase/server";
import { readingAccess, UNLIMITED, isPremium } from "@/lib/consult/quota";
import { readingInputHash } from "./hash";
import { ensureCurrentProfile } from "./ensure-profile";
import { parseMatchDeepInput } from "./match-input";
import {
  LLM_SECTION_TITLE, assembleCreditReading, creditReadingPrompt, isCreditReadingProduct,
} from "@/lib/interpret/content/credit-readings";
import { assembleDeepMatch } from "@/lib/interpret/content/match";
import { matchDeepPrompt } from "@/lib/interpret/content/match-deep";
import { respond } from "@/lib/interpret/interpret";
import { OpenRouterProvider } from "@/lib/interpret/openrouter-provider";
import { recordEvent } from "@/lib/metrics/events";
import { currentDaeun } from "@/lib/engine/daeun";
import { toKstParts } from "@/lib/engine/kst";
import { computeProfile, PROFILE_CONTEXT_VERSION } from "@/lib/engine/index";
import { computeDeepMatch } from "@/lib/engine/match";
import type { ProfileRow, ReadingRow } from "@/lib/db/types";
import type { InterpretationSection } from "@/lib/interpret/types";

export type UnlockResult =
  | { ok: true; sections: InterpretationSection[]; usedCredit: boolean; remaining: number }
  | { ok: false; reason: "auth" | "no-profile" | "locked" | "error" | "invalid" };

/**
 * 서버 전용 — unlock 액션들(unlockReading/unlockMatchDeep)의 공용 머니 패스. export는 테스트를 위해서다.
 * 생성 성공본을 캐시하고 성공 시에만 차감한다 — 3a 리뷰로 굳힌 머니 패스(이중 차감 봉쇄).
 * insert 실패(동시 중복) → 먼저 캐시된 행 재사용(무차감, outcome="dedup"). insert 실패(그 외,
 * 예: 마이그레이션 미적용) → 저장 안 된 풀이는 무료로 전달(손실을 회사 쪽으로 고정,
 * outcome="uncached"). insert 성공 → RPC로만 차감(실패 시 재시도 없이 remaining=0, 콘텐츠는
 * 이미 캐시됐으니 에러로 떨어뜨리지 않는다, outcome="charged").
 * recordEvent는 액션별 product 라벨이 필요해 호출부(unlockReading/unlockMatchDeep)에 남긴다 —
 * `outcome`으로 3가지 분기를 구분해 호출부가 기존과 똑같은 이벤트를 낸다(신호는 액션 쪽에 모은다).
 */
export async function cacheAndCharge(args: {
  supabase: Awaited<ReturnType<typeof createServerSupabase>>;
  userId: string;
  product: string;
  hash: string;
  sections: InterpretationSection[];
  consumesCredit: boolean;
  remainingNow: number;
}): Promise<{
  sections: InterpretationSection[];
  usedCredit: boolean;
  remaining: number;
  outcome: "dedup" | "uncached" | "charged";
}> {
  const { supabase, userId, product, hash, sections, consumesCredit, remainingNow } = args;

  const { error: insertError } = await supabase.from("readings").insert({
    user_id: userId, product, input_hash: hash,
    context_version: PROFILE_CONTEXT_VERSION, sections,
  });
  if (insertError) {
    // 동시 요청이 먼저 캐시를 만들었으면 그 행을 재사용 — 재열람 무료 원칙(P9 §6.2), 차감 없음
    const { data: existing } = await supabase
      .from("readings").select("*")
      .eq("user_id", userId).eq("product", product).eq("input_hash", hash)
      .maybeSingle<ReadingRow>();
    if (existing) {
      return { sections: existing.sections, usedCredit: false, remaining: remainingNow, outcome: "dedup" };
    }
    // 캐시 저장 실패(마이그레이션 미적용 등) — 저장 안 된 풀이에 과금하지 않는다.
    // 이번 결과는 무료로 전달(손실 방향을 회사 쪽으로 고정 — 사용자 이중 차감 금지)
    return { sections, usedCredit: false, remaining: remainingNow, outcome: "uncached" };
  }

  // insert 성공 후에만 차감 — 실패해도(네트워크 등) 콘텐츠는 이미 캐시됐으니 에러로 떨어뜨리지 않는다
  let remaining = remainingNow;
  let charged = false;
  if (consumesCredit) {
    try {
      const { data: after } = await supabase.rpc("consume_consult_credit");
      if (typeof after === "number") { remaining = after; charged = true; }
      else remaining = 0; // null = 잔액 경합으로 차감 불발(그 사이 0이 됨) — 실제 잔여는 0
    } catch {
      // 차감 실패 — 콘텐츠는 이미 캐시됨. 재차감 시도는 하지 않고(이중 차감 위험) 기록만 남긴다
    }
  }
  return { sections, usedCredit: charged, remaining, outcome: "charged" };
}

/**
 * 크레딧 풀이 열람(3단계 스펙 §1) — 캐시 히트=무차감, 차감은 유료 LLM 포함 생성 성공 후,
 * LLM 실패=차감·캐시 없이 템플릿본 반환(P9 §12). 레거시 프리미엄=무제한·무차감.
 */
export async function unlockReading(productRaw: string): Promise<UnlockResult> {
  if (!isCreditReadingProduct(productRaw)) return { ok: false, reason: "error" };
  const product = productRaw;

  try {
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { ok: false, reason: "auth" };

    const { data: profile } = await supabase
      .from("profiles").select("*").eq("user_id", user.id).maybeSingle<ProfileRow>();
    if (!profile) return { ok: false, reason: "no-profile" };

    const now = new Date();
    const credits = profile.consult_credits ?? 0;
    const premium = isPremium(profile.premium_until, now);
    const access = readingAccess(product, {
      loggedIn: true, credits, premiumUntil: profile.premium_until, now,
    });
    if (!access.allowed) return { ok: false, reason: "locked" };

    // 구버전 프로필 위에 팔지 않는다(스펙 §2)
    const ctx = await ensureCurrentProfile(supabase, profile);

    const t = toKstParts(now);
    const age = Math.max(0, t.y - Number(profile.birth_date.slice(0, 4)));
    const season = ctx.daeun ? currentDaeun(ctx.daeun, age) : null;
    const hash = readingInputHash(ctx, season?.ganzhi ?? "none");

    const remainingNow = premium ? UNLIMITED : credits;

    // 재열람 무료(P9 §6.2) — 캐시 히트는 차감 없이 그대로
    const { data: cached } = await supabase
      .from("readings").select("*")
      .eq("user_id", user.id).eq("product", product).eq("input_hash", hash)
      .gte("context_version", PROFILE_CONTEXT_VERSION)
      .maybeSingle<ReadingRow>();
    if (cached) {
      return { ok: true, sections: cached.sections, usedCredit: false, remaining: remainingNow };
    }

    const sections = assembleCreditReading(product, ctx, profile.nickname, age);

    // 유료 LLM 개인화 — 실패하면 아래 폴백으로
    const r = await respond(
      {
        profile: ctx, nickname: profile.nickname, history: [],
        message: creditReadingPrompt(product, ctx, sections),
      },
      { template: { chat: async () => "" }, llm: new OpenRouterProvider({ premium: true }) },
    );

    if (r.source === "llm" && r.text) {
      const full = [...sections, { title: LLM_SECTION_TITLE, body: r.text }];
      const out = await cacheAndCharge({
        supabase, userId: user.id, product, hash, sections: full,
        consumesCredit: access.consumesCredit, remainingNow,
      });
      if (out.outcome === "dedup") {
        await recordEvent("reading_unlock", { product, source: "llm", charged: false, dedup: true });
      } else if (out.outcome === "uncached") {
        await recordEvent("reading_unlock", { product, source: "llm", cached: false });
      } else {
        await recordEvent("reading_unlock", { product, source: "llm", charged: out.usedCredit });
      }
      return { ok: true, sections: out.sections, usedCredit: out.usedCredit, remaining: out.remaining };
    }

    // 유료 LLM 실패 — 차감·캐시 없이 템플릿본(P9 §12). 다음 시도에서 재생성된다.
    await recordEvent("reading_unlock", { product, source: "template" });
    return { ok: true, sections, usedCredit: false, remaining: remainingNow };
  } catch {
    return { ok: false, reason: "error" };
  }
}

/** 궁합 심층 열람(3단계 스펙 §5) — 상대 전체 입력 필수, 캐시 키에 상대·모드 포함. */
export async function unlockMatchDeep(raw: unknown): Promise<UnlockResult> {
  const input = parseMatchDeepInput(raw);
  if (!input) return { ok: false, reason: "invalid" };

  try {
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { ok: false, reason: "auth" };

    const { data: profile } = await supabase
      .from("profiles").select("*").eq("user_id", user.id).maybeSingle<ProfileRow>();
    if (!profile) return { ok: false, reason: "no-profile" };

    const now = new Date();
    const credits = profile.consult_credits ?? 0;
    const premium = isPremium(profile.premium_until, now);
    const access = readingAccess("match", {
      loggedIn: true, credits, premiumUntil: profile.premium_until, now,
    });
    if (!access.allowed) return { ok: false, reason: "locked" };

    const ctx = await ensureCurrentProfile(supabase, profile);
    // 상대 ctx — 엔진이 형식·범위를 최종 검증(범위 밖 연도 등은 throw → catch에서 invalid로)
    let partnerCtx;
    try {
      partnerCtx = computeProfile({
        birthDate: input.birthDate, birthTime: input.birthTime,
        timeUnknown: input.timeUnknown, bloodType: input.bloodType, mbti: input.mbti,
      });
    } catch {
      return { ok: false, reason: "invalid" };
    }

    const hash = readingInputHash(
      { me: ctx, partner: { ...input }, mode: input.mode }, "match-deep",
    );
    const remainingNow = premium ? UNLIMITED : credits;

    // 재열람 무료(P9 §6.2) — 캐시 히트는 차감 없이 그대로
    const { data: cached } = await supabase
      .from("readings").select("*")
      .eq("user_id", user.id).eq("product", "match").eq("input_hash", hash)
      .gte("context_version", PROFILE_CONTEXT_VERSION)
      .maybeSingle<ReadingRow>();
    if (cached) {
      return { ok: true, sections: cached.sections, usedCredit: false, remaining: remainingNow };
    }

    const match = computeDeepMatch(ctx, partnerCtx, input.mode);
    const sections = assembleDeepMatch({
      match, myElement: ctx.dayMaster.element,
      myName: profile.nickname, partnerName: "상대",
    });

    // 유료 LLM 개인화 — 실패하면 아래 폴백으로
    const r = await respond(
      { profile: ctx, nickname: profile.nickname, history: [], message: matchDeepPrompt(sections) },
      { template: { chat: async () => "" }, llm: new OpenRouterProvider({ premium: true }) },
    );

    if (r.source === "llm" && r.text) {
      const full = [...sections, { title: LLM_SECTION_TITLE, body: r.text }];
      const out = await cacheAndCharge({
        supabase, userId: user.id, product: "match", hash, sections: full,
        consumesCredit: access.consumesCredit, remainingNow,
      });
      if (out.outcome === "dedup") {
        await recordEvent("reading_unlock", { product: "match", source: "llm", charged: false, dedup: true });
      } else if (out.outcome === "uncached") {
        await recordEvent("reading_unlock", { product: "match", source: "llm", cached: false });
      } else {
        await recordEvent("reading_unlock", { product: "match", source: "llm", charged: out.usedCredit });
      }
      return { ok: true, sections: out.sections, usedCredit: out.usedCredit, remaining: out.remaining };
    }

    // 유료 LLM 실패 — 차감·캐시 없이 템플릿본(P9 §12). 다음 시도에서 재생성된다.
    await recordEvent("reading_unlock", { product: "match", source: "template" });
    return { ok: true, sections, usedCredit: false, remaining: remainingNow };
  } catch {
    return { ok: false, reason: "error" };
  }
}
