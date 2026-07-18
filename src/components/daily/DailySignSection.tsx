import Link from "next/link";
import type { YearSign, BranchRelation } from "@/lib/engine/year-sign";
import type { DailyGuide } from "@/lib/interpret/content/daily";
import {
  relationLine, signHeadline, SOLAR_TERM_NOTE, YEAR_STEM_LABEL,
} from "@/lib/interpret/content/year-sign";
import { PERSONAS } from "@/lib/persona/personas";

/** 띠 일진 상세(설계서 §2) — 서버에서 계산된 결과만 받아 그리는 동기 컴포넌트. */
export default function DailySignSection({
  year,
  sign,
  relation,
  guide,
}: {
  year: number;
  sign: YearSign;
  relation: BranchRelation | null;
  guide: DailyGuide;
}) {
  return (
    <section className="persona-card mt-5 rounded-card bg-warm-surface p-6">
      <span aria-hidden className="persona-star" style={{ top: "12%", right: "10%" }} />
      <span aria-hidden className="persona-star" style={{ top: "26%", right: "24%" }} />
      <span aria-hidden className="persona-star" style={{ top: "16%", right: "38%" }} />
      <p className="text-xs text-text-soft">
        <span aria-hidden>🏮</span> {PERSONAS.dalzigi.name} · 오늘의 일진 — 누구나 무료
      </p>

      <h2 className="mt-2 font-[family-name:var(--font-serif-kr)] text-xl text-primary-green">
        {signHeadline(year, sign.animal)}
      </h2>
      <p className="mt-1 text-sm text-text-soft">{sign.ganzhi}년의 기운을 타고났어요.</p>

      {/* 공통 일진 — 기존 assembleDaily 그대로 */}
      <p className="mt-4 font-[family-name:var(--font-serif-kr)] text-lg leading-relaxed text-primary-green">
        {guide.headline}
      </p>
      <p className="mt-3 leading-relaxed text-text-main">{guide.mind}</p>

      {/* 띠 단락 — 년지 × 오늘 일진 지지의 전통 관계 */}
      <p className="mt-3 rounded-card bg-warm-base p-3 text-sm leading-relaxed text-text-main">
        {relationLine(relation)}
      </p>

      {/* 년간 십성 문단 — 일간 기반 심화와 구분되는 라벨을 붙인다(설계서 §2) */}
      {guide.personal && (
        <p className="mt-3 rounded-card bg-warm-base p-3 text-sm leading-relaxed text-text-main">
          {YEAR_STEM_LABEL}, {guide.personal}
        </p>
      )}

      <div className="mt-5 flex gap-2">
        <span className="rounded-full bg-warm-base px-3 py-1.5 text-sm text-text-soft">
          오늘의 색 · {guide.color}
        </span>
        <span className="rounded-full bg-warm-base px-3 py-1.5 text-sm text-text-soft">
          {guide.keyword}
        </span>
      </div>
      <p className="mt-4 text-sm text-text-soft">🍀 행운 포인트 — {guide.lucky}</p>

      <p className="mt-4 text-xs text-text-soft">{SOLAR_TERM_NOTE}</p>

      <Link
        href="/onboarding"
        className="press mt-5 block w-full rounded-card bg-accent-coral py-3.5 text-center font-medium text-white"
      >
        생년월일시로 더 깊이 — 나를 알아보기 ✨
      </Link>
    </section>
  );
}
