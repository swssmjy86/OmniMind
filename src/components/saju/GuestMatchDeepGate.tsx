"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { loadDraft, isCompleteDraft, type Draft } from "@/app/onboarding/draft";
import { UNLIMITED } from "@/lib/consult/quota";
import MatchDeepForm from "./MatchDeepForm";

type Status = "loading" | "no-draft" | "ready";

/**
 * 궁합 심층 게스트 진입 — draft(localStorage, onboarding/draft.ts)를 클라이언트에서 읽어야 해
 * 서버 컴포넌트(match-deep/page.tsx)에서 바로 못 읽는다. 그래서 이 작은 클라이언트 게이트가
 * 로딩→draft 없음(온보딩 유도)/있음(MatchDeepForm에 myDraft로 전달)을 가른다.
 */
export default function GuestMatchDeepGate() {
  const [status, setStatus] = useState<Status>("loading");
  const [draft, setDraft] = useState<Draft | null>(null);

  useEffect(() => {
    // 마운트 후 1회만 localStorage를 읽어 상태를 정한다(외부 스토어 구독이 아니라 최초 1회
    // 동기화라 set-state-in-effect 휴리스틱의 대상이 아니다 — today/TodayFreeFlow.tsx와 동일 근거).
    const d = loadDraft();
    if (!d || !isCompleteDraft(d)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setStatus("no-draft");
      return;
    }
    setDraft(d);
    setStatus("ready");
  }, []);

  if (status === "loading") {
    return <p className="mt-6 text-center text-sm text-text-soft">불러오는 중…</p>;
  }

  if (status === "no-draft") {
    return (
      <section className="mt-6 rounded-card border border-accent-coral/30 bg-warm-surface p-5">
        <p className="text-text-soft">
          궁합을 보려면 먼저 <span className="text-text-main">당신의 여덟 글자</span>가 필요해요.
        </p>
        <Link
          href="/onboarding"
          className="press mt-4 block w-full rounded-card bg-accent-coral py-3.5 text-center font-medium text-white"
        >
          나를 알아보기 ✨
        </Link>
      </section>
    );
  }

  return <MatchDeepForm remaining={UNLIMITED} unlimited myDraft={draft} />;
}
