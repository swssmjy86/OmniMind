import Link from "next/link";

// 존재하지 않는 경로(saju/[product]의 notFound() 포함) — 없으면 브랜드 톤 없는
// 기본 Next 404가 노출된다. 길을 잃어도 따뜻하게 되돌려 보내는 화면.
export default function NotFound() {
  return (
    <main className="fade-rise flex min-h-dvh flex-col items-center justify-center gap-5 px-8 text-center">
      <p className="text-5xl" aria-hidden>
        🌙
      </p>
      <div className="flex flex-col gap-2">
        <h1 className="text-lg font-semibold text-primary-green">
          여긴 아직 길이 닿지 않은 곳이에요
        </h1>
        <p className="text-sm leading-relaxed text-text-soft">
          찾으시던 페이지를 만나지 못했어요.
          <br />
          잠시 숨을 고르고 처음으로 돌아가 볼까요.
        </p>
      </div>
      <Link
        href="/"
        className="press rounded-full bg-accent-coral px-6 py-3 text-sm font-semibold text-on-accent"
      >
        처음으로 돌아가기
      </Link>
    </main>
  );
}
