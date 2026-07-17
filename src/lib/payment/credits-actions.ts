"use server";

import { randomUUID } from "crypto";
import { createServerSupabase } from "@/lib/supabase/server";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { recordEvent } from "@/lib/metrics/events";
import { confirmTossPayment } from "./toss";
import { findCreditPackage } from "./constants";
import type { PaymentRow } from "@/lib/db/types";

export type CreateCreditOrderResult =
  | { ok: true; orderId: string; amount: number }
  | { ok: false; reason: "auth" | "invalid-package" | "error" };

/** P8 상담 크레딧 주문 생성 — payments에 kind='credits' pending 행을 남긴다. */
export async function createCreditOrder(packageId: string): Promise<CreateCreditOrderResult> {
  const pkg = findCreditPackage(packageId);
  if (!pkg) return { ok: false, reason: "invalid-package" };

  try {
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { ok: false, reason: "auth" };

    const orderId = `omni_${randomUUID().replace(/-/g, "")}`;
    const admin = createAdminSupabase();
    const { error } = await admin.from("payments").insert({
      user_id: user.id,
      order_id: orderId,
      amount: pkg.price,
      status: "pending",
      kind: "credits",
      credits: pkg.credits,
    });
    if (error) return { ok: false, reason: "error" };
    return { ok: true, orderId, amount: pkg.price };
  } catch {
    return { ok: false, reason: "error" };
  }
}

export type ConfirmCreditOrderResult =
  | { ok: true; creditBalance: number; creditsAdded: number; already: boolean }
  | { ok: false; reason: "auth" | "not-found" | "amount" | "confirm" | "error"; message?: string };

/**
 * 크레딧 결제 승인 — confirmOrder(payment/actions.ts, 이용권용)와 동일한 패턴이다.
 * 부여는 grant_credits_for_order(0008, security definer)가 주문 행 락으로 1회만 수행한다.
 */
export async function confirmCreditOrder(
  paymentKey: string,
  orderId: string,
  amount: number,
): Promise<ConfirmCreditOrderResult> {
  try {
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { ok: false, reason: "auth" };

    const admin = createAdminSupabase();
    const grant = async (credits: number): Promise<number | null> => {
      const { data, error } = await admin.rpc("grant_credits_for_order", {
        p_order: orderId,
        p_credits: credits,
      });
      return !error && typeof data === "number" ? data : null;
    };

    const { data: order } = await admin
      .from("payments").select("*").eq("order_id", orderId).maybeSingle<PaymentRow>();
    if (!order || order.user_id !== user.id || order.kind !== "credits" || !order.credits) {
      return { ok: false, reason: "not-found" };
    }

    if (order.status === "done") {
      if (order.granted_credits != null) {
        return { ok: true, creditBalance: order.granted_credits, creditsAdded: order.credits, already: true };
      }
      const balance = await grant(order.credits); // 부여 누락 자가 복구
      if (balance == null) return { ok: false, reason: "error" };
      return { ok: true, creditBalance: balance, creditsAdded: order.credits, already: true };
    }

    if (order.amount !== amount) return { ok: false, reason: "amount" };

    const confirmed = await confirmTossPayment({ paymentKey, orderId, amount });
    const approvedElsewhere = !confirmed.ok && confirmed.code === "ALREADY_PROCESSED_PAYMENT";
    if (!confirmed.ok && !approvedElsewhere) {
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

    const balance = await grant(order.credits);
    if (balance == null) return { ok: false, reason: "error" };

    if (!approvedElsewhere) await recordEvent("premium_purchase", { amount, kind: "credits" });
    return { ok: true, creditBalance: balance, creditsAdded: order.credits, already: approvedElsewhere };
  } catch {
    return { ok: false, reason: "error" };
  }
}
