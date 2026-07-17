"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { redirectToIdleLogin } from "@/lib/auth/idle-redirect";
import {
  ACTIVITY_EVENTS,
  IDLE_CHECK_INTERVAL_MS,
  IDLE_TIMEOUT_MS,
  LAST_ACTIVITY_KEY,
} from "@/lib/auth/constants";

/** scroll처럼 잦은 이벤트가 localStorage를 두드리지 않게 기록 간격을 벌린다. */
const WRITE_THROTTLE_MS = 5000;

function readLastActivity(): number | null {
  const raw = window.localStorage.getItem(LAST_ACTIVITY_KEY);
  if (!raw) return null;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

/**
 * 장기 무활동 자동 로그아웃. 렌더는 없다.
 *
 * 마지막 활동 시각을 localStorage에 기록해 여러 탭이 공유하고,
 * 주기 검사·탭 복귀(visibilitychange)·마운트 시점에 만료를 확인한다.
 * 만료 시 세션이 있을 때만 signOut 후 로그인 화면으로 보낸다.
 */
export default function IdleLogout() {
  useEffect(() => {
    let signingOut = false;
    let lastWrite = 0;

    const touch = () => {
      window.localStorage.setItem(LAST_ACTIVITY_KEY, String(Date.now()));
    };

    const onActivity = () => {
      const now = Date.now();
      if (now - lastWrite < WRITE_THROTTLE_MS) return;
      lastWrite = now;
      touch();
    };

    const check = async () => {
      if (signingOut) return;
      const last = readLastActivity();
      if (last === null) {
        // 첫 방문 — 지금부터 재기 시작한다
        touch();
        return;
      }
      if (Date.now() - last < IDLE_TIMEOUT_MS) return;

      const supabase = createClient();
      const { data } = await supabase.auth.getSession();
      if (!data.session || signingOut) return;
      signingOut = true;
      try {
        await supabase.auth.signOut();
      } catch {
        // 네트워크 실패여도 로그인 화면으로 보낸다 — 미들웨어가 세션을 재검증한다
      }
      redirectToIdleLogin();
    };

    const onVisible = () => {
      if (document.visibilityState === "visible") void check();
    };

    for (const event of ACTIVITY_EVENTS) {
      window.addEventListener(event, onActivity, { passive: true });
    }
    document.addEventListener("visibilitychange", onVisible);
    const interval = window.setInterval(() => void check(), IDLE_CHECK_INTERVAL_MS);
    void check(); // 방치된 채 다시 열린 화면은 즉시 정리

    return () => {
      for (const event of ACTIVITY_EVENTS) {
        window.removeEventListener(event, onActivity);
      }
      document.removeEventListener("visibilitychange", onVisible);
      window.clearInterval(interval);
    };
  }, []);

  return null;
}
