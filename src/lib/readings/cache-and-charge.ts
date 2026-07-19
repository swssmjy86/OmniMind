// 서버 전용 — unlock 액션들(unlockReading/unlockMatchDeep)의 공용 머니 패스.
// "use server" 파일(actions.ts)에 두면 export가 네트워크 노출 액션이 되므로(최종 리뷰 지적)
// 일반 모듈로 분리한다 — 여기 export는 액션 내부 재사용과 단위 테스트만을 위한 것이다.
//
// 생성 성공본을 캐시하고 성공 시에만 차감한다 — 3a 리뷰로 굳힌 머니 패스(이중 차감 봉쇄).
// insert 실패(동시 중복) → 먼저 캐시된 행 재사용(무차감, outcome="dedup"). insert 실패(그 외,
// 예: 마이그레이션 미적용) → 저장 안 된 풀이는 무료로 전달(손실을 회사 쪽으로 고정,
// outcome="uncached"). insert 성공 → RPC로만 차감(실패 시 재시도 없이 remaining=0, 콘텐츠는
// 이미 캐시됐으니 에러로 떨어뜨리지 않는다, outcome="charged").
// recordEvent는 액션별 product 라벨이 필요해 호출부(unlockReading/unlockMatchDeep)에 남긴다 —
// `outcome`으로 3가지 분기를 구분해 호출부가 기존과 똑같은 이벤트를 낸다(신호는 액션 쪽에 모은다).
import type { createServerSupabase } from "@/lib/supabase/server";
import { PROFILE_CONTEXT_VERSION } from "@/lib/engine/index";
import type { ReadingRow } from "@/lib/db/types";
import type { InterpretationSection } from "@/lib/interpret/types";

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
