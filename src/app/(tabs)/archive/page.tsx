import type { Metadata } from "next";
import { createServerSupabase } from "@/lib/supabase/server";
import ArchiveView, { type ArchiveEntry } from "@/components/archive/ArchiveView";
import type { InterpretationRow } from "@/lib/db/types";

export const metadata: Metadata = { title: "보관함 — 옴니마인드" };
export const dynamic = "force-dynamic";

export default async function ArchivePage() {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();

  let entries: ArchiveEntry[] = [];
  if (user) {
    const { data } = await supabase
      .from("interpretations").select("*")
      .eq("user_id", user.id).eq("kind", "daily")
      .order("target_date", { ascending: false }).limit(30)
      .returns<InterpretationRow[]>();
    entries = (data ?? []).map((r) => ({
      id: r.id,
      date: r.target_date ?? "",
      headline: r.body.find((s) => s.title === "오늘의 기운")?.body ?? "",
    }));
  }

  return (
    <main className="fade-rise p-6">
      <h1 className="font-[family-name:var(--font-serif-kr)] text-2xl text-primary-green">
        보관함
      </h1>
      <ArchiveView loggedIn={Boolean(user)} entries={entries} />
    </main>
  );
}
