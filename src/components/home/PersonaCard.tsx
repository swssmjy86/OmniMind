import Link from "next/link";
import Image from "next/image";
import { PERSONAS, type PersonaId } from "@/lib/persona/personas";
import { PERSONA_IMAGES } from "@/lib/persona/images";
import type { Product } from "@/lib/persona/products";

// 일러스트가 붙기 전 쓰던 CSS 심볼 폴백(§4.3). 아바타 일러스트가 들어온 지금도 지우지
// 않는다 — 이미지를 아직 붙이지 않은 화면(풀이 입력 시트 등)이 그대로 쓰고 있고,
// 이미지 로드 실패 시 자리를 지키는 배경 글리프로도 남는다.
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
        {/* 아바타 일러스트. unoptimized — 이미 webp로 줄여 커밋한 파일이라 Vercel 이미지
            최적화 쿼터를 쓸 이유가 없다(월 고정비 0원 원칙). 로드 전·실패 시에는 아래
            글리프가 배경으로 보인다. */}
        <span
          aria-hidden
          className="persona-glyph relative grid size-14 shrink-0 place-items-center overflow-hidden rounded-full bg-warm-base text-2xl"
        >
          {PERSONA_GLYPHS[persona.id]}
          <Image
            src={PERSONA_IMAGES[persona.id].avatar}
            alt=""
            width={56}
            height={56}
            unoptimized
            className="absolute inset-0 size-14 object-cover"
          />
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
