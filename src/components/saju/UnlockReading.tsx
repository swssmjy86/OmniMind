"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { unlockReading } from "@/lib/readings/actions";
import type { InterpretationSection } from "@/lib/interpret/types";

/**
 * 크레딧 풀이 열기(3단계 스펙 §4) — 성공 시 결과 섹션을 이 자리에서 렌더한다.
 * (LLM 실패로 비캐시 템플릿본이 와도 같은 경로 — 사용자에게 실패를 보이지 않는다.)
 * 재방문은 서버 캐시 히트로 페이지가 직접 렌더한다.
 */
export default function UnlockReading({
  product,
  remaining,
  unlimited,
}: {
  product: string;
  remaining: number;
  unlimited: boolean;
}) {
  const [sections, setSections] = useState<InterpretationSection[] | null>(null);
  const [error, setError] = useState(false);
  const [pending, startTransition] = useTransition();

  if (sections) {
    return (
      <div className="mt-6 space-y-4">
        {sections.map((s, i) => (
          <section key={`${i}-${s.title}`} className="rounded-card bg-warm-surface p-5">
            <h2 className="font-[family-name:var(--font-serif-kr)] text-lg text-primary-green">
              {s.title}
            </h2>
            <p className="mt-2 leading-relaxed text-text-main">{s.body}</p>
          </section>
        ))}
      </div>
    );
  }

  if (!unlimited && remaining <= 0) {
    return (
      <div className="mt-5 rounded-card bg-warm-surface p-5 text-center">
        <p className="text-sm text-text-soft">
          이 풀이는 크레딧 1개로 열 수 있어요. 지금은 남은 크레딧이 없네요.
        </p>
        <Link
          href="/premium/credits"
          className="press mt-4 block w-full rounded-card bg-accent-coral py-3.5 font-medium text-white"
        >
          크레딧 채우기
        </Link>
      </div>
    );
  }

  const open = () => {
    setError(false);
    startTransition(async () => {
      const r = await unlockReading(product);
      if (r.ok) setSections(r.sections);
      else setError(true);
    });
  };

  return (
    <div className="mt-5 text-center">
      <button
        type="button"
        onClick={open}
        disabled={pending}
        className="press w-full rounded-card bg-accent-coral py-3.5 font-medium text-white disabled:opacity-40"
      >
        {pending ? "풀이를 준비하는 중…" : unlimited ? "지금 열어보기 ✨" : "크레딧 1개로 열기 ✨"}
      </button>
      {!unlimited && (
        <p className="mt-2 text-xs text-text-soft">
          남은 크레딧 {remaining}개 · 한 번 연 풀이는 다시 볼 때 무료예요.
        </p>
      )}
      {error && (
        <p className="mt-2 text-sm text-accent-coral">
          지금은 풀이가 어려워요. 잠시 뒤 다시 시도해 주시면 크레딧은 그대로예요.
        </p>
      )}
    </div>
  );
}
