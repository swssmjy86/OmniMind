import Link from "next/link";
import { PERSONAS, type PersonaId } from "@/lib/persona/personas";
import type { Product } from "@/lib/persona/products";

// 일러스트(webp)가 생기기 전까지의 CSS 심볼 폴백(§4.3) — 배포를 막지 않는다.
// 교체 시 이 글리프 자리에 <img>만 넣으면 된다. 풀이 입력 시트 등 다른 화면도 재사용한다.
export const PERSONA_GLYPHS: Record<PersonaId, string> = {
  dalzigi: "🏮",
  seoon: "📜",
  byeori: "⚒️",
  hongyeon: "🧵",
  yeonri: "🌿",
  onsae: "🪿",
  geumo: "🐦‍⬛",
};

/** 홈 상품 카드 — 5초 CSS 루프(달빛 스윕·별·부유·멘트 페이드인·CTA 펄스). */
export default function PersonaCard({ product }: { product: Product }) {
  const persona = PERSONAS[product.personaId];
  const soon = product.status === "soon";

  const inner = (
    <>
      {/* 별 3개 — 장식이라 스크린리더에서 숨긴다 */}
      <span aria-hidden className="persona-star" style={{ top: "14%", right: "12%" }} />
      <span aria-hidden className="persona-star" style={{ top: "30%", right: "28%" }} />
      <span aria-hidden className="persona-star" style={{ top: "18%", right: "42%" }} />

      <div className="flex items-center gap-4">
        <span
          aria-hidden
          className="persona-glyph grid size-14 shrink-0 place-items-center rounded-full bg-warm-base text-2xl"
        >
          {PERSONA_GLYPHS[persona.id]}
        </span>
        <div className="min-w-0">
          <p className="text-xs text-text-soft">
            <span>{persona.name}</span> · <span>{persona.title}</span>
          </p>
          <h3 className="mt-0.5 font-[family-name:var(--font-serif-kr)] text-lg text-primary-green">
            {product.title}
          </h3>
        </div>
      </div>

      {/* 멘트는 진짜 텍스트(§4.3) — 수정 자유·스크린리더·SEO */}
      <p className="persona-line mt-3 text-sm leading-relaxed text-text-main">
        &ldquo;{persona.homeLine}&rdquo;
      </p>

      <p className="persona-cta mt-3 text-right text-sm text-moon-gold">
        {soon ? "곧 만나요" : "풀이 보러 가기 →"}
      </p>
    </>
  );

  if (soon) {
    return (
      <div className="persona-card rounded-card bg-warm-surface p-5 opacity-60">{inner}</div>
    );
  }
  return (
    <Link
      href={product.href}
      className="persona-card press block rounded-card bg-warm-surface p-5"
    >
      {inner}
    </Link>
  );
}
