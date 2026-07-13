# P0 기반 구축 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 카카오/구글 로그인이 되는 브랜드 스타일의 빈 앱(4탭 셸)을 Vercel에 배포한다.

**Architecture:** Next.js(App Router) 단일 코드베이스. Supabase가 인증(OAuth)과 DB를 담당하고, `@supabase/ssr`로 서버/클라이언트 세션을 동기화한다. UI는 모바일 우선, 디자인 토큰(CSS 변수)으로 브랜드 팔레트를 고정한다.

**Tech Stack:** Next.js 15+ (TypeScript, App Router), Tailwind CSS 4, Supabase (`@supabase/supabase-js`, `@supabase/ssr`), Vercel

## Global Constraints

- 월 고정비 0원 — Vercel Hobby, Supabase Free 티어만 사용
- 컬러 토큰(설계서 §5.2 그대로): `--warm-base: #F5EFE6`, `--warm-surface: #FDFBF7`, `--accent-coral: #E8927C`, `--primary-green: #2D5A4A`, `--text-main: #3E3A36`, `--text-soft: #8A8178`
- 블루 계열 색상 전면 금지 (카카오 브랜드 버튼의 노랑 `#FEE500`은 예외적으로 허용 — 외부 브랜드 가이드)
- 서체: Pretendard(본문), Noto Serif KR(제목 계열)
- 모든 사용자 대면 문구는 설계서 §5.4 문체 규칙 준수 ("~하세요" 금지 등)
- 모바일 우선: 기준 뷰포트 375px, 최대 콘텐츠 폭 480px 중앙 정렬
- 비밀값(`.env.local`)은 절대 커밋하지 않는다
- 작업 환경: Windows / PowerShell (명령은 PowerShell 문법)

> **P0의 테스트 정책:** P0는 스캐폴딩·설정·외부 서비스 연동 단계라 자동 테스트 대상 로직이 없다. 각 태스크는 "실행 → 눈으로 확인" 검증 단계를 가진다. TDD는 P1(계산 엔진)부터 전면 적용한다.

---

### Task 1: Next.js 프로젝트 스캐폴딩

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/globals.css` 외 create-next-app 산출물 전체

**Interfaces:**
- Produces: `npm run dev`로 구동되는 Next.js 앱, `@/*` → `src/*` import alias

- [ ] **Step 1: 스캐폴딩 실행 (루트가 비어있지 않으므로 임시 폴더 경유)**

```powershell
npx create-next-app@latest omnimind-tmp --typescript --app --tailwind --eslint --src-dir --import-alias "@/*" --use-npm --yes
```

Expected: `omnimind-tmp` 폴더 생성 완료 메시지. (저장소 안이므로 git init은 자동 생략됨)

- [ ] **Step 2: 산출물을 루트로 이동하고 임시 폴더 제거**

```powershell
Get-ChildItem omnimind-tmp -Force | Move-Item -Destination . ; Remove-Item omnimind-tmp -Recurse -Force
```

Expected: 루트에 `package.json`, `src/`, `node_modules/` 등이 위치. 기존 `CLAUDE.md`, `docs/`와 충돌 없음.

- [ ] **Step 3: 개발 서버 구동 확인**

Run: `npm run dev`
Expected: `http://localhost:3000` 에서 Next.js 기본 페이지 렌더. 확인 후 Ctrl+C로 종료.

- [ ] **Step 4: Commit**

```powershell
git add -A ; git commit -m "chore: scaffold Next.js app (TypeScript, App Router, Tailwind)"
```

---

### Task 2: 디자인 토큰 + 폰트

**Files:**
- Modify: `src/app/globals.css` (전체 교체)
- Modify: `src/app/layout.tsx` (전체 교체)

**Interfaces:**
- Produces: CSS 변수 토큰 6종(`--warm-base` 등), Tailwind 유틸리티 색상명(`bg-warm-base`, `text-main` 등), `font-serif-kr` 클래스. 이후 모든 태스크의 UI는 이 토큰만 사용한다.

- [ ] **Step 1: globals.css를 브랜드 토큰으로 교체**

```css
/* src/app/globals.css */
@import "tailwindcss";

