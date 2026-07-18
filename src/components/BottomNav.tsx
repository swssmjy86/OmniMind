"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { href: "/", label: "홈", emoji: "🌿" },
  { href: "/today", label: "오늘의운세", emoji: "🏮" },
  { href: "/saju", label: "사주팔자", emoji: "🌙" },
  { href: "/archive", label: "보관함", emoji: "📦" },
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
