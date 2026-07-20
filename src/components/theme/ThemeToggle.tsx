"use client";

import { useEffect, useState } from "react";
import { applyTheme, readStoredTheme, type Theme } from "@/lib/theme/store";

// 화면 모드 전환 버튼 — 시스템 → 라이트 → 다크 → 시스템 순환. 모든 화면 상단 우측에 고정
// 노출된다(BottomNav와 같은 fixed + 셸 폭 패턴). 저장된 값이 없으면 "system"(기본값)으로
// 시작하고, 마운트 후에만 localStorage를 읽는다 — 하이드레이션 불일치를 피하기 위함.
// index.html의 인라인 스크립트(layout.tsx)가 이미 첫 페인트 전에 data-theme을 적용해
// 두므로 이 컴포넌트는 아이콘 표시만 뒤늦게 동기화하면 된다(화면 깜빡임 없음).
// className="theme-toggle"은 마크업용이 아니라 globals.css의 :has() 선택자 훅이다 —
// TodayInputSheet 같은 "닫기 없는" 관문 모달이 열려 있을 때 이 버튼을 완전히 숨긴다.
const ORDER: Theme[] = ["system", "light", "dark"];
const ICON: Record<Theme, string> = { system: "🌓", light: "☀️", dark: "🌙" };
const LABEL: Record<Theme, string> = { system: "시스템", light: "라이트", dark: "다크" };

export default function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("system");

  useEffect(() => {
    // 마운트 후 1회만 localStorage를 읽어 아이콘을 동기화한다 — 외부 스토어 구독이 아니라
    // 최초 1회 동기화라 set-state-in-effect 휴리스틱의 대상이 아니다(TodayFreeFlow와 동일 패턴).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTheme(readStoredTheme());
  }, []);

  const cycle = () => {
    const next = ORDER[(ORDER.indexOf(theme) + 1) % ORDER.length];
    setTheme(next);
    applyTheme(next);
  };

  return (
    <div className="theme-toggle pointer-events-none fixed left-1/2 top-0 z-40 flex w-full max-w-[var(--shell-width)] -translate-x-1/2 justify-end p-3 lg:max-w-[var(--shell-width-lg)]">
      <button
        type="button"
        onClick={cycle}
        aria-label={`화면 모드: ${LABEL[theme]} (눌러서 전환)`}
        className="press pointer-events-auto flex h-9 w-9 items-center justify-center rounded-full border border-text-soft/20 bg-warm-surface text-base shadow-sm"
      >
        <span aria-hidden>{ICON[theme]}</span>
      </button>
    </div>
  );
}
