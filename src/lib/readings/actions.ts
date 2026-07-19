"use server";

import { createServerSupabase } from "@/lib/supabase/server";
import { readingAccess, UNLIMITED, isPremium } from "@/lib/consult/quota";
import { readingInputHash } from "./hash";
import { ensureCurrentProfile } from "./ensure-profile";
import {
  LLM_SECTION_TITLE, assembleCreditReading, creditReadingPrompt, isCreditReadingProduct,
} from "@/lib/interpret/content/credit-readings";
import { respond } from "@/lib/interpret/interpret";
import { OpenRouterProvider } from "@/lib/interpret/openrouter-provider";
import { recordEvent } from "@/lib/metrics/events";
import { currentDaeun } from "@/lib/engine/daeun";
import { toKstParts } from "@/lib/engine/kst";
import { PROFILE_CONTEXT_VERSION } from "@/lib/engine/index";
import type { ProfileRow, ReadingRow } from "@/lib/db/types";
import type { InterpretationSection } from "@/lib/interpret/types";

export type UnlockResult =
  | { ok: true; sections: InterpretationSection[]; usedCredit: boolean; remaining: number }
  | { ok: false; reason: "auth" | "no-profile" | "locked" | "error" };

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
      const { error: insertError } = await supabase.from("readings").insert({
        user_id: user.id, product, input_hash: hash,
        context_version: PROFILE_CONTEXT_VERSION, sections: full,
      });
      if (insertError) {
        // 동시 요청이 먼저 캐시를 만들었으면 그 행을 재사용 — 재열람 무료 원칙(P9 §6.2), 차감 없음
        const { data: existing } = await supabase
          .from("readings").select("*")
          .eq("user_id", user.id).eq("product", product).eq("input_hash", hash)
          .maybeSingle<ReadingRow>();
        if (existing) {
          return { ok: true, sections: existing.sections, usedCredit: false, remaining: remainingNow };
        }
        // 캐시 저장 실패(마이그레이션 미적용 등) — 저장 안 된 풀이에 과금하지 않는다.
        // 이번 결과는 무료로 전달(손실 방향을 회사 쪽으로 고정 — 사용자 이중 차감 금지)
        await recordEvent("reading_unlock", { product, source: "llm", cached: false });
        return { ok: true, sections: full, usedCredit: false, remaining: remainingNow };
      }

      // insert 성공 후에만 차감 — 실패해도(네트워크 등) 콘텐츠는 이미 캐시됐으니 에러로 떨어뜨리지 않는다
      let remaining = remainingNow;
      let charged = false;
      if (access.consumesCredit) {
        try {
          const { data: after } = await supabase.rpc("consume_consult_credit");
          if (typeof after === "number") { remaining = after; charged = true; }
          else remaining = 0; // null = 잔액 경합으로 차감 불발(그 사이 0이 됨) — 실제 잔여는 0
        } catch {
          // 차감 실패 — 콘텐츠는 이미 캐시됨. 재차감 시도는 하지 않고(이중 차감 위험) 기록만 남긴다
        }
      }
      await recordEvent("reading_unlock", { product, source: "llm", charged });
      return { ok: true, sections: full, usedCredit: charged, remaining };
    }

    // 유료 LLM 실패 — 차감·캐시 없이 템플릿본(P9 §12). 다음 시도에서 재생성된다.
    await recordEvent("reading_unlock", { product, source: "template" });
    return { ok: true, sections, usedCredit: false, remaining: remainingNow };
  } catch {
    return { ok: false, reason: "error" };
  }
}
