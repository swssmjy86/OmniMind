"use client";

// 렌더/서버 오류 시 뜨는 전역 에러 경계 — 없으면 브랜드 톤 없는 기본 Next 에러가 노출된다.
// 원인은 감추고, 다시 시도할 여지를 따뜻하게 안내한다.
import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // 개발 중 원인 추적용 — 사용자에겐 원문을 노출하지 않는다.
    console.error(error);
  }, [error]);

  return (
    <main
      className="fade-rise flex min-h-dvh flex-col items-center justify-center gap-5 px-8 text-center"
      role="alert"
    >
      <p className="text-5xl" aria-hidden>
        🌫️
      </p>
      <div className="flex flex-col gap-2">
        <h1 className="text-lg font-semibold text-primary-green">
          잠시 길이 흐려졌어요
        </h1>
        <p className="text-sm leading-relaxed text-text-soft">
          예상치 못한 일이 생겼어요. 잠시 뒤 다시 시도해 주시면 고마워요.
        </p>
      </div>
      <button
        type="button"
        onClick={reset}
        className="press rounded-full bg-accent-coral px-6 py-3 text-sm font-semibold text-on-accent"
      >
        다시 시도하기
      </button>
    </main>
  );
}
