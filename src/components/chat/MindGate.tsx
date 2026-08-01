"use client";

import { useEffect, useState } from "react";
import { loadLocalProfile, type LocalProfile } from "@/lib/profile/local";
import ProfileNeeded from "@/components/profile/ProfileNeeded";
import MindChat from "./MindChat";

/**
 * 마음 챗 진입 게이트 — draft(localStorage)를 클라이언트에서만 읽을 수 있어, 로컬 프로필이
 * 있으면 MindChat을, 없으면 온보딩 유도를 렌더한다.
 */
export default function MindGate() {
  const [state, setState] = useState<"loading" | "none" | LocalProfile>("loading");

  useEffect(() => {
    const p = loadLocalProfile();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setState(p ?? "none");
  }, []);

  if (state === "loading") {
    return <p className="p-6 text-center text-sm text-text-soft">불러오는 중…</p>;
  }
  if (state === "none") {
    return (
      <ProfileNeeded
        title="마음"
        message="마음을 나누기 전에, 먼저 당신을 알아볼까요? 당신의 결을 알아야 더 깊이 함께할 수 있어요."
      />
    );
  }
  return <MindChat nickname={state.nickname} profile={state.ctx} />;
}
