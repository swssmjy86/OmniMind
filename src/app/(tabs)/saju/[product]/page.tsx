import { notFound } from "next/navigation";
import type { Metadata } from "next";
import {
  isCreditReadingProduct,
} from "@/lib/interpret/content/credit-readings";
import { PRODUCTS } from "@/lib/persona/products";
import { PERSONAS } from "@/lib/persona/personas";
import { PERSONA_IMAGES } from "@/lib/persona/images";
import { PERSONA_GLYPHS } from "@/components/home/PersonaCard";
import GuestReadingView from "@/components/saju/GuestReadingView";
import PersonaImageIntro from "@/components/persona/PersonaImageIntro";

export const metadata: Metadata = { title: "사주 풀이 — 옴니마인드" };

/** 크레딧 풀이 4종 — 익명 로컬. 입력 시트로 사주를 받아 즉시 계산해 보여준다. */
export default async function CreditReadingPage({
  params,
}: {
  params: Promise<{ product: string }>;
}) {
  const { product } = await params;
  if (!isCreditReadingProduct(product)) notFound();

  const meta = PRODUCTS.find((p) => p.id === product)!;
  const persona = PERSONAS[meta.personaId];

  return (
    <main className="fade-rise p-6">
      <PersonaImageIntro
        personaId={persona.id}
        eyebrow={`${PERSONA_GLYPHS[persona.id]} ${persona.name} · ${meta.title}`}
        line={persona.greeting}
        image={PERSONA_IMAGES[persona.id].full}
        imagePosition={PERSONA_IMAGES[persona.id].fullPosition}
      />
      <h1 className="font-[family-name:var(--font-serif-kr)] text-2xl text-primary-green">
        {meta.title}
      </h1>
      <p className="mt-1 text-sm text-text-soft">
        {persona.name} · {persona.greeting}
      </p>
      <GuestReadingView product={product} title={meta.title} />
    </main>
  );
}
