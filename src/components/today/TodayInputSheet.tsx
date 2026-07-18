"use client";

import { useState } from "react";
import PickerInput from "@/components/ui/PickerInput";
import Choice from "@/components/ui/Choice";
import { TODAY_BIRTH_KEY, type TodayBirth } from "@/lib/today/birth-store";

/**
 * 오늘의운세 입력 팝업(스펙 §3) — 새창이 아닌 바텀시트. 입력은 localStorage에만 저장한다.
 * 시간 미상(timeUnknown)·성별 미선택을 허용한다 — 온보딩과 같은 결.
 */
export default function TodayInputSheet({
  onSaved,
}: {
  onSaved: (b: TodayBirth) => void;
}) {
  const [birthDate, setBirthDate] = useState("");
  const [birthTime, setBirthTime] = useState("");
  const [timeUnknown, setTimeUnknown] = useState(false);
  const [gender, setGender] = useState<"male" | "female" | null>(null);

  const canSubmit = /^\d{4}-\d{2}-\d{2}$/.test(birthDate) && (timeUnknown || /^\d{2}:\d{2}$/.test(birthTime));

  const submit = () => {
    const b: TodayBirth = {
      birthDate,
      birthTime: timeUnknown ? "" : birthTime,
      timeUnknown,
      gender,
    };
    try {
      window.localStorage.setItem(TODAY_BIRTH_KEY, JSON.stringify(b));
    } catch {
      // 저장 불가(시크릿 모드 등)여도 이번 화면은 계속
    }
    onSaved(b);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      {/* 딤 배경 — 닫기 없음(입력해야 진행되는 첫 관문) */}
      <div aria-hidden className="absolute inset-0 bg-black/50" />
      <div className="fade-rise relative w-full max-w-[var(--shell-width)] rounded-t-[28px] bg-warm-base p-6 pb-8 lg:max-w-[var(--shell-width-lg)]">
        <p className="text-xs text-text-soft">
          <span aria-hidden>🏮</span> 달지기 · 오늘의운세
        </p>
        <h2 className="mt-1 font-[family-name:var(--font-serif-kr)] text-xl text-primary-green">
          태어난 날을 알려주실래요?
        </h2>
        <p className="mt-1 text-sm text-text-soft">
          오늘의 기운을 당신에게 맞춰 보여드릴게요. 입력한 정보는 이 기기에만 저장돼요.
        </p>

        <label className="mt-5 block text-sm text-text-soft">태어난 날</label>
        <div className="mt-1">
          <PickerInput type="date" value={birthDate} onChange={setBirthDate} placeholder="생년월일을 선택해 주세요" />
        </div>

        <label className="mt-4 block text-sm text-text-soft">태어난 시간</label>
        <div className="mt-1">
          <PickerInput
            type="time"
            value={birthTime}
            onChange={setBirthTime}
            placeholder="태어난 시각을 선택해 주세요"
            disabled={timeUnknown}
          />
        </div>
        <div className="mt-2 grid grid-cols-1">
          <Choice small selected={timeUnknown} onClick={() => setTimeUnknown(!timeUnknown)}>
            시간을 몰라요
          </Choice>
        </div>

        <label className="mt-4 block text-sm text-text-soft">성별 (선택)</label>
        <div className="mt-1 grid grid-cols-2 gap-2">
          <Choice small selected={gender === "male"} onClick={() => setGender(gender === "male" ? null : "male")}>
            남성
          </Choice>
          <Choice small selected={gender === "female"} onClick={() => setGender(gender === "female" ? null : "female")}>
            여성
          </Choice>
        </div>

        <button
          type="button"
          disabled={!canSubmit}
          onClick={submit}
          className="press mt-6 w-full rounded-card bg-accent-coral py-3.5 font-medium text-white disabled:opacity-40"
        >
          오늘의 기운 보기
        </button>
      </div>
    </div>
  );
}
