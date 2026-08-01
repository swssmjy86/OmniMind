import Link from "next/link";
import type { ReactNode } from "react";

// "먼저 프로필(여덟 글자)이 필요해요" 온보딩 유도 화면 — 같은 사용자 여정의 같은 분기가
// 6개 탭에 제각각 마크업(카드형 vs 평문형)으로 복붙돼 완성도가 갈리던 것을 하나로 모은다.
// 서버 컴포넌트에서 그대로 렌더 가능(Link + 정적 마크업).
export default function ProfileNeeded({
  title,
  header,
  message,
  note,
  children,
}: {
  /** 간단한 페이지 제목(h1). header를 주면 무시된다. */
  title?: string;
  /** 페이지가 이미 만든 헤더 노드(celeb·saju처럼 공유 헤더를 쓰는 경우). */
  header?: ReactNode;
  /** 온보딩으로 이끄는 안내 문구 — 페이지 맥락에 맞춰 다르게. */
  message: ReactNode;
  /** 본문 아래·CTA 위에 붙는 작은 보조 안내. */
  note?: ReactNode;
  /** 카드 아래 추가 요소(예: 로그아웃). */
  children?: ReactNode;
}) {
  return (
    <main className="fade-rise p-6">
      {header ??
        (title && (
          <h1 className="font-[family-name:var(--font-serif-kr)] text-2xl text-primary-green">
            {title}
          </h1>
        ))}
      <section className="mt-6 rounded-card border border-accent-coral/30 bg-warm-surface p-5">
        <p className="text-text-soft">{message}</p>
        {note && <p className="mt-2 text-xs text-text-soft">{note}</p>}
        <Link
          href="/onboarding"
          className="press mt-4 block w-full rounded-card bg-accent-coral py-3.5 text-center font-medium text-on-accent"
        >
          나를 알아보기 ✨
        </Link>
        {children}
      </section>
    </main>
  );
}
