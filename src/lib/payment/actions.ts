"use server";

import { randomUUID } from "crypto";
import { createServerSupabase } from "@/lib/supabase/server";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { recordEvent } from "@/lib/metrics/events";
import { confirmTossPayment } from "./toss";
import { PASS_PRICE, PASS_DAYS } from "./constants";
import type { PaymentRow } from "@/lib/db/types";

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
 * 결제 승인 — successUrl 파라미터를 검증하고 토스 confirm 후 프리미엄을 부여한다.
 *
 * 부여는 grant_premium_for_order(0007, security definer)가 주문 행 락으로 1회만 수행:
 * - 새로고침·중복 탭의 재승인 요청은 이미 부여된 값을 그대로 받는다(멱등)
 * - 승인은 됐는데 부여가 누락된 주문(done + granted_until null)은 재호출로 자가 복구된다
 * - 서로 다른 주문의 동시 부여도 단일 SQL UPDATE라 연장이 유실되지 않는다
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
    const grant = async (): Promise<string | null> => {
      const { data, error } = await admin.rpc("grant_premium_for_order", {
        p_order: orderId,
        p_days: PASS_DAYS,
      });
      return !error && typeof data === "string" ? data : null;
    };

    const { data: order } = await admin
      .from("payments").select("*").eq("order_id", orderId).maybeSingle<PaymentRow>();
    // 주문이 없거나 남의 주문이면 동일하게 not-found (존재 여부를 흘리지 않는다)
    if (!order || order.user_id !== user.id) return { ok: false, reason: "not-found" };

    if (order.status === "done") {
      if (order.granted_until) return { ok: true, premiumUntil: order.granted_until, already: true };
      const until = await grant(); // 부여 누락 자가 복구
      if (!until) return { ok: false, reason: "error" };
      return { ok: true, premiumUntil: until, already: true };
    }

    // 금액의 진실은 서버가 만든 pending 행 — 쿼리스트링 변조를 여기서 차단
    if (order.amount !== amount) return { ok: false, reason: "amount" };

    // failed 행도 재승인을 시도한다 — 네트워크 오류로 failed 처리됐지만 토스는 승인한 경우,
    // 재요청 시 ALREADY_PROCESSED_PAYMENT가 와서 아래에서 done으로 복구된다.
    const confirmed = await confirmTossPayment({ paymentKey, orderId, amount });
    const approvedElsewhere = !confirmed.ok && confirmed.code === "ALREADY_PROCESSED_PAYMENT";
    if (!confirmed.ok && !approvedElsewhere) {
      // 완료된 행은 절대 덮지 않는다(동시 요청 경합에서 done 보호)
      await admin.from("payments")
        .update({ status: "failed", raw: { code: confirmed.code, message: confirmed.message } })
        .eq("order_id", orderId).neq("status", "done");
      return { ok: false, reason: "confirm", message: confirmed.message };
    }

    await admin.from("payments")
      .update({
        status: "done",
        payment_key: paymentKey,
        raw: confirmed.ok ? confirmed.raw : { code: "ALREADY_PROCESSED_PAYMENT" },
        approved_at: new Date().toISOString(),
      })
      .eq("order_id", orderId).neq("status", "done");

    const until = await grant();
    // 실패해도 주문은 done + granted_until null로 남아, 다음 확인에서 자가 복구된다
    if (!until) return { ok: false, reason: "error" };

    if (!approvedElsewhere) await recordEvent("premium_purchase", { amount });
    return { ok: true, premiumUntil: until, already: approvedElsewhere };
  } catch {
    return { ok: false, reason: "error" };
  }
}
