// 잠금 화면 공용(P9 §5.1) — 실제 섹션 제목만 공개, 본문은 서버가 만들지도 보내지도 않는다.
export default function ReadingPeek({ titles }: { titles: string[] }) {
  return (
    <div className="mt-5 flex flex-col gap-3" aria-label="잠긴 풀이">
      {titles.map((t) => (
        <div key={t} className="rounded-card bg-warm-surface p-5">
          <p className="flex items-center gap-2 text-sm font-medium text-text-main">
            <span aria-hidden>🔒</span> {t}
          </p>
          <div className="mt-3 space-y-2">
            <div aria-hidden className="teaser-bar h-3 w-11/12 rounded-full bg-text-soft/15 blur-[2px]" />
            <div aria-hidden className="teaser-bar h-3 w-2/3 rounded-full bg-text-soft/15 blur-[2px]" />
          </div>
        </div>
      ))}
    </div>
  );
}