:root {
  --warm-base: #f5efe6;
  --warm-surface: #fdfbf7;
  --accent-coral: #e8927c;
  --primary-green: #2d5a4a;
  --text-main: #3e3a36;
  --text-soft: #8a8178;
}

/* 다크 모드: 딥 그린 바탕 + 베이지 텍스트 (설계서 §5.2) */
@media (prefers-color-scheme: dark) {
  :root {
    --warm-base: #1f3a30;
    --warm-surface: #2d5a4a;
    --accent-coral: #e8927c;
    --primary-green: #f5efe6;
    --text-main: #f5efe6;
    --text-soft: #cfc6b8;
  }
}

@theme inline {
  --color-warm-base: var(--warm-base);
  --color-warm-surface: var(--warm-surface);
  --color-accent-coral: var(--accent-coral);
  --color-primary-green: var(--primary-green);
  --color-text-main: var(--text-main);
  --color-text-soft: var(--text-soft);
  --font-sans: "Pretendard Variable", Pretendard, -apple-system, sans-serif;
  --font-serif-kr: "Noto Serif KR", serif;
  --radius-card: 20px;
}

body {
  background: var(--warm-base);
  color: var(--text-main);
  font-family: var(--font-sans);
}
```

- [ ] **Step 2: layout.tsx에 폰트 로드와 모바일 셸 적용**

```tsx
// src/app/layout.tsx
import type { Metadata, Viewport } from "next";
import { Noto_Serif_KR } from "next/font/google";
import "./globals.css";

const notoSerifKr = Noto_Serif_KR({
  weight: ["400", "600"],
  subsets: ["latin"],
  variable: "--font-serif-kr",
});

export const metadata: Metadata = {
  title: "옴니마인드 — 모든 나를 잇다",
  description:
    "사주, MBTI, 혈액형, 별자리… 흩어져 있던 '나'의 조각들을 하나로 이어드릴게요.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko" className={notoSerifKr.variable}>
      <head>
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css"
        />
      </head>
      <body className="mx-auto min-h-dvh max-w-[480px] antialiased">
        {children}
      </body>
    </html>
  );
}
```

- [ ] **Step 3: 확인**

Run: `npm run dev`
Expected: 배경이 웜 베이지(`#F5EFE6`), 본문 서체가 Pretendard로 렌더. 콘텐츠가 480px 중앙 정렬.

- [ ] **Step 4: Commit**

```powershell
git add src/app/globals.css src/app/layout.tsx ; git commit -m "feat: brand design tokens and fonts (warm palette, Pretendard/Noto Serif KR)"
```

---

### Task 3: 앱 셸 — 하단 4탭 네비게이션

**Files:**
- Create: `src/components/BottomNav.tsx`
- Create: `src/app/(tabs)/layout.tsx`
- Create: `src/app/(tabs)/me/page.tsx`, `src/app/(tabs)/concern/page.tsx`, `src/app/(tabs)/mind/page.tsx`
- Move+Modify: `src/app/page.tsx` → `src/app/(tabs)/page.tsx` (홈)

**Interfaces:**
- Produces: 라우트 4개 — `/`(홈·오늘), `/me`(나), `/concern`(고민), `/mind`(마음). 이후 P2~P6이 각 페이지를 실제 기능으로 교체한다.

- [ ] **Step 1: BottomNav 컴포넌트 작성**

```tsx
// src/components/BottomNav.tsx
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
```

- [ ] **Step 2: 탭 그룹 레이아웃 작성**

```tsx
// src/app/(tabs)/layout.tsx
import BottomNav from "@/components/BottomNav";

export default function TabsLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="pb-20">
      {children}
      <BottomNav />
    </div>
  );
}
```

- [ ] **Step 3: 4개 페이지 작성 (기존 page.tsx는 삭제 후 재작성)**

```tsx
// src/app/(tabs)/page.tsx  (홈)
export default function HomePage() {
  return (
    <main className="p-6">
      <h1 className="font-[family-name:var(--font-serif-kr)] text-2xl text-primary-green">
        오늘의 이야기
      </h1>
      <p className="mt-3 text-text-soft">
        곧 이곳에서 매일의 기운을 전해드릴게요.
      </p>
    </main>
  );
}
```

