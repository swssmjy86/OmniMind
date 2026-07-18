import { PRODUCTS } from "@/lib/persona/products";
import PersonaCard from "./PersonaCard";

/** 홈 상품 셸프(§4.4) — 오늘의 일진(무료 훅)이 맨 위, 전체 5장. */
export default function ProductShelf() {
  return (
    <section className="mt-8" aria-label="풀이 상품">
      <h2 className="font-[family-name:var(--font-serif-kr)] text-lg text-primary-green">
        밤의 서재
      </h2>
      <p className="mt-1 text-sm text-text-soft">네 명의 안내자가 각자의 풀이를 준비했어요.</p>
      <div className="mt-3 flex flex-col gap-3">
        {PRODUCTS.map((p) => (
          <PersonaCard key={p.id} product={p} />
        ))}
      </div>
    </section>
  );
}
