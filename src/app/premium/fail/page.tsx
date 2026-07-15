import Link from "next/link";

export const dynamic = "force-dynamic";

// 토스 failUrl 랜딩 — 인증 단계에서 중단·실패한 경우라 돈은 나가지 않았다.
export default async function PaymentFailPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string; message?: string }>;
}) {
  const q = await searchParams;
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 p-6 text-center">
      <h1 className="font-[family-name:var(--font-serif-kr)] text-2xl text-primary-green">
        결제가 이어지지 못했어요
      </h1>
      <p className="text-text-soft">
        괜찮아요, 결제된 금액은 없어요. 마음이 준비되면 언제든 다시 이어볼 수 있어요.
      </p>
      {q.message && <p className="text-xs text-text-soft/70">({q.message})</p>}
      <Link
        href="/premium"
        className="block w-full rounded-card bg-accent-coral py-3.5 font-medium text-white"
      >
        다시 시도하기
      </Link>
      <Link href="/mind" className="text-sm text-text-soft underline underline-offset-4">
        마음으로 돌아가기
      </Link>
    </main>
  );
}
