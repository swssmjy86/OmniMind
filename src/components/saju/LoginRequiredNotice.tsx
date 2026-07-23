import Link from "next/link";

/**
 * 비로그인 풀이 안내 — GUEST_READING_ACCESS가 꺼져 있을 때의 폴백(현재는 켜져 있어
 * 게스트도 입력 시트로 풀이를 본다). 블러 잠금 화면 대신 담백한 문구 + 로그인 CTA만
 * 보여준다(§P3 "블러 기능 삭제" 결정).
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
