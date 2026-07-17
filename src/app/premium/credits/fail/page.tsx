import Link from "next/link";

export const dynamic = "force-dynamic";

// 토스 failUrl 랜딩(크레딧 패키지) — 인증 단계에서 중단·실패한 경우라 돈은 나가지 않았다.
// 쿼리스트링(code/message)은 누구나 링크로 조작할 수 있는 외부 문자열이라 화면에 반영하지 않는다.
export default async function CreditFailPage() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 p-6 text-center">
      <h1 className="font-[family-name:var(--font-serif-kr)] text-2xl text-primary-green">
        결제가 이어지지 못했어요
      </h1>
      <p className="text-text-soft">
        괜찮아요, 결제된 금액은 없어요. 마음이 준비되면 언제든 다시 이어볼 수 있어요.
      </p>
      <Link
        href="/premium"
        className="press block w-full rounded-card bg-accent-coral py-3.5 font-medium text-white"
      >
        다시 시도하기
      </Link>
      <Link href="/mind" className="text-sm text-text-soft underline underline-offset-4">
        마음으로 돌아가기
      </Link>
    </main>
  );
}
