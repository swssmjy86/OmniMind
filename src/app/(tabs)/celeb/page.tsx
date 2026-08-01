import type { Metadata } from "next";
import { PERSONAS } from "@/lib/persona/personas";
import GuestCelebGate from "@/components/celeb/GuestCelebGate";

export const metadata: Metadata = {
  title: "유명인 궁합 — 옴니마인드",
  description: "그 사람과 나의 결은 어떻게 만날까 — 널리 알려진 이들과 사주로 맞춰보는 자리.",
};

/**
 * 유명인 사주 궁합 탭 — 익명 로컬. 내 사주(기기 저장)와 유명인 상수로 즉시 계산한다.
 */
export default function CelebPage() {
  const yeonri = PERSONAS.yeonri;
  return (
    <main className="fade-rise p-6">
      <h1 className="font-[family-name:var(--font-serif-kr)] text-2xl text-primary-green">
        유명인 궁합
      </h1>
      <p className="mt-1 text-sm text-text-soft">
        {yeonri.name} · 그 사람과 나의 결이 어떻게 만나는지 함께 들여다봐요.
      </p>
      <GuestCelebGate />
    </main>
  );
}
