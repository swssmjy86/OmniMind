"use client";

import { useState } from "react";
import { loadTossPayments, ANONYMOUS } from "@tosspayments/tosspayments-sdk";
import { createOrder } from "@/lib/payment/actions";
import { PASS_ORDER_NAME } from "@/lib/payment/constants";

// 토스 결제창을 여는 버튼. 금액·주문은 서버(createOrder)가 만들고,
// 여기서는 그 주문으로 결제창만 연다 — 클라이언트가 금액을 정하지 않는다.
export default function PayButton() {
  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const clientKey = process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY;

  if (!clientKey) {
    return (
      <p className="text-center text-sm text-text-soft">
        결제 준비를 마무리하고 있어요. 조금만 기다려주세요 🌙
      </p>
    );
  }

  const pay = async () => {
    if (pending) return;
    setPending(true);
    setNotice(null);
    try {
      const order = await createOrder();
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
        orderName: PASS_ORDER_NAME,
        successUrl: `${window.location.origin}/premium/success`,
        failUrl: `${window.location.origin}/premium/fail`,
      });
    } catch (e) {
      // 결제창 닫기(USER_CANCEL)는 오류가 아니다 — 조용히 돌아온다.
      const code = (e as { code?: string })?.code;
      if (code !== "USER_CANCEL") {
        setNotice("결제창을 여는 데 문제가 있었어요. 잠시 후 다시 시도해주세요.");
      }
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <button
        onClick={pay}
        disabled={pending}
        className="w-full rounded-card bg-accent-coral py-3.5 font-medium text-white disabled:opacity-60"
      >
        {pending ? "결제로 잇는 중…" : "30일 이용권 시작하기"}
      </button>
      {notice && (
        <p role="status" className="text-center text-sm text-accent-coral">
          {notice}
        </p>
      )}
    </div>
  );
}
