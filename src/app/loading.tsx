// 서버 데이터 조회 중 뜨는 전역 로딩 화면 — 없으면 네비게이션 중 빈 화면이 노출된다.
// 브랜드 톤(달빛 골드 점 세 개가 은은히 숨 쉬는)으로, "기다림"도 따뜻하게.
export default function Loading() {
  return (
    <main
      className="flex min-h-dvh flex-col items-center justify-center gap-4 px-6"
      role="status"
      aria-live="polite"
    >
      <div className="flex gap-2" aria-hidden>
        <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-moon-gold [animation-delay:0ms]" />
        <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-moon-gold [animation-delay:200ms]" />
        <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-moon-gold [animation-delay:400ms]" />
      </div>
      <p className="text-sm text-text-soft">잠시만요, 마음을 살피는 중이에요…</p>
    </main>
  );
}
