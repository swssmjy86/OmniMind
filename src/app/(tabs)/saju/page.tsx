import type { Metadata } from "next";
import { PRODUCTS } from "@/lib/persona/products";
import PersonaCard from "@/components/home/PersonaCard";

export const metadata: Metadata = {
  title: "사주팔자 — 옴니마인드",
  description: "여덟 글자에 담긴 흐름을 여섯 갈래로 — 총운·직업·연애·재물·궁합·결혼.",
};

/** 사주팔자 탭(스펙 §4) — 6종 풀이 목록. 오늘의운세는 전용 탭이 담당한다. */
export default function SajuPage() {
  const items = PRODUCTS.filter((p) => p.id !== "today");
  return (
    <main className="fade-rise p-6">
      <h1 className="font-[family-name:var(--font-serif-kr)] text-2xl text-primary-green">
        사주팔자
      </h1>
      <p className="mt-1 text-sm text-text-soft">
        여덟 글자에 담긴 흐름을 여섯 갈래로 풀어드려요.
      </p>
      <div className="mt-5 flex flex-col gap-3">
        {items.map((p) => (
          <PersonaCard key={p.id} product={p} />
        ))}
      </div>
    </main>
  );
}