```tsx
// src/app/(tabs)/me/page.tsx
export default function MePage() {
  return (
    <main className="p-6">
      <h1 className="font-[family-name:var(--font-serif-kr)] text-2xl text-primary-green">
        온전한 나
      </h1>
      <p className="mt-3 text-text-soft">
        당신의 조각들을 이어드릴 준비를 하고 있어요.
      </p>
    </main>
  );
}
```

```tsx
// src/app/(tabs)/concern/page.tsx
export default function ConcernPage() {
  return (
    <main className="p-6">
      <h1 className="font-[family-name:var(--font-serif-kr)] text-2xl text-primary-green">
        고민
      </h1>
      <p className="mt-3 text-text-soft">
        마음이 흔들리는 순간, 함께 생각해드릴게요.
      </p>
    </main>
  );
}
```

```tsx
// src/app/(tabs)/mind/page.tsx
export default function MindPage() {
  return (
    <main className="p-6">
      <h1 className="font-[family-name:var(--font-serif-kr)] text-2xl text-primary-green">
        마음
      </h1>
      <p className="mt-3 text-text-soft">
        이야기 나눌 수 있는 날이 머지않았어요.
      </p>
    </main>
  );
}
```

- [ ] **Step 4: 확인**

Run: `npm run dev`
Expected: 하단 탭 4개 표시, 탭 클릭으로 4개 페이지 이동, 활성 탭이 딥 그린으로 강조.

- [ ] **Step 5: Commit**

```powershell
git add -A ; git commit -m "feat: app shell with bottom tab navigation (home/me/concern/mind)"
```

---

### Task 4: Supabase 연동

**Files:**
- Create: `.env.local` (커밋 금지 — `.gitignore`에 이미 포함됨을 확인)
- Create: `src/lib/supabase/client.ts`, `src/lib/supabase/server.ts`
- Create: `.env.example`

**Interfaces:**
- Produces: `createClient()` (브라우저용), `createServerSupabase()` (서버 컴포넌트/라우트용, `Promise<SupabaseClient>` 반환). 이후 모든 DB·인증 접근은 이 두 함수만 사용한다.

- [ ] **Step 1: 🖐️ 수동 — Supabase 프로젝트 생성 (사용자 작업)**

1. https://supabase.com → 무료 가입 → New Project (이름: `omnimind`, 리전: Northeast Asia Seoul)
2. Project Settings → API에서 `Project URL`과 `anon public key` 복사

- [ ] **Step 2: 패키지 설치**

```powershell
npm install @supabase/supabase-js @supabase/ssr
```

- [ ] **Step 3: 환경 변수 파일 작성**

```bash
# .env.local  (실제 값 입력, 커밋 금지)
NEXT_PUBLIC_SUPABASE_URL=https://<프로젝트ID>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key>
```

```bash
# .env.example  (커밋용 — 키 이름만)
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

- [ ] **Step 4: 클라이언트 유틸 작성**

```ts
// src/lib/supabase/client.ts
import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
```

```ts
// src/lib/supabase/server.ts
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createServerSupabase() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Server Component에서 호출된 경우 미들웨어가 세션을 갱신하므로 무시 가능
          }
        },
      },
    },
  );
}
```

- [ ] **Step 5: 연결 확인**

Run: `npm run dev` 후 아무 페이지 접속 (빌드 오류 없는지), 이어서 `npm run build`
Expected: 타입 오류·빌드 오류 없음.

- [ ] **Step 6: Commit**

```powershell
git add src/lib/supabase .env.example package.json package-lock.json ; git commit -m "feat: Supabase client/server utilities"
```

---

### Task 5: 소셜 로그인 (카카오·구글)

**Files:**
- Create: `src/app/login/page.tsx`
- Create: `src/app/auth/callback/route.ts`
- Create: `src/middleware.ts`
- Modify: `src/app/(tabs)/me/page.tsx` (로그인 상태 표시 + 로그아웃)

**Interfaces:**
- Consumes: Task 4의 `createClient()`, `createServerSupabase()`
- Produces: `/login` 페이지, OAuth 콜백 `/auth/callback`, 전역 세션 갱신 미들웨어. 로그인 사용자는 `supabase.auth.getUser()`로 조회.

- [ ] **Step 1: 🖐️ 수동 — OAuth 앱 등록 (사용자 작업)**

1. **카카오:** https://developers.kakao.com → 앱 생성 → 카카오 로그인 활성화 → Redirect URI에 `https://<프로젝트ID>.supabase.co/auth/v1/callback` 등록 → REST API 키·Client Secret 복사
2. **구글:** https://console.cloud.google.com → OAuth 클라이언트 생성 → 같은 Redirect URI 등록 → Client ID·Secret 복사
3. **Supabase:** Authentication → Providers에서 Kakao, Google 켜고 위 키 입력

