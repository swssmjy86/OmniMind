"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import PickerInput from "@/components/ui/PickerInput";
import Choice from "@/components/ui/Choice";
import { PERSONAS, type PersonaId } from "@/lib/persona/personas";
import { PERSONA_GLYPHS } from "@/components/home/PersonaCard";
import { isBloodType, type BloodType } from "@/lib/interpret/content/traits";

export interface ReadingSheetValues {
  birthDate: string;
  birthTime: string;
  timeUnknown: boolean;
  gender: "male" | "female" | null;
  mbti: string;
  blood: BloodType;
}

const AXES = [
  { key: "EI", pair: ["E", "I"], label: ["외향 E", "내향 I"] },
  { key: "SN", pair: ["S", "N"], label: ["현실 S", "직관 N"] },
  { key: "TF", pair: ["T", "F"], label: ["사고 T", "감정 F"] },
  { key: "JP", pair: ["J", "P"], label: ["계획 J", "유연 P"] },
] as const;

const BLOODS: BloodType[] = ["A", "B", "O", "AB"];

/**
 * 풀이 진입 입력 시트(2026-07-23 스펙) — 오늘의운세 팝업(TodayInputSheet)과 같은 바텀시트
 * 패턴. document.body 포탈 이유도 동일(조상 .fade-rise의 transform이 fixed의 containing
 * block이 되는 문제 회피). 딤 배경에 닫기 없음 — 입력해야 진행되는 관문.
 *
 * mode="full": 생년월일·태어난 시(비우면 모름)·성별(선택)·MBTI·혈액형 — 게스트용.
 * mode="traits": MBTI·혈액형만 — 로그인+프로필 사용자의 빠진 조각 채우기.
 */
export default function ReadingInputSheet({
  mode,
  personaId,
  initial,
  onSubmit,
}: {
  mode: "full" | "traits";
  personaId: PersonaId;
  initial?: Partial<ReadingSheetValues>;
  onSubmit: (v: ReadingSheetValues) => void | Promise<void>;
}) {
  const persona = PERSONAS[personaId];
  const [birthDate, setBirthDate] = useState(initial?.birthDate ?? "");
  const [birthTime, setBirthTime] = useState(initial?.birthTime ?? "");
  const [gender, setGender] = useState<"male" | "female" | null>(initial?.gender ?? null);
  const [axes, setAxes] = useState<Record<string, string | null>>(() => {
    const m = (initial?.mbti ?? "").toUpperCase();
    const ok = /^[EI][SN][TF][JP]$/.test(m);
    return { EI: ok ? m[0] : null, SN: ok ? m[1] : null, TF: ok ? m[2] : null, JP: ok ? m[3] : null };
  });
  const [blood, setBlood] = useState<BloodType | null>(
    initial?.blood && isBloodType(initial.blood) ? initial.blood : null,
  );
  const [busy, setBusy] = useState(false);

  const mbti = AXES.every((a) => axes[a.key]) ? AXES.map((a) => axes[a.key]).join("") : null;
  const birthOk = mode === "traits" || /^\d{4}-\d{2}-\d{2}$/.test(birthDate);
  const canSubmit = Boolean(birthOk && mbti && blood) && !busy;

  const submit = async () => {
    if (!mbti || !blood) return;
    setBusy(true);
    try {
      await onSubmit({
        birthDate, birthTime,
        timeUnknown: birthTime === "", // 비워두면 '모름' — 엔진 timeUnknown 경로
        gender, mbti, blood,
      });
    } finally {
      setBusy(false);
    }
  };

  return createPortal(
    <div className="today-input-sheet-overlay fixed inset-y-0 left-1/2 z-50 flex w-full max-w-[var(--shell-width)] -translate-x-1/2 items-end justify-center lg:max-w-[var(--shell-width-lg)]">
      <div aria-hidden className="absolute inset-0 bg-black/50" />
      <div className="fade-rise relative max-h-[85dvh] w-full max-w-[var(--shell-width)] overflow-y-auto rounded-t-[28px] bg-warm-base p-6 pb-[calc(2rem+env(safe-area-inset-bottom))] lg:max-w-[var(--shell-width-lg)]">
        <p className="text-xs text-text-soft">
          <span aria-hidden>{PERSONA_GLYPHS[persona.id]}</span> {persona.name} · {persona.title}
        </p>
        <h2 className="mt-1 font-[family-name:var(--font-serif-kr)] text-xl text-primary-green">
          {mode === "full" ? "당신의 이야기를 조금 들려주실래요?" : "두 조각만 더 알려주실래요?"}
        </h2>
        <p className="mt-1 text-sm text-text-soft">
          {mode === "full"
            ? "여덟 글자와 성향의 결을 함께 읽어드릴게요. 입력한 정보는 이 기기에만 저장돼요."
            : "성향의 결까지 곁들여 더 온전한 풀이를 들려드릴게요."}
        </p>

        {mode === "full" && (
          <>
            <label className="mt-5 block text-sm text-text-soft">태어난 날</label>
            <div className="mt-1">
              <PickerInput type="date" value={birthDate} onChange={setBirthDate} placeholder="생년월일을 선택해 주세요" />
            </div>

            <label className="mt-4 block text-sm text-text-soft">태어난 시간 (모르면 비워두세요)</label>
            <div className="mt-1">
              <PickerInput type="time" value={birthTime} onChange={setBirthTime} placeholder="알면 더 깊어져요" />
            </div>

            <label className="mt-4 block text-sm text-text-soft">성별 (선택 — 10년 운의 흐름까지)</label>
            <div className="mt-1 flex gap-2">
              <Choice small className="flex-1" selected={gender === "male"} onClick={() => setGender(gender === "male" ? null : "male")}>
                남성
              </Choice>
              <Choice small className="flex-1" selected={gender === "female"} onClick={() => setGender(gender === "female" ? null : "female")}>
                여성
              </Choice>
            </div>
          </>
        )}

        <label className="mt-4 block text-sm text-text-soft">MBTI</label>
        <div className="mt-1 flex flex-col gap-2">
          {AXES.map((a) => (
            <div key={a.key} className="flex gap-2">
              {a.pair.map((v, i) => (
                <Choice
                  key={v}
                  small
                  className="flex-1"
                  selected={axes[a.key] === v}
                  onClick={() => setAxes((prev) => ({ ...prev, [a.key]: prev[a.key] === v ? null : v }))}
                >
                  {a.label[i]}
                </Choice>
              ))}
            </div>
          ))}
        </div>

        <label className="mt-4 block text-sm text-text-soft">혈액형</label>
        <div className="mt-1 flex gap-2">
          {BLOODS.map((b) => (
            <Choice key={b} small className="flex-1" selected={blood === b} onClick={() => setBlood(blood === b ? null : b)}>
              {b}형
            </Choice>
          ))}
        </div>

        <button
          type="button"
          disabled={!canSubmit}
          onClick={submit}
          className="press mt-6 w-full rounded-card bg-accent-coral py-3.5 font-medium text-white disabled:opacity-40"
        >
          {busy ? "결을 읽는 중…" : "풀이 보기"}
        </button>
      </div>
    </div>,
    document.body,
  );
}
