"use client";

import { useState } from "react";

const STORAGE_KEY = "om-birth-year";

/**
 * 년도 입력 폼(설계서 §2) — GET 제출로 /daily?year=…를 서버가 렌더한다.
 * 입력값은 localStorage에 기억해 재방문 시 prefill만 한다(자동 리다이렉트는 하지 않음 — §2).
 * 엔진을 import하지 않는다 — 계산은 전부 서버 컴포넌트 몫.
 */
export default function YearForm({
  currentYear,
  invalid,
}: {
  currentYear: number;
  invalid?: boolean;
}) {
  // 서버 렌더는 ""(window 없음), 클라이언트는 저장값으로 초기화된다. 이 값 차이는 안전하다 —
  // React는 컨트롤드 input의 value에 한해 하이드레이션 불일치를 예외 처리하고 클라이언트 값으로
  // 맞춘다. 단 이 면제는 input value 전용이라, 이 값을 일반 텍스트 노드로 렌더하면 진짜
  // 하이드레이션 경고가 된다 — 그 경우 useEffect로 옮길 것.
  const [year, setYear] = useState(() => {
    if (typeof window !== "undefined") {
      return window.localStorage.getItem(STORAGE_KEY) || "";
    }
    return "";
  });

  return (
    <form
      method="get"
      onSubmit={() => {
        if (year) window.localStorage.setItem(STORAGE_KEY, year);
      }}
      className="mt-5 rounded-card bg-warm-surface p-5"
    >
      <label className="text-sm text-text-soft" htmlFor="year-input">
        태어난 해 (4자리)
      </label>
      <input
        id="year-input"
        name="year"
        type="number"
        inputMode="numeric"
        min={1900}
        max={currentYear}
        required
        value={year}
        onChange={(e) => setYear(e.target.value)}
        placeholder="1990"
        className="mt-2 w-full rounded-card border border-text-soft/25 bg-warm-base p-3 text-text-main"
      />
      {invalid && (
        <p className="mt-2 text-sm text-accent-coral">
          1900년부터 올해 사이의 년도로 다시 알려주실래요?
        </p>
      )}
      <button
        type="submit"
        className="press mt-4 w-full rounded-card bg-accent-coral py-3.5 font-medium text-white"
      >
        내 띠로 오늘 보기
      </button>
    </form>
  );
}