- [ ] **Step 2: 로그인 페이지 작성**

```tsx
// src/app/login/page.tsx
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
```

- [ ] **Step 3: OAuth 콜백 라우트 작성**

```ts
// src/app/auth/callback/route.ts
import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (code) {
    const supabase = await createServerSupabase();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${origin}/`);
  }
  return NextResponse.redirect(`${origin}/login?error=auth`);
}
```

- [ ] **Step 4: 세션 갱신 미들웨어 작성**

```ts
// src/middleware.ts
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // 세션 토큰 갱신 (만료 방지) — 결과는 쿠키에 반영됨
  await supabase.auth.getUser();
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
```

- [ ] **Step 5: '나' 탭에 로그인 상태 표시**

```tsx
// src/app/(tabs)/me/page.tsx  (전체 교체)
import Link from "next/link";
import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase/server";

export default async function MePage() {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  async function signOut() {
    "use server";
    const supabase = await createServerSupabase();
    await supabase.auth.signOut();
    redirect("/login");
  }

  return (
    <main className="p-6">
      <h1 className="font-[family-name:var(--font-serif-kr)] text-2xl text-primary-green">
        온전한 나
      </h1>
      {user ? (
        <div className="mt-4">
          <p className="text-text-soft">
            반가워요, {user.user_metadata?.name ?? "당신"}님. 곧 이곳에서
            당신의 조각들을 이어드릴게요.
          </p>
          <form action={signOut} className="mt-6">
            <button className="text-sm text-text-soft underline">
              잠시 떠나기 (로그아웃)
            </button>
          </form>
        </div>
      ) : (
        <div className="mt-4">
          <p className="text-text-soft">아직 우리, 인사를 못 나눴네요.</p>
          <Link
            href="/login"
            className="mt-6 block w-full rounded-card bg-accent-coral py-3.5 text-center font-medium text-white"
          >
            시작해볼까요?
          </Link>
        </div>
      )}
    </main>
  );
}
```

- [ ] **Step 6: 로그인 흐름 전체 확인**

Run: `npm run dev` → `/me` → "시작해볼까요?" → 카카오 로그인 → 콜백 → `/me`에서 이름 표시 → 로그아웃
Expected: 전 과정 오류 없이 동작. 구글도 동일 확인.

- [ ] **Step 7: Commit**

```powershell
git add -A ; git commit -m "feat: social login (Kakao/Google) via Supabase Auth with session middleware"
```

---

### Task 6: Vercel 배포

**Files:**
- 없음 (외부 설정 중심)

**Interfaces:**
- Produces: 공개 프로덕션 URL — P2 소프트 런칭의 배포 대상

- [ ] **Step 1: 🖐️ 수동 — Vercel 프로젝트 연결 (사용자 작업)**

1. https://vercel.com → GitHub 연동 → `swssmjy86/OmniMind` Import
2. Environment Variables에 `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` 입력 → Deploy

- [ ] **Step 2: 🖐️ 수동 — OAuth 리다이렉트에 프로덕션 URL 추가**

1. Supabase → Authentication → URL Configuration → Site URL을 Vercel URL로, Redirect URLs에 `https://<vercel-url>/auth/callback` 추가

- [ ] **Step 3: 프로덕션 검증 (P0 완료 기준)**

모바일 브라우저에서 Vercel URL 접속 → 카카오 로그인 → 4탭 이동
Expected: 전 과정 동작. **이것이 P0의 완료 기준.**

- [ ] **Step 4: 로드맵 체크 후 커밋**

`docs/superpowers/plans/2026-07-13-omnimind-roadmap.md`의 P0 표를 완료 표시로 갱신.

```powershell
git add docs ; git commit -m "docs: mark P0 complete in roadmap" ; git push
```
