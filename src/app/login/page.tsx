"use client";

import { useState, useSyncExternalStore } from "react";
import { createClient } from "@/lib/supabase/client";

type Provider = "kakao" | "google";

// Google 공식 'G' 심볼 — 브랜딩 가이드에 맞춘 4색 로고(외부 요청 없이 인라인).
function GoogleLogo() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  );
}

// /login?error=auth 여부 — useSearchParams(Suspense 요구) 없이 안전하게 읽는다.
// 서버 스냅샷은 ""라 정적 프리렌더와도 어긋나지 않는다.
const noopSubscribe = () => () => {};
const useUrlSearch = () =>
  useSyncExternalStore(
    noopSubscribe,
    () => window.location.search,
    () => "",
  );

export default function LoginPage() {
  const [pending, setPending] = useState<Provider | null>(null);
  // 사용자가 버튼을 누르면(override) URL의 오류 안내 대신 이 값을 쓴다.
  const [override, setOverride] = useState<{ notice: string | null } | null>(null);
  const params = new URLSearchParams(useUrlSearch());
  const urlHasError = params.has("error");
  const reason = params.get("reason"); // 콜백이 전달한 실패 사유(진단용)
  const isIdle = !urlHasError && reason === "idle"; // 무활동 자동 로그아웃으로 돌아온 경우

  const notice = override
    ? override.notice
    : urlHasError
      ? "잠시 길이 어긋났어요. 한 번 더 이어볼까요?"
      : isIdle
        ? "자리를 비운 사이, 마음의 기록을 지키려 잠시 문을 닫아두었어요. 다시 이어볼까요?"
        : null;

  const signIn = async (provider: Provider) => {
    if (pending) return; // 중복 클릭 방지
    setPending(provider);
    setOverride({ notice: null });
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${location.origin}/auth/callback` },
    });
    if (error) {
      // 리다이렉트가 일어나지 않은 경우만 도달 — provider 미설정·네트워크 등.
      const other = provider === "google" ? "카카오" : "Google";
      setOverride({
        notice: `${provider === "google" ? "Google" : "카카오"} 문이 잠시 닫혀 있어요. 조금 뒤에 다시, 혹은 ${other}로 이어볼까요?`,
      });
      setPending(null);
    }
  };

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-10 p-6">
      <div className="text-center">
        <h1 className="font-[family-name:var(--font-serif-kr)] text-3xl text-primary-green">
          옴니마인드
        </h1>
        <p className="mt-2 text-text-soft">모든 나를 잇다</p>
      </div>
      <div className="flex w-full flex-col gap-3">
        <button
          onClick={() => signIn("kakao")}
          disabled={pending !== null}
          className="press w-full rounded-card bg-[#FEE500] py-3.5 font-medium text-[#191919] disabled:opacity-60"
        >
          {pending === "kakao" ? "카카오로 잇는 중…" : "카카오로 시작하기"}
        </button>
        <button
          onClick={() => signIn("google")}
          disabled={pending !== null}
          className="press flex w-full items-center justify-center gap-2.5 rounded-card border border-text-soft/30 bg-warm-surface py-3.5 font-medium disabled:opacity-60"
        >
          <GoogleLogo />
          {pending === "google" ? "Google로 잇는 중…" : "Google로 시작하기"}
        </button>
        {notice && (
          <p role="status" className="mt-1 text-center text-sm text-accent-coral">
            {notice}
          </p>
        )}
        {!override && urlHasError && notice && reason && (
          <p className="break-all text-center text-xs text-text-soft">({reason})</p>
        )}
      </div>
      <p className="text-xs text-text-soft">
        흩어져 있던 나의 조각들, 이제 하나로 이어볼까요?
      </p>
    </main>
  );
}
