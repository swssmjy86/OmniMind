"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import PickerInput from "@/components/ui/PickerInput";
import Choice from "@/components/ui/Choice";
import { saveDraft, type Draft } from "@/app/onboarding/draft";

/**
 * 유명인 궁합 입력 팝업 — 오늘의운세 입력 시트(TodayInputSheet)와 같은 바텀시트 패턴.
 * 예전엔 draft가 없으면 /onboarding으로 보냈지만, 여기서 당신의 여덟 글자를 바로 받아
 * localStorage draft에 저장하고 궁합 경로로 이어간다(computeGuestMatchDeep이 이 draft를 쓴다).
 * document.body 포탈·딤 배경 닫기 없음(입력해야 진행되는 관문)도 TodayInputSheet와 동일.
 * today-input-sheet-overlay 클래스는 globals.css의 :has() 훅 — 시트가 떠 있는 동안 ThemeToggle을 숨긴다.
 * 궁합 심층 계산은 보조축(MBTI·혈액형)을 쓰지 않아, 오늘의운세와 같은 세 칸(날·시간·성별)만 받는다.
 */
export default function CelebInputSheet({
  onSaved,
}: {
  onSaved: (d: Draft) => void;
}) {
  const [birthDate, setBirthDate] = useState("");
  const [birthTime, setBirthTime] = useState("");
  const [gender, setGender] = useState<"male" | "female" | null>(null);

  const canSubmit = /^\d{4}-\d{2}-\d{2}$/.test(birthDate) && /^\d{2}:\d{2}$/.test(birthTime);

  const submit = () => {
    // 닉네임은 결과 문구의 "나" 자리에만 쓰인다 — 팝업에선 따로 받지 않고 기본값으로 둔다.
    const draft: Draft = { nickname: "나", birthDate, birthTime, timeUnknown: false, gender };
    saveDraft(draft);
    onSaved(draft);
  };

  return createPortal(
    <div className="today-input-sheet-overlay fixed inset-y-0 left-1/2 z-50 flex w-full max-w-[var(--shell-width)] -translate-x-1/2 items-end justify-center lg:max-w-[var(--shell-width-lg)]">
      <div aria-hidden className="absolute inset-0 bg-black/50" />
      <div className="fade-rise relative max-h-[85dvh] w-full max-w-[var(--shell-width)] overflow-y-auto rounded-t-[28px] bg-warm-base p-6 pb-[calc(2rem+env(safe-area-inset-bottom))] lg:max-w-[var(--shell-width-lg)]">
        <p className="text-xs text-text-soft">
          <span aria-hidden>💞</span> 연리 · 유명인 궁합
        </p>
        <h2 className="mt-1 font-[family-name:var(--font-serif-kr)] text-xl text-primary-green">
          당신의 태어난 날을 알려주실래요?
        </h2>
        <p className="mt-1 text-sm text-text-soft">
          당신의 여덟 글자로 그 사람과의 결을 맞춰볼게요. 입력한 정보는 이 기기에만 저장돼요.
        </p>

        <label className="mt-5 block text-sm text-text-soft">태어난 날</label>
        <div className="mt-1">
          <PickerInput type="date" value={birthDate} onChange={setBirthDate} placeholder="생년월일을 선택해 주세요" />
        </div>

        <label className="mt-4 block text-sm text-text-soft">태어난 시간</label>
        <div className="mt-1">
          <PickerInput type="time" value={birthTime} onChange={setBirthTime} placeholder="태어난 시간을 선택해 주세요" />
        </div>

        <label className="mt-4 block text-sm text-text-soft">성별 (선택)</label>
        <div className="mt-1 flex gap-2">
          <Choice small className="flex-1" selected={gender === "male"} onClick={() => setGender(gender === "male" ? null : "male")}>
            남성
          </Choice>
          <Choice small className="flex-1" selected={gender === "female"} onClick={() => setGender(gender === "female" ? null : "female")}>
            여성
          </Choice>
        </div>

        <button
          type="button"
          disabled={!canSubmit}
          onClick={submit}
          className="press mt-6 w-full rounded-card bg-accent-coral py-3.5 font-medium text-on-accent disabled:opacity-40"
        >
          궁합 맞춰보기
        </button>
      </div>
    </div>,
    document.body,
  );
}
