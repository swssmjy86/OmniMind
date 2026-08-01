import type { Metadata } from "next";
import { PERSONAS } from "@/lib/persona/personas";
import { PERSONA_IMAGES } from "@/lib/persona/images";
import { PERSONA_GLYPHS } from "@/components/home/PersonaCard";
import GuestMatchDeepGate from "@/components/saju/GuestMatchDeepGate";
import PersonaImageIntro from "@/components/persona/PersonaImageIntro";

export const metadata: Metadata = {
  title: "궁합 심층 — 옴니마인드",
  description: "두 사람의 사주 전체가 만나는 이야기 — 상대 정보로 깊이 풀어드려요.",
};

/** 궁합 심층 — 익명 로컬. 내 사주(기기 저장)와 상대 정보를 입력해 즉시 계산한다. */
export default function MatchDeepPage() {
  const yeonri = PERSONAS.yeonri;
  return (
    <main className="fade-rise p-6">
      <PersonaImageIntro
        personaId="yeonri"
        eyebrow={`${PERSONA_GLYPHS.yeonri} ${yeonri.name} · 궁합 심층`}
        line={yeonri.greeting}
        image={PERSONA_IMAGES.yeonri.full}
        imagePosition={PERSONA_IMAGES.yeonri.fullPosition}
      />
      <h1 className="font-[family-name:var(--font-serif-kr)] text-2xl text-primary-green">
        궁합 심층
      </h1>
      <p className="mt-1 text-sm text-text-soft">
        {yeonri.name} · {yeonri.greeting}
      </p>
      <GuestMatchDeepGate />
    </main>
  );
}
