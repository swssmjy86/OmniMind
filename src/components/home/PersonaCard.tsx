import Link from "next/link";
import Image from "next/image";
import { PERSONAS, type PersonaId } from "@/lib/persona/personas";
import { PERSONA_IMAGES } from "@/lib/persona/images";
import type { Product } from "@/lib/persona/products";

// 일러스트가 붙기 전 쓰던 CSS 심볼 폴백(§4.3). 배너형 카드에서는 얼굴이 전신컷으로
// 옮겨가면서 원형 배지가 이 상징 글리프를 다시 주인공으로 쓴다. 다른 화면(풀이 입력
// 시트 등)의 아바타 폴백으로도 계속 쓰인다.
export const PERSONA_GLYPHS: Record<PersonaId, string> = {
  dalzigi: "🏮",
  seoon: "📜",
  byeori: "⚒️",
  hongyeon: "🧵",
  yeonri: "🌿",
  onsae: "🪿",
  geumo: "🐦‍⬛",
};

/** 홈 상품 카드 — 페르소나 전신 일러스트가 우측을 채우는 배너형.
 *  5초 CSS 루프(달빛 스윕·별·부유·멘트 페이드인·CTA 펄스)는 그대로 유지한다. */
export default function PersonaCard({ product }: { product: Product }) {
  const persona = PERSONAS[product.personaId];
  const soon = product.status === "soon";

  const inner = (
    <>
      {/* 전신 일러스트 — 카드 우측을 채우고 좌측 가장자리는 카드 배경색으로 녹아든다.
          z -2: 달빛 스윕(::before, z -1)이 일러스트 위·본문 아래를 스치게 하는 층서.
          unoptimized — 이미 webp로 줄여 커밋한 파일이라 Vercel 이미지 최적화 쿼터를
          쓸 이유가 없다(월 고정비 0원 원칙). */}
      <span aria-hidden className="absolute inset-y-0 right-0 z-[-2] w-3/5">
        <Image
          src={PERSONA_IMAGES[persona.id].full}
          alt=""
          fill
          unoptimized
          className="object-cover object-[50%_15%]"
        />
        <span className="absolute inset-0 bg-[linear-gradient(to_right,var(--warm-surface)_0%,color-mix(in_srgb,var(--warm-surface)_55%,transparent)_38%,transparent_66%)]" />
      </span>

      {/* 별 3개 — 장식이라 스크린리더에서 숨긴다 */}
      <span aria-hidden className="persona-star" style={{ top: "14%", right: "12%" }} />
      <span aria-hidden className="persona-star" style={{ top: "30%", right: "28%" }} />
      <span aria-hidden className="persona-star" style={{ top: "18%", right: "42%" }} />

      <div className="flex min-h-44 flex-col p-5">
        <div className="flex items-center gap-4">
          {/* 원형 배지 — 얼굴은 우측 전신컷이 맡으므로 여기는 페르소나 상징 글리프 */}
          <span
            aria-hidden
            className="persona-glyph grid size-14 shrink-0 place-items-center rounded-full bg-warm-base text-2xl"
          >
            {PERSONA_GLYPHS[persona.id]}
          </span>
          <div className="min-w-0">
            <p className="text-[13px] text-text-soft">
              <span>{persona.name}</span> · <span>{persona.title}</span>
            </p>
            <h3 className="mt-0.5 font-[family-name:var(--font-serif-kr)] text-2xl text-primary-green">
              {product.title}
            </h3>
          </div>
        </div>

        {/* 멘트는 진짜 텍스트(§4.3) — 수정 자유·스크린리더·SEO. 블렌딩 구간까지만 뻗는다. */}
        <p className="persona-line mt-4 max-w-[70%] text-[15px] font-medium leading-relaxed text-text-main">
          &ldquo;{persona.homeLine}&rdquo;
        </p>

        <p className="persona-cta mt-auto pt-3 text-right text-[15px] text-moon-gold [text-shadow:0_1px_12px_var(--warm-surface)]">
          {soon ? "곧 만나요" : "풀이 보러 가기 →"}
        </p>
      </div>
    </>
  );

  if (soon) {
    return (
      <div className="persona-card rounded-card bg-warm-surface opacity-60">{inner}</div>
    );
  }
  return (
    <Link
      href={product.href}
      className="persona-card press block rounded-card bg-warm-surface"
    >
      {inner}
    </Link>
  );
}
