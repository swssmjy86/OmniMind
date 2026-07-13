"use client";

import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const signIn = (provider: "kakao" | "google") => {
    const supabase = createClient();
    supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${location.origin}/auth/callback` },
    });
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
          className="w-full rounded-card bg-[#FEE500] py-3.5 font-medium text-[#191919]"
        >
          카카오로 시작하기
        </button>
        <button
          onClick={() => signIn("google")}
          className="w-full rounded-card border border-text-soft/30 bg-warm-surface py-3.5 font-medium"
        >
          Google로 시작하기
        </button>
      </div>
      <p className="text-xs text-text-soft">
        흩어져 있던 나의 조각들, 이제 하나로 이어볼까요?
      </p>
    </main>
  );
}
