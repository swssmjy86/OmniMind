"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import PickerInput from "@/components/ui/PickerInput";
import Choice from "@/components/ui/Choice";
import { unlockMatchDeep } from "@/lib/readings/actions";
import type { InterpretationSection } from "@/lib/interpret/types";

// 엔진 import 금지(번들 보호) — 축·혈액형·모드는 로컬 상수. 슬러그는 서버에서 검증·변환된다.
const AXES: [string, string][] = [["E", "I"], ["S", "N"], ["T", "F"], ["J", "P"]];
const BLOODS = ["A", "B", "O", "AB"] as const;
const MODES = [
  { slug: "lover", label: "연인" }, { slug: "friend", label: "친구" }, { slug: "coworker", label: "동료" },
] as const;

/** 궁합 심층 — 상대 전체 입력 → 크레딧 열기 → 결과 렌더(3단계 스펙 §5). */
export default function MatchDeepForm({
  remaining,
  unlimited,
}: {
  remaining: number;
  unlimited: boolean;
}) {
  const [birthDate, setBirthDate] = useState("");
  const [birthTime, setBirthTime] = useState("");
  const [timeUnknown, setTimeUnknown] = useState(false);
  const [axes, setAxes] = useState<(string | null)[]>([null, null, null, null]);
  const [blood, setBlood] = useState<string | null>(null);
  const [mode, setMode] = useState<string | null>(null);
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

  const mbti = axes.every(Boolean) ? axes.join("") : null;
  const canSubmit =
    /^\d{4}-\d{2}-\d{2}$/.test(birthDate) &&
    (timeUnknown || /^\d{2}:\d{2}$/.test(birthTime)) &&
    mbti !== null && blood !== null && mode !== null && !pending;

  const open = () => {
    setError(false);
    startTransition(async () => {
      const r = await unlockMatchDeep({
        birthDate, birthTime: timeUnknown ? "" : birthTime, timeUnknown,
        mbti, bloodType: blood, mode,
      });
      if (r.ok) setSections(r.sections);
      else setError(true);
    });
  };

  return (
    <div className="mt-5 rounded-card bg-warm-surface p-5">
      <label className="block text-sm text-text-soft">상대의 생년월일</label>
      <div className="mt-1">
        <PickerInput type="date" value={birthDate} onChange={setBirthDate} placeholder="생년월일을 선택해 주세요" bg="bg-warm-base" />
      </div>

      <label className="mt-4 block text-sm text-text-soft">상대의 태어난 시간</label>
      <div className="mt-1">
        <PickerInput type="time" value={birthTime} onChange={setBirthTime} placeholder="태어난 시각을 선택해 주세요" disabled={timeUnknown} bg="bg-warm-base" />
      </div>
      <div className="mt-2 grid grid-cols-1">
        <Choice small selected={timeUnknown} onClick={() => setTimeUnknown(!timeUnknown)} unselectedBg="bg-warm-base">
          시간을 몰라요
        </Choice>
      </div>

      <label className="mt-4 block text-sm text-text-soft">상대의 MBTI</label>
      <div className="mt-1 grid grid-cols-4 gap-2">
        {AXES.map(([a, b], i) => (
          <div key={a} className="grid gap-2">
            {[a, b].map((v) => (
              <Choice key={v} small selected={axes[i] === v} unselectedBg="bg-warm-base"
                onClick={() => setAxes(axes.map((x, j) => (j === i ? v : x)))}>
                {v}
              </Choice>
            ))}
          </div>
        ))}
      </div>

      <label className="mt-4 block text-sm text-text-soft">상대의 혈액형</label>
      <div className="mt-1 grid grid-cols-4 gap-2">
        {BLOODS.map((b) => (
          <Choice key={b} small selected={blood === b} onClick={() => setBlood(b)} unselectedBg="bg-warm-base">
            {b}
          </Choice>
        ))}
      </div>

      <label className="mt-4 block text-sm text-text-soft">우리는 어떤 사이인가요?</label>
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
        {pending ? "풀이를 준비하는 중…" : unlimited ? "지금 열어보기 ✨" : "크레딧 1개로 열기 ✨"}
      </button>
      {!unlimited && (
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
