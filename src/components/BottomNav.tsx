"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { sessionStore } from "@/lib/session-store";

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

  // 하단 4개 탭을 누르는 순간 세션 입력을 비운다 — 다른 탭으로 이동하면 그 탭이 새로
  // 마운트되며 빈 저장소를 읽어 입력이 초기화된다(클릭 시점에 비우므로 읽기보다 먼저다).
  // 이미 보고 있는 탭을 다시 누를 때는 라우팅이 안 일어나고, router.refresh()로는 클라이언트
  // useState/마운트 이펙트가 초기화되지 않는다 — 그래서 같은 탭 재클릭은 전체 리로드로 확실히
  // 초기화한다(리로드하면 인메모리 세션도 함께 비워진다).
  function resetSession(e: React.MouseEvent, href: string) {
    if (pathname === href) {
      e.preventDefault();
      window.location.reload();
      return;
    }
    sessionStore.clear();
  }

  return (
    <nav className="safe-pb fixed bottom-0 left-1/2 flex w-full max-w-[var(--shell-width)] -translate-x-1/2 justify-around border-t border-text-soft/20 bg-warm-surface pt-2 lg:max-w-[var(--shell-width-lg)]">
      {tabs.map((tab) => {
        const active = pathname === tab.href;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            onClick={(e) => resetSession(e, tab.href)}
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
