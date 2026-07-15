"use server";

import { randomUUID } from "crypto";
import { createServerSupabase } from "@/lib/supabase/server";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { recordEvent } from "@/lib/metrics/events";
import { confirmTossPayment } from "./toss";
import { extendPremium } from "./period";
import { PASS_PRICE } from "./constants";

export type CreateOrderResult =
  | { ok: true; orderId: string; amount: number }
  | { ok: false; reason: "auth" | "error" };

/** 주문 생성 — payments에 pending 행을 남기고 orderId를 돌려준다(금액의 진실은 서버 기록). */
export async function createOrder(): Promise<CreateOrderResult> {
  try {
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { ok: false, reason: "auth" };

    const orderId = `omni_${randomUUID().replace(/-/g, "")}`; // 토스 규격: 6~64자 [a-zA-Z0-9_-]
    const admin = createAdminSupabase();
    const { error } = await admin.from("payments").insert({
      user_id: user.id,
      order_id: orderId,
      amount: PASS_PRICE,
      status: "pending",
    });
    if (error) return { ok: false, reason: "error" };
    return { ok: true, orderId, amount: PASS_PRICE };
  } catch {
    return { ok: false, reason: "error" };
  }
}

export type ConfirmOrderResult =
  | { ok: true; premiumUntil: string; already: boolean }
  | { ok: false; reason: "auth" | "not-found" | "amount" | "confirm" | "error"; message?: string };

/**
 * 결제 승인 — successUrl 파라미터를 검증하고 토스 confirm 후 premium_until을 연장한다.
 * 같은 주문의 재승인 요청(새로고침)은 이미 처리된 결과를 그대로 돌려준다(멱등).
 */
export async function confirmOrder(
  paymentKey: string,
  orderId: string,
  amount: number,
): Promise<ConfirmOrderResult> {
  try {
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { ok: false, reason: "auth" };

    const admin = createAdminSupabase();
    const { data: order } = await admin
      .from("payments").select("*").eq("order_id", orderId).maybeSingle();
    // 주문이 없거나 남의 주문이면 동일하게 not-found (존재 여부를 흘리지 않는다)
    if (!order || order.user_id !== user.id) return { ok: false, reason: "not-found" };

    if (order.status === "done") {
      const { data: p } = await admin
        .from("profiles").select("premium_until").eq("user_id", user.id).maybeSingle();
      return { ok: true, premiumUntil: p?.premium_until ?? "", already: true };
    }

    // 금액의 진실은 서버가 만든 pending 행 — 쿼리스트링 변조를 여기서 차단
    if (order.amount !== amount) return { ok: false, reason: "amount" };

    const confirmed = await confirmTossPayment({ paymentKey, orderId, amount });
    if (!confirmed.ok) {
      await admin.from("payments")
        .update({ status: "failed", raw: { code: confirmed.code, message: confirmed.message } })
        .eq("order_id", orderId);
      return { ok: false, reason: "confirm", message: confirmed.message };
    }

    const now = new Date();
    const { data: profile } = await admin
      .from("profiles").select("premium_until").eq("user_id", user.id).maybeSingle();
    const premiumUntil = extendPremium(profile?.premium_until ?? null, now);

    const { error: upErr } = await admin.from("profiles")
      .update({ premium_until: premiumUntil }).eq("user_id", user.id);
    if (upErr) {
      // 승인은 됐는데 부여가 실패한 상태 — raw를 남겨 CS로 복구 가능하게 한다
      await admin.from("payments")
        .update({ status: "done", payment_key: paymentKey, raw: confirmed.raw, approved_at: now.toISOString() })
        .eq("order_id", orderId);
      return { ok: false, reason: "error" };
    }
    await admin.from("payments")
      .update({ status: "done", payment_key: paymentKey, raw: confirmed.raw, approved_at: now.toISOString() })
      .eq("order_id", orderId);

    await recordEvent("premium_purchase", { amount });
    return { ok: true, premiumUntil, already: false };
  } catch {
    return { ok: false, reason: "error" };
  }
}
