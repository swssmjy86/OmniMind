"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { href: "/", label: "홈", emoji: "🌿" },
  { href: "/today", label: "오늘의운세", emoji: "🏮" },
  { href: "/saju", label: "사주팔자", emoji: "🌙" },
  // 보관함(/archive)이 쓰던 자리 — 라우트는 그대로 살아 있고, 오늘의운세 하단과 홈의
  // "지난 기록 보기" 링크로 들어간다(2026-07-26).
  { href: "/celeb", label: "유명인궁합", emoji: "💞" },
];

export default function BottomNav() {
  const pathname = usePathname();
  return (
    <nav className="fixed bottom-0 left-1/2 flex w-full max-w-[var(--shell-width)] -translate-x-1/2 justify-around border-t border-text-soft/20 bg-warm-surface py-2 lg:max-w-[var(--shell-width-lg)]">
      {tabs.map((tab) => {
        const active = pathname === tab.href;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`flex flex-col items-center gap-0.5 px-4 py-1 text-xs ${
              active ? "font-semibold text-primary-green" : "text-text-soft"
            }`}
          >
            <span aria-hidden>{tab.emoji}</span>
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
