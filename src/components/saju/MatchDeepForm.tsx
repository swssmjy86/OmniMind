"use client";

import { useState, useTransition } from "react";
import PickerInput from "@/components/ui/PickerInput";
import Choice from "@/components/ui/Choice";
import { computeGuestMatchDeep } from "@/lib/readings/guest-actions";
import type { Draft } from "@/app/onboarding/draft";
import type { InterpretationSection } from "@/lib/interpret/types";

// 엔진 import 금지(번들 보호) — 모드는 로컬 상수. 슬러그는 서버에서 검증·변환된다.
const MODES = [
  { slug: "lover", label: "연인" }, { slug: "friend", label: "친구" }, { slug: "coworker", label: "동료" },
] as const;

/**
 * 궁합 심층 — 상대 전체 입력 → 열기 → 결과 렌더. 익명 로컬: 내 사주(myDraft, 기기 저장)와
 * 상대 정보로 computeGuestMatchDeep이 매번 새로 계산한다(저장·크레딧 없음).
 */
export default function MatchDeepForm({ myDraft }: { myDraft: Draft }) {
  const [birthDate, setBirthDate] = useState("");
  const [birthTime, setBirthTime] = useState("");
  const [timeUnknown, setTimeUnknown] = useState(false);
  const [mode, setMode] = useState<string | null>(null);
  const [result, setResult] = useState<
    { sections: InterpretationSection[]; readingId: string | null } | null
  >(null);
  const [error, setError] = useState(false);
  const [pending, startTransition] = useTransition();

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
      const r = await computeGuestMatchDeep(myDraft, partner);
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
          <PickerInput type="time" value={birthTime} onChange={setBirthTime} placeholder="태어난 시간을 선택해 주세요" disabled={timeUnknown} bg="bg-warm-base" />
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
        className="press mt-6 w-full rounded-card bg-accent-coral py-3.5 font-medium text-on-accent disabled:opacity-40"
      >
        {pending ? "풀이를 준비하는 중…" : "지금 열어보기 ✨"}
      </button>
      {error && (
        <p role="alert" className="mt-2 text-center text-sm text-accent-coral">
          지금은 풀이가 어려워요. 잠시 뒤 다시 시도해 주세요.
        </p>
      )}
    </div>
  );
}
