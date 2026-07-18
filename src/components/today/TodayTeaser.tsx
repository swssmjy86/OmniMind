import Link from "next/link";

// 잠긴 카드 목록(스펙 §3) — 제목·설명만 있고 본문은 서버가 아예 만들지 않는다(P9 §5.1).
// 블러 느낌은 CSS 자리표시자 막대로만 낸다.
const TEASERS = [
  { title: "내 일간으로 본 오늘", desc: "타고난 기운과 오늘이 만나는 결" },
  { title: "내 띠와 오늘", desc: "내 띠와 오늘 일진이 맺는 관계" },
  { title: "AI가 다듬은 오늘의 이야기", desc: "당신만을 위해 다듬은 문장" },
] as const;

/** 무료 화면의 블러 티저 — 정적. 개인화 내용은 이 컴포넌트 어디에도 없다. */
export default function TodayTeaser() {
  return (
    <section className="mt-4" aria-label="잠긴 풀이">
      <div className="flex flex-col gap-3">
        {TEASERS.map((t) => (
          <div key={t.title} className="rounded-card bg-warm-surface p-5">
            <p className="flex items-center gap-2 text-sm font-medium text-text-main">
              <span aria-hidden>🔒</span> {t.title}
            </p>
            <p className="mt-1 text-xs text-text-soft">{t.desc}</p>
            <div className="mt-3 space-y-2">
              <div aria-hidden className="teaser-bar h-3 w-11/12 rounded-full bg-text-soft/15 blur-[2px]" />
              <div aria-hidden className="teaser-bar h-3 w-4/5 rounded-full bg-text-soft/15 blur-[2px]" />
              <div aria-hidden className="teaser-bar h-3 w-2/3 rounded-full bg-text-soft/15 blur-[2px]" />
            </div>
          </div>
        ))}
      </div>
      <Link
        href="/login"
        className="press mt-4 block w-full rounded-card bg-accent-coral py-3.5 text-center font-medium text-white"
      >
        로그인하고 모두 열어보기 ✨
      </Link>
      <p className="mt-2 text-center text-xs text-text-soft">
        로그인하면 기록이 보관함에 차곡차곡 쌓여요.
      </p>
    </section>
  );
}
