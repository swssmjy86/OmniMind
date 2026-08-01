"use client";

import Link from "next/link";
import { useEffect, type ReactNode } from "react";
import { speakPersonaLine, warmUpVoices } from "@/lib/persona/speak";
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
  // 음성 목록은 비동기 로드라(Chromium은 첫 getVoices가 빈 배열) 마운트 때 미리 데워
  // 둔다 — 그래야 첫 클릭부터 성별에 맞는 한국어 음성이 잡힌다.
  useEffect(() => {
    warmUpVoices();
  }, []);

  return (
    <Link href={href} className={className} onClick={() => speakPersonaLine(personaId, line)}>
      {children}
    </Link>
  );
}
