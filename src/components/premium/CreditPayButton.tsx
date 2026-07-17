"use client";

import { useState } from "react";
import { loadTossPayments, ANONYMOUS } from "@tosspayments/tosspayments-sdk";
import { createCreditOrder } from "@/lib/payment/credits-actions";
import type { CreditPackage } from "@/lib/payment/constants";

// 상담 크레딧 패키지 결제 버튼 — PayButton.tsx(이용권)와 동일한 구조. 금액·주문은
// 서버(createCreditOrder)가 만들고, 여기서는 그 주문으로 결제창만 연다.
export default function CreditPayButton({ pkg }: { pkg: CreditPackage }) {
  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const clientKey = process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY;

  if (!clientKey) return null;

  const pay = async () => {
    if (pending) return;
    setPending(true);
    setNotice(null);
    try {
      const order = await createCreditOrder(pkg.id);
      if (!order.ok) {
        setNotice(
          order.reason === "auth"
            ? "로그인이 풀렸어요. 다시 로그인 후 이어볼까요?"
            : "주문을 준비하지 못했어요. 잠시 후 다시 시도해주세요.",
        );
        return;
      }
      const toss = await loadTossPayments(clientKey);
      const payment = toss.payment({ customerKey: ANONYMOUS });
      await payment.requestPayment({
        method: "CARD",
        amount: { currency: "KRW", value: order.amount },
        orderId: order.orderId,
        orderName: pkg.label,
        successUrl: `${window.location.origin}/premium/credits/success`,
        failUrl: `${window.location.origin}/premium/credits/fail`,
      });
    } catch (e) {
      const code = (e as { code?: string })?.code;
      if (code !== "USER_CANCEL") {
        setNotice("결제창을 여는 데 문제가 있었어요. 잠시 후 다시 시도해주세요.");
      }
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="flex flex-col gap-1.5">
      <button
        onClick={pay}
        disabled={pending}
        className="press w-full rounded-card border border-primary-green/30 bg-warm-surface py-3 font-medium text-primary-green disabled:opacity-60"
      >
        {pending ? "결제로 잇는 중…" : `${pkg.label} · ${pkg.price.toLocaleString()}원`}
      </button>
      {notice && (
        <p role="status" className="text-center text-xs text-accent-coral">
          {notice}
        </p>
      )}
    </div>
  );
}
