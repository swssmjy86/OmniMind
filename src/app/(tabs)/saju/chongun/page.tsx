import Link from "next/link";
import type { Metadata } from "next";
import { PERSONAS } from "@/lib/persona/personas";
import GuestReadingView from "@/components/saju/GuestReadingView";
import PersonaGreetingIntro from "@/components/persona/PersonaGreetingIntro";

export const metadata: Metadata = {
  title: "총운 — 옴니마인드",
  description: "여덟 글자에 담긴 인생 전반의 흐름.",
};

/** 총운 풀이 — 익명 로컬. 입력 시트로 사주를 받아 즉시 계산해 보여준다. */
export default function ChongunPage() {
  const seoon = PERSONAS.seoon;
  return (
    <main className="fade-rise p-6">
      <PersonaGreetingIntro
        personaId="seoon"
        eyebrow={`📜 ${seoon.name} · 총운`}
        line={seoon.greeting}
      />
      <h1 className="font-[family-name:var(--font-serif-kr)] text-2xl text-primary-green">
        총운
      </h1>
      <p className="mt-1 text-sm text-text-soft">
        <span aria-hidden>📜</span> {seoon.name} · {seoon.greeting}
      </p>
      <GuestReadingView product="chongun" title="총운" />
      <Link href="/me" className="mt-6 block text-center text-sm text-text-soft underline">
        내 프로필·공유 카드 보기
      </Link>
    </main>
  );
}
