import type { ReviewSummary } from "@/lib/reviews/summary";

/** 후기 노출(4단계 스펙 §3) — summary가 없으면(조건 미달·조회 실패) 아무것도 렌더하지 않는다. */
export default function ReviewHighlights({
  summary,
  heading,
  sub,
}: {
  summary: ReviewSummary | null;
  heading: string;
  sub?: string;
}) {
  if (!summary) return null;
  return (
    <section className="mt-8" aria-label={heading}>
      <h2 className="font-[family-name:var(--font-serif-kr)] text-lg text-primary-green">
        {heading}
      </h2>
      {sub && <p className="mt-1 text-sm text-text-soft">{sub}</p>}
      <p className="mt-2 text-sm text-text-main">
        <span aria-hidden className="text-moon-gold">★</span> {summary.avg.toFixed(1)}
        <span className="ml-2 text-text-soft">후기 {summary.count}개</span>
      </p>
      <div className="mt-3 flex flex-col gap-2">
        {summary.comments.map((c) => (
          <div key={`${c.date}-${c.comment}`} className="rounded-card bg-warm-surface p-4">
            <p className="text-sm leading-relaxed text-text-main">{c.comment}</p>
            <p className="mt-1 text-xs text-text-soft">{c.date}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
