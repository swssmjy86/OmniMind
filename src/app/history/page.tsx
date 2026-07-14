import Link from "next/link";
import { createServerSupabase } from "@/lib/supabase/server";
import type { InterpretationRow } from "@/lib/db/types";

export const dynamic = "force-dynamic";

export default async function HistoryPage() {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();

  let rows: InterpretationRow[] = [];
  if (user) {
    const { data } = await supabase
      .from("interpretations").select("*")
      .eq("user_id", user.id).eq("kind", "daily")
      .order("target_date", { ascending: false }).limit(60)
      .returns<InterpretationRow[]>();
    rows = data ?? [];
  }

  return (
    <main className="mx-auto max-w-[480px] p-6 pb-24">
      <Link href="/" className="text-sm text-text-soft">← 홈으로</Link>
      <h1 className="mt-3 font-[family-name:var(--font-serif-kr)] text-2xl text-primary-green">
        지난 이야기
      </h1>
      <p className="mt-2 text-text-soft">지나온 날들의 기운을 다시 만나보세요.</p>

      {rows.length === 0 ? (
        <p className="mt-8 text-center text-text-soft">
          아직 쌓인 이야기가 없어요. 매일 홈에 들르면 하나씩 모여요 🌱
        </p>
      ) : (
        <ul className="mt-6 space-y-3">
          {rows.map((r) => {
            const headline = r.body.find((s) => s.title === "오늘의 기운")?.body ?? "";
            return (
              <li key={r.id} className="rounded-card bg-warm-surface p-4">
                <p className="text-xs text-text-soft">{r.target_date}</p>
                <p className="mt-1 leading-relaxed text-text-main">{headline}</p>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
