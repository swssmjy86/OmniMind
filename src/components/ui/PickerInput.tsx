"use client";

import { useState } from "react";

// 온보딩('나')과 우리의 조합(상대)이 함께 쓰는 네이티브 date/time 입력 래퍼.
// iOS WebKit(카톡 인앱 브라우저 포함)은 값이 없는 date/time 입력에 아무 텍스트도 그리지
// 않아 '텅 빈 상자'로 보인다. 값이 없을 때는 우리가 안내 문구를 얹고, 안드로이드의
// 네이티브 자리표시('연도-월-일')는 투명 처리해 두 플랫폼의 빈 상태 표시를 통일한다.
// 포커스 중에는 원래대로 돌린다 — 키보드로 칸을 하나씩 채우는 동안 value는 빈 문자열이라,
// 투명 처리를 유지하면 타이핑이 안 보이는 채로 안내 문구에 가려진다.
export default function PickerInput({
  type, value, onChange, placeholder, disabled, min, max, bg = "bg-warm-surface",
}: {
  type: "date" | "time";
  value: string;
  onChange: (v: string) => void;
  /** 값이 없을 때 보여줄 안내 문구 */
  placeholder: string;
  disabled?: boolean;
  min?: string;
  max?: string;
  /** 부모 배경이 이미 warm-surface인 곳(예: 카드 안)에서는 "bg-warm-base"로 대비를 준다. */
  bg?: string;
}) {
  const [focused, setFocused] = useState(false);
  const showPlaceholder = !value && !focused;
  return (
    <span className="relative block">
      <input
        type={type}
        min={min}
        max={max}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        className={`w-full rounded-card border border-text-soft/30 ${bg} px-4 py-3 text-lg outline-none focus:border-primary-green disabled:opacity-40 ${
          showPlaceholder ? "text-transparent" : ""
        }`}
      />
      {showPlaceholder && (
        <span
          aria-hidden
          className={`pointer-events-none absolute inset-y-0 left-4 flex items-center text-lg text-text-soft ${
            disabled ? "opacity-40" : ""
          }`}
        >
          {placeholder}
        </span>
      )}
    </span>
  );
}
