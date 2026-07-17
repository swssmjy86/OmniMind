import Link from "next/link";
import { confirmCreditOrder } from "@/lib/payment/credits-actions";

export const dynamic = "force-dynamic";

// 토스 successUrl 랜딩(크레딧 패키지) — 여기서의 서버 승인까지 끝나야 결제가 완성된다.
export default async function CreditSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ paymentKey?: string; orderId?: string; amount?: string }>;
}) {
  const q = await searchParams;
  const amount = Number(q.amount);

  const result =
    q.paymentKey && q.orderId && Number.isFinite(amount)
      ? await confirmCreditOrder(q.paymentKey, q.orderId, amount)
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
          className="press block w-full rounded-card bg-accent-coral py-3.5 font-medium text-white"
        >
          다시 시도하기
        </Link>
      </main>
    );
  }

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 p-6 text-center">
      <h1 className="font-[family-name:var(--font-serif-kr)] text-2xl text-primary-green">
        {result.already ? "이미 이어져 있어요" : "상담 크레딧이 더해졌어요 ✨"}
      </h1>
      <p className="text-text-soft">
        {result.already
          ? `지금 남은 상담 크레딧은 ${result.creditBalance}회예요.`
          : `${result.creditsAdded}회가 더해져, 이제 ${result.creditBalance}회 남았어요.`}
      </p>
      <Link
        href="/mind"
        className="press block w-full rounded-card bg-accent-coral py-3.5 font-medium text-white"
      >
        마음 나누러 가기
      </Link>
    </main>
  );
}
