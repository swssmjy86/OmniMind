"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { href: "/", label: "홈", emoji: "🌿" },
  { href: "/me", label: "나", emoji: "🌙" },
  { href: "/concern", label: "고민", emoji: "🧭" },
  { href: "/mind", label: "마음", emoji: "💬" },
];

export default function BottomNav() {
  const pathname = usePathname();
  return (
    <nav className="fixed bottom-0 left-1/2 flex w-full max-w-[480px] -translate-x-1/2 justify-around border-t border-text-soft/20 bg-warm-surface py-2">
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
