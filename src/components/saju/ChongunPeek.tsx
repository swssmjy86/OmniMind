import Link from "next/link";

// 총운 엿보기(2단계 스펙 §5) — 비로그인용. 제목·한 줄 소개만 공개하고 본문은 서버가
// 아예 만들지 않는다(P9 §5.1). 티저는 일반 소개다 — 프로필이 없어 개인화 티저는 불가능.
const PEEKS = [
  { title: "타고난 그릇", desc: "당신을 이루는 첫 글자, 일간의 결" },
  { title: "오행의 풍경", desc: "다섯 기운이 그리는 나만의 지형" },
  { title: "재능의 흐름", desc: "십성이 알려주는 재능과 관계의 방향" },
  { title: "운의 계절", desc: "10년 단위로 흐르는 큰 계절, 대운" },
] as const;

/** 비로그인 총운 엿보기 — 잠긴 카드 4장 + 로그인 CTA. */
export default function ChongunPeek() {
  return (
    <section className="mt-5" aria-label="잠긴 총운 풀이">
      <div className="flex flex-col gap-3">
        {PEEKS.map((p) => (
          <div key={p.title} className="rounded-card bg-warm-surface p-5">
            <p className="flex items-center gap-2 text-sm font-medium text-text-main">
              <span aria-hidden>🔒</span> {p.title}
            </p>
            <p className="mt-1 text-xs text-text-soft">{p.desc}</p>
            <div className="mt-3 space-y-2">
              <div aria-hidden className="teaser-bar h-3 w-11/12 rounded-full bg-text-soft/15 blur-[2px]" />
              <div aria-hidden className="teaser-bar h-3 w-3/4 rounded-full bg-text-soft/15 blur-[2px]" />
            </div>
          </div>
        ))}
      </div>
      <Link
        href="/login"
        className="press mt-4 block w-full rounded-card bg-accent-coral py-3.5 text-center font-medium text-white"
      >
        로그인하고 무료로 열람 ✨
      </Link>
      <p className="mt-2 text-center text-xs text-text-soft">
        총운은 로그인만 하면 무료예요. 열어본 풀이는 보관함에 남아요.
      </p>
    </section>
  );
}
