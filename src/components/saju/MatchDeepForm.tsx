"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import PickerInput from "@/components/ui/PickerInput";
import Choice from "@/components/ui/Choice";
import { unlockMatchDeep } from "@/lib/readings/actions";
import { computeGuestMatchDeep } from "@/lib/readings/guest-actions";
import type { Draft } from "@/app/onboarding/draft";
import type { InterpretationSection } from "@/lib/interpret/types";
import ReviewPrompt from "@/components/reviews/ReviewPrompt";

// 엔진 import 금지(번들 보호) — 모드는 로컬 상수. 슬러그는 서버에서 검증·변환된다.
const MODES = [
  { slug: "lover", label: "연인" }, { slug: "friend", label: "친구" }, { slug: "coworker", label: "동료" },
] as const;

/**
 * 궁합 심층 — 상대 전체 입력 → 열기 → 결과 렌더(3단계 스펙 §5).
 * myDraft가 있으면 게스트(로그인 없음) — computeGuestMatchDeep으로 저장·크레딧 없이 매번
 * 새로 계산한다(guest-actions.ts, LLM 없음). 없으면 기존 로그인 경로(unlockMatchDeep) 그대로.
 */
export default function MatchDeepForm({
  remaining,
  unlimited,
  myDraft,
}: {
  remaining: number;
  unlimited: boolean;
  myDraft?: Draft | null;
}) {
  const [birthDate, setBirthDate] = useState("");
  const [birthTime, setBirthTime] = useState("");
  const [timeUnknown, setTimeUnknown] = useState(false);
  const [mode, setMode] = useState<string | null>(null);
  const [result, setResult] = useState<
    { sections: InterpretationSection[]; readingId: string | null } | null
  >(null);
  const [error, setError] = useState(false);
  const [pending, startTransition] = useTransition();
  // 게스트는 크레딧 개념이 없다 — 부모가 unlimited를 안 넘겨도 여기서 스스로 방어한다.
  const effectiveUnlimited = unlimited || Boolean(myDraft);

  if (result) {
    return (
      <div className="mt-6 space-y-4">
        {result.sections.map((s, i) => (
          <section key={`${i}-${s.title}`} className="rounded-card bg-warm-surface p-5">
            <h2 className="font-[family-name:var(--font-serif-kr)] text-lg text-primary-green">
              {s.title}
            </h2>
            <p className="mt-2 leading-relaxed text-text-main">{s.body}</p>
          </section>
        ))}
        {result.readingId && <ReviewPrompt readingId={result.readingId} />}
      </div>
    );
  }

  if (!effectiveUnlimited && remaining <= 0) {
    return (
      <div className="mt-5 rounded-card bg-warm-surface p-5 text-center">
        <p className="text-sm text-text-soft">
          궁합 심층은 크레딧 1개로 열 수 있어요. 지금은 남은 크레딧이 없네요.
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

  const canSubmit =
    /^\d{4}-\d{2}-\d{2}$/.test(birthDate) &&
    (timeUnknown || /^\d{2}:\d{2}$/.test(birthTime)) &&
    mode !== null && !pending;

  const open = () => {
    setError(false);
    startTransition(async () => {
      const partner = { birthDate, birthTime: timeUnknown ? "" : birthTime, timeUnknown, mode };
      const r = myDraft
        ? await computeGuestMatchDeep(myDraft, partner)
        : await unlockMatchDeep(partner);
      if (r.ok) setResult({ sections: r.sections, readingId: r.readingId });
      else setError(true);
    });
  };

  return (
    <div className="mt-5 rounded-card bg-warm-surface p-5">
      <label className="block">
        <span className="block text-sm text-text-soft">상대의 생년월일</span>
        <div className="mt-1">
          <PickerInput type="date" value={birthDate} onChange={setBirthDate} placeholder="생년월일을 선택해 주세요" bg="bg-warm-base" />
        </div>
      </label>

      <label className="mt-4 block">
        <span className="block text-sm text-text-soft">상대의 태어난 시간</span>
        <div className="mt-1">
          <PickerInput type="time" value={birthTime} onChange={setBirthTime} placeholder="태어난 시각을 선택해 주세요" disabled={timeUnknown} bg="bg-warm-base" />
        </div>
      </label>
      <div className="mt-2">
        <Choice small selected={timeUnknown} onClick={() => setTimeUnknown(!timeUnknown)} unselectedBg="bg-warm-base">
          시간을 몰라요
        </Choice>
      </div>

      <span className="mt-4 block text-sm text-text-soft">우리는 어떤 사이인가요?</span>
      <div className="mt-1 grid grid-cols-3 gap-2">
        {MODES.map((m) => (
          <Choice key={m.slug} small selected={mode === m.slug} onClick={() => setMode(m.slug)} unselectedBg="bg-warm-base">
            {m.label}
          </Choice>
        ))}
      </div>

      <button
        type="button"
        disabled={!canSubmit}
        onClick={open}
        className="press mt-6 w-full rounded-card bg-accent-coral py-3.5 font-medium text-white disabled:opacity-40"
      >
        {pending ? "풀이를 준비하는 중…" : effectiveUnlimited ? "지금 열어보기 ✨" : "크레딧 1개로 열기 ✨"}
      </button>
      {!effectiveUnlimited && (
        <p className="mt-2 text-center text-xs text-text-soft">
          남은 크레딧 {remaining}개 · 같은 상대는 다시 볼 때 무료예요.
        </p>
      )}
      {error && (
        <p className="mt-2 text-center text-sm text-accent-coral">
          지금은 풀이가 어려워요. 잠시 뒤 다시 시도해 주시면 크레딧은 그대로예요.
        </p>
      )}
    </div>
  );
}
