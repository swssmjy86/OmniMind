"use client";

import { useEffect, useState } from "react";
import { loadDraft, isCompleteDraft, type Draft } from "@/app/onboarding/draft";
import CelebMatchView from "./CelebMatchView";
import CelebInputSheet from "./CelebInputSheet";

type Status = "loading" | "no-draft" | "ready";

/**
 * 유명인 궁합 게스트 진입 — draft(localStorage)를 클라이언트에서만 읽을 수 있어 서버
 * 컴포넌트가 직접 못 가른다. GuestMatchDeepGate와 같은 구조.
 */
export default function GuestCelebGate() {
  const [status, setStatus] = useState<Status>("loading");
  const [draft, setDraft] = useState<Draft | null>(null);

  useEffect(() => {
    // 마운트 후 1회만 읽는 최초 동기화 — 외부 스토어 구독이 아니라 set-state-in-effect
    // 휴리스틱의 대상이 아니다(GuestMatchDeepGate와 동일 근거).
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
    // 예전엔 /onboarding으로 보냈지만, 이제 오늘의운세와 같은 입력 팝업으로 여기서 바로 받는다.
    // 저장되면 draft가 채워지며 곧장 궁합 화면으로 넘어간다(시트는 닫힌다).
    return (
      <>
        <section className="mt-6 rounded-card border border-accent-coral/30 bg-warm-surface p-5">
          <p className="text-text-soft">
            맞춰보려면 먼저 <span className="text-text-main">당신의 여덟 글자</span>가 필요해요.
          </p>
        </section>
        <CelebInputSheet
          onSaved={(d) => {
            setDraft(d);
            setStatus("ready");
          }}
        />
      </>
    );
  }

  return <CelebMatchView myDraft={draft!} />;
}
