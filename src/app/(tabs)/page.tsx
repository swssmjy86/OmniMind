import Link from "next/link";

export default function HomePage() {
  return (
    <main className="p-6">
      <h1 className="font-[family-name:var(--font-serif-kr)] text-2xl text-primary-green">
        오늘의 이야기
      </h1>
      <p className="mt-3 text-text-soft">
        곧 이곳에서 매일의 기운을 전해드릴게요.
      </p>

      <section className="mt-8 rounded-card bg-warm-surface p-6">
        <h2 className="font-[family-name:var(--font-serif-kr)] text-xl text-primary-green">
          흩어진 나의 조각들, 하나로 이어볼까요?
        </h2>
        <p className="mt-2 text-text-soft">
          사주, MBTI, 혈액형, 별자리를 종합해 &lsquo;온전한 나&rsquo;를 만나보세요.
        </p>
        <Link
          href="/onboarding"
          className="mt-5 block w-full rounded-card bg-accent-coral py-3.5 text-center font-medium text-white"
        >
          나를 알아보기 ✨
        </Link>
      </section>
    </main>
  );
}
