import Link from "next/link";

export interface ArchiveEntry {
  id: string;
  date: string;     // "YYYY-MM-DD"
  headline: string; // 그날 "오늘의 기운" 한 줄
}

/**
 * 보관함(스펙 §5) — 로그인해야 기록이 쌓인다. 비로그인은 게이트만.
 * 마음·고민 진입은 로그인 화면에만 노출한다(확정 결정 7).
 */
export default function ArchiveView({
  loggedIn,
  entries,
}: {
  loggedIn: boolean;
  entries: ArchiveEntry[];
}) {
  if (!loggedIn) {
    return (
      <section className="mt-8 rounded-card bg-warm-surface p-6 text-center">
        <p aria-hidden className="text-3xl">📦</p>
        <p className="mt-3 leading-relaxed text-text-main">
          기록을 남기고 다시 보려면 로그인이 필요해요.
        </p>
        <p className="mt-1 text-sm text-text-soft">
          오늘의운세와 풀이들이 여기에 차곡차곡 쌓여요.
        </p>
        <Link
          href="/login"
          className="press mt-5 block w-full rounded-card bg-accent-coral py-3.5 font-medium text-white"
        >
          로그인하고 시작하기
        </Link>
      </section>
    );
  }

  return (
    <>
      <section className="mt-6">
        <h2 className="font-[family-name:var(--font-serif-kr)] text-lg text-primary-green">
          오늘의운세 기록
        </h2>
        {entries.length === 0 ? (
          <p className="mt-3 text-sm text-text-soft">
            아직 쌓인 기록이 없어요. 오늘의운세에 매일 들르면 하나씩 모여요 🌱
          </p>
        ) : (
          <ul className="mt-3 space-y-3">
            {entries.map((e) => (
              <li key={e.id} className="rounded-card bg-warm-surface p-4">
                <p className="text-xs text-text-soft">{e.date}</p>
                <p className="mt-1 text-sm leading-relaxed text-text-main">{e.headline}</p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-6">
        <h2 className="font-[family-name:var(--font-serif-kr)] text-lg text-primary-green">
          이어지는 이야기
        </h2>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <Link href="/mind" className="press rounded-card bg-warm-surface p-4 text-center text-sm text-text-main">
            💬 마음 대화
          </Link>
          <Link href="/concern" className="press rounded-card bg-warm-surface p-4 text-center text-sm text-text-main">
            🧭 고민 기록
          </Link>
        </div>
      </section>
    </>
  );
}
