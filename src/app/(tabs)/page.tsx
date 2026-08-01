import Link from "next/link";
import Image from "next/image";
import { PRODUCTS } from "@/lib/persona/products";
import { PERSONA_IMAGES } from "@/lib/persona/images";
import { PERSONA_GLYPHS } from "@/components/home/PersonaCard";
import HomeGreeting from "@/components/home/HomeGreeting";
import CheerWall from "@/components/cheer/CheerWall";
import { FAQ_ITEMS } from "@/app/faq/page";
import AdSlot from "@/components/ads/AdSlot";

/**
 * 홈 — 6종 풀이 그리드(→ 사주팔자 탭) + FAQ 발췌. 인사·함께한 날수·오늘의운세 유도는
 * 로컬 프로필을 읽는 HomeGreeting(클라이언트)이 맡는다. 마음·고민 진입은 홈에 없다.
 */
export default function HomePage() {
  const grid = PRODUCTS.filter((p) => p.id !== "today");

  return (
    <main className="fade-rise p-6">
      <HomeGreeting />

      {/* 6종 풀이 그리드 — 클릭하면 사주팔자 탭으로 */}
      <section className="mt-8" aria-label="풀이 종류">
        <div className="grid grid-cols-2 gap-3">
          {grid.map((p) => (
            <Link
              key={p.id}
              href="/saju"
              className="press flex items-center justify-between gap-3 rounded-card border border-text-soft/20 bg-warm-surface p-4"
            >
              <div className="min-w-0">
                <p className="font-[family-name:var(--font-serif-kr)] text-lg text-primary-green">
                  {p.title}
                </p>
                <p className="mt-1 text-xs text-text-soft">{p.tagline}</p>
              </div>
              <span
                aria-hidden
                className="relative grid size-11 shrink-0 place-items-center overflow-hidden rounded-full bg-warm-base text-xl"
              >
                {PERSONA_GLYPHS[p.personaId]}
                <Image
                  src={PERSONA_IMAGES[p.personaId].avatar}
                  alt=""
                  width={44}
                  height={44}
                  unoptimized
                  className="absolute inset-0 size-11 object-cover"
                />
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* 자주묻는질문 발췌 3문항 */}
      <section className="mt-8" aria-label="자주 묻는 질문">
        <h2 className="font-[family-name:var(--font-serif-kr)] text-lg text-primary-green">
          자주 묻는 질문
        </h2>
        <div className="mt-3 flex flex-col gap-2">
          {FAQ_ITEMS.slice(0, 3).map((item) => (
            <details key={item.q} className="rounded-card border border-text-soft/20 bg-warm-surface p-4">
              <summary className="cursor-pointer text-sm font-medium text-text-main">
                {item.q}
              </summary>
              <p className="mt-2 text-sm leading-relaxed text-text-soft">{item.a}</p>
            </details>
          ))}
        </div>
        <Link href="/faq" className="mt-3 block text-center text-sm text-text-soft underline">
          전체 질문 보기
        </Link>
      </section>

      <CheerWall />

      <AdSlot />
    </main>
  );
}
