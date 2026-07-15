import Link from "next/link";
import { confirmOrder } from "@/lib/payment/actions";
import { toKstParts } from "@/lib/engine/kst";

export const dynamic = "force-dynamic";

// 토스 successUrl 랜딩 — 여기서의 서버 승인(confirmOrder)까지 끝나야 결제가 완성된다.
export default async function PaymentSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ paymentKey?: string; orderId?: string; amount?: string }>;
}) {
  const q = await searchParams;
  const amount = Number(q.amount);

  const result =
    q.paymentKey && q.orderId && Number.isFinite(amount)
      ? await confirmOrder(q.paymentKey, q.orderId, amount)
      : ({ ok: false, reason: "not-found" } as const);

  if (!result.ok) {
    const message =
      result.reason === "auth"
        ? "로그인이 풀렸어요. 다시 로그인하면 결제 확인을 이어갈 수 있어요."
        : result.reason === "confirm" && "message" in result && result.message
          ? result.message
          : "결제 확인에 문제가 있었어요. 결제가 이뤄졌다면 금액은 안전하게 보호되니, 잠시 후 다시 확인해주세요.";
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center gap-6 p-6 text-center">
        <h1 className="font-[family-name:var(--font-serif-kr)] text-2xl text-primary-green">
          조금 어긋났어요
        </h1>
        <p className="text-text-soft">{message}</p>
        <Link
          href="/premium"
          className="block w-full rounded-card bg-accent-coral py-3.5 font-medium text-white"
        >
          다시 시도하기
        </Link>
      </main>
    );
  }

  // 부여 로직상 항상 유효한 ISO여야 하지만, 깨진 값으로 NaN 날짜를 보여주느니 날짜만 생략한다
  const ts = new Date(result.premiumUntil).getTime();
  const t = Number.isFinite(ts) ? toKstParts(new Date(result.premiumUntil)) : null;
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 p-6 text-center">
      <h1 className="font-[family-name:var(--font-serif-kr)] text-2xl text-primary-green">
        {result.already ? "이미 이어져 있어요" : "마음이 이어졌어요 ✨"}
      </h1>
      <p className="text-text-soft">
        {t
          ? `${t.y}년 ${t.mo}월 ${t.d}일까지, 마음 이야기를 제한 없이 나눌 수 있어요.`
          : "마음 이야기를 제한 없이 나눌 수 있어요."}
      </p>
      <Link
        href="/mind"
        className="block w-full rounded-card bg-accent-coral py-3.5 font-medium text-white"
      >
        마음 나누러 가기
      </Link>
    </main>
  );
}
