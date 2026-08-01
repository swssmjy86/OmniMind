"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { speakPersonaLine } from "@/lib/persona/speak";
import type { PersonaId } from "@/lib/persona/personas";

/**
 * 풀이 카드의 링크 — 누르는 순간 페르소나 멘트를 소리로 읽고(사용자 제스처라 자동재생
 * 정책에 안 막힌다) 그대로 풀이 화면으로 이동한다. 음성은 클라이언트 SPA 네비게이션
 * 동안에도 window에 남아 이어진다. 서버 컴포넌트(PersonaCard)가 이 클라이언트 조각만 쓴다.
 */
export default function PersonaSpeakLink({
  href,
  personaId,
  line,
  className,
  children,
}: {
  href: string;
  personaId: PersonaId;
  line: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Link href={href} className={className} onClick={() => speakPersonaLine(personaId, line)}>
      {children}
    </Link>
  );
}
