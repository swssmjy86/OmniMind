import Link from "next/link";

/**
 * 비로그인 풀이 안내 — 총운·사주상품·궁합 심층은 로그인 전용(GUEST_READING_ACCESS=false).
 * 블러 잠금 화면 대신 담백한 문구 + 로그인 CTA만 보여준다(§P3 "블러 기능 삭제" 결정).
 */
export default function LoginRequiredNotice({ message }: { message: string }) {
  return (
    <section className="mt-6 rounded-card border border-accent-coral/30 bg-warm-surface p-5">
      <p className="text-text-soft">
        {message} 먼저 <span className="text-text-main">로그인</span>이 필요해요.
      </p>
      <Link
        href="/login"
        className="press mt-4 block w-full rounded-card bg-accent-coral py-3.5 text-center font-medium text-white"
      >
        로그인하고 시작하기 ✨
      </Link>
    </section>
  );
}
