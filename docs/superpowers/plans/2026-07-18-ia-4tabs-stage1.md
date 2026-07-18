# 4탭 IA 개편 1단계 — IA 골격 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 스펙 `docs/superpowers/specs/2026-07-18-omnimind-4tab-ia.md`의 1단계 — 탭 4개(홈/오늘의운세/사주팔자/보관함) 교체, `/today` 팝업 입력·무료/블러·전체 뷰, `/saju` 목록, `/archive`, 홈 개편, `/daily` 리다이렉트.

**Architecture:** 화면 재배치 중심 — 신규 상품 로직 없음. `/today`는 서버가 공통 일진을 계산해 내려주고, 비로그인 흐름(팝업·티저)은 클라이언트 컴포넌트가 localStorage로만 다룬다(잠긴 본문은 서버에서 아예 안 내려줌 — P9 §5.1). 카탈로그는 v2(7종)로 교체하고 기존 `PersonaCard`를 재사용한다.

**Tech Stack:** Next.js 16 (App Router) · Vitest + Testing Library · 기존 엔진·UI 킷(PickerInput·Choice)·페르소나 재사용

## Global Constraints

- **커밋 전 `npm run verify` 통과 필수.** 브랜치 `feat/ia-4tabs-stage1`(생성됨).
- **톤 규칙(§5.4):** 새 카피에서 `하세요`/`[가-힣]니다`/`조심하세요|나쁜 기운|불행`/`회원님|사용자님`/`사람이(에요|죠|야)` 금지. 공포·조급 유발 카피 금지.
- **잠긴 본문 서버 비노출(P9 §5.1):** 무료 화면의 블러 티저에는 **실제 개인화 내용이 DOM에 없다** — 제목·설명·CSS 자리표시자뿐.
- **비로그인 입력은 localStorage만**(`om-today-birth`) — 서버 저장 금지(스펙 §8).
- **엔진 클라이언트 번들 금지:** "use client" 파일은 `src/lib/engine/`에서 **타입만** import 가능, 값 import 금지.
- **기존 라우트 유지:** `/me` `/mind` `/concern` `/match` `/history`는 살아 있다(탭에서만 빠짐). 마음·고민 진입점은 로그인 잠금해제 화면(`/today` 전체 뷰·보관함)에만.
- 컴포넌트는 디자인 토큰만 참조. `persona-card`/`persona-star` CSS·`fade-rise`·`press` 재사용.
- 새 탭 페이지는 `src/app/(tabs)/` 그룹 안에 둔다(하단 탭바 노출).

## 파일 구조

```
src/lib/today/birth-store.ts / .test.ts              [신규] 입력 저장 파싱·검증(순수)
src/components/today/TodayInputSheet.tsx / .test.tsx  [신규] 바텀시트 입력 팝업(클라이언트)
src/components/today/TodayTeaser.tsx / .test.tsx      [신규] 블러 티저 3장 + 로그인 CTA(정적)
src/components/today/TodayFreeFlow.tsx                [신규] 비로그인 흐름(시트↔무료 뷰, 클라이언트)
src/app/(tabs)/today/page.tsx                         [신규] 오늘의운세 — 전체/무료 분기
src/app/daily/page.tsx                                [교체] /today로 리다이렉트
src/components/daily/YearForm.tsx·.test / DailySignSection.tsx·.test [삭제 — 년도 단독 흐름 폐기]
src/components/archive/ArchiveView.tsx / .test.tsx    [신규] 보관함 뷰(동기 — 게이트/목록)
src/app/(tabs)/archive/page.tsx                       [신규]
src/lib/persona/products.ts / .test.ts                [교체] 카탈로그 v2 — 7종
src/components/home/PersonaCard.test.tsx              [수정] v2 id 기준으로
src/app/(tabs)/saju/page.tsx / page.test.tsx          [신규] 사주팔자 목록(동기 — 테스트 가능)
src/app/(tabs)/page.tsx                               [교체] 홈 — 그리드·FAQ 발췌·(리뷰 자리)
src/components/home/ProductShelf.tsx / .test.tsx      [삭제 — 홈 그리드·/saju로 대체]
src/components/BottomNav.tsx / .test.tsx              [교체] 4탭
```

---

### Task 1: `/today` 조각 — 입력 저장소·바텀시트·블러 티저

**Files:**
- Create: `src/lib/today/birth-store.ts` / Test: `src/lib/today/birth-store.test.ts`
- Create: `src/components/today/TodayInputSheet.tsx` / Test: `src/components/today/TodayInputSheet.test.tsx`
- Create: `src/components/today/TodayTeaser.tsx` / Test: `src/components/today/TodayTeaser.test.tsx`

**Interfaces:**
- Consumes: `PickerInput`(`@/components/ui/PickerInput`), `Choice`(`@/components/ui/Choice`) — 기존 UI 킷
- Produces:
  - `interface TodayBirth { birthDate: string; birthTime: string; timeUnknown: boolean; gender: "male" | "female" | null }`
  - `const TODAY_BIRTH_KEY = "om-today-birth"`
  - `parseTodayBirth(raw: string | null): TodayBirth | null` (순수 — 형식 검증)
  - `TodayInputSheet({ onSaved }: { onSaved: (b: TodayBirth) => void })` — 저장 시 localStorage 기록 후 콜백
  - `TodayTeaser()` — 잠긴 카드 3장 + 로그인 CTA (props 없음, 정적)

- [ ] **Step 1: birth-store 실패 테스트**

`src/lib/today/birth-store.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { parseTodayBirth } from "./birth-store";

const valid = JSON.stringify({
  birthDate: "1990-06-15", birthTime: "07:30", timeUnknown: false, gender: "male",
});

describe("오늘의운세 입력 파싱 (스펙 §3 — localStorage만)", () => {
  it("정상 입력을 파싱한다", () => {
    expect(parseTodayBirth(valid)).toEqual({
      birthDate: "1990-06-15", birthTime: "07:30", timeUnknown: false, gender: "male",
    });
  });

  it("시간 모름이면 빈 birthTime을 허용한다", () => {
    const raw = JSON.stringify({ birthDate: "1990-06-15", birthTime: "", timeUnknown: true, gender: null });
    expect(parseTodayBirth(raw)?.timeUnknown).toBe(true);
  });

  it("깨진 값은 null — null·비JSON·형식 위반·잘못된 gender", () => {
    expect(parseTodayBirth(null)).toBeNull();
    expect(parseTodayBirth("not-json")).toBeNull();
    expect(parseTodayBirth(JSON.stringify({ birthDate: "1990/06/15", birthTime: "", timeUnknown: true }))).toBeNull();
    expect(parseTodayBirth(JSON.stringify({ birthDate: "1990-06-15", birthTime: "7시", timeUnknown: false }))).toBeNull();
    expect(parseTodayBirth(JSON.stringify({ birthDate: "1990-06-15", birthTime: "", timeUnknown: true, gender: "x" }))).toBeNull();
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `npx vitest run src/lib/today/birth-store.test.ts`
Expected: FAIL — `Cannot find module './birth-store'`

- [ ] **Step 3: birth-store 구현**

`src/lib/today/birth-store.ts`:

```ts
// 오늘의운세 비로그인 입력(스펙 §3) — localStorage 전용. 서버 저장 없음(스펙 §8).
// 파싱·검증은 순수 함수로 분리해 테스트한다. localStorage 접근은 클라이언트 컴포넌트 몫.

export interface TodayBirth {
  birthDate: string;                 // "YYYY-MM-DD"
  birthTime: string;                 // "HH:MM" — timeUnknown이면 "" 허용
  timeUnknown: boolean;
  gender: "male" | "female" | null;  // 선택
}

export const TODAY_BIRTH_KEY = "om-today-birth";

/** localStorage 원문 → TodayBirth. 형식이 하나라도 어긋나면 null(입력 다시 받기). */
export function parseTodayBirth(raw: string | null): TodayBirth | null {
  if (!raw) return null;
  try {
    const d = JSON.parse(raw) as Partial<TodayBirth>;
    if (typeof d.birthDate !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(d.birthDate)) return null;
    if (typeof d.timeUnknown !== "boolean") return null;
    if (
      typeof d.birthTime !== "string" ||
      (!d.timeUnknown && !/^\d{2}:\d{2}$/.test(d.birthTime))
    )
      return null;
    if (d.gender != null && d.gender !== "male" && d.gender !== "female") return null;
    return {
      birthDate: d.birthDate,
      birthTime: d.birthTime,
      timeUnknown: d.timeUnknown,
      gender: d.gender ?? null,
    };
  } catch {
    return null;
  }
}
```

Run: `npx vitest run src/lib/today/birth-store.test.ts` → PASS (3 tests)

- [ ] **Step 4: TodayInputSheet 실패 테스트**

`src/components/today/TodayInputSheet.test.tsx`:

```tsx
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import TodayInputSheet from "./TodayInputSheet";
import { TODAY_BIRTH_KEY } from "@/lib/today/birth-store";

describe("오늘의운세 입력 시트 (스펙 §3 팝업)", () => {
  beforeEach(() => window.localStorage.clear());

  it("생년월일·태어난 시·시간 몰라요·성별·확인 버튼을 렌더한다", () => {
    render(<TodayInputSheet onSaved={() => {}} />);
    expect(screen.getByText("태어난 날")).toBeInTheDocument();
    expect(screen.getByText("태어난 시간")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "시간을 몰라요" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "남성" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "여성" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "오늘의 기운 보기" })).toBeDisabled();
  });

  it("날짜 + 시간 몰라요면 제출 가능해지고, 저장 후 콜백·localStorage에 남는다", () => {
    const onSaved = vi.fn();
    const { container } = render(<TodayInputSheet onSaved={onSaved} />);
    const dateInput = container.querySelector('input[type="date"]')!;
    fireEvent.change(dateInput, { target: { value: "1990-06-15" } });
    fireEvent.click(screen.getByRole("button", { name: "시간을 몰라요" }));
    const submit = screen.getByRole("button", { name: "오늘의 기운 보기" });
    expect(submit).not.toBeDisabled();
    fireEvent.click(submit);
    expect(onSaved).toHaveBeenCalledWith({
      birthDate: "1990-06-15", birthTime: "", timeUnknown: true, gender: null,
    });
    expect(window.localStorage.getItem(TODAY_BIRTH_KEY)).toContain("1990-06-15");
  });
});
```

- [ ] **Step 5: 실패 확인**

Run: `npx vitest run src/components/today/TodayInputSheet.test.tsx`
Expected: FAIL — `Cannot find module './TodayInputSheet'`

- [ ] **Step 6: TodayInputSheet 구현**

`src/components/today/TodayInputSheet.tsx`:

```tsx
"use client";

import { useState } from "react";
import PickerInput from "@/components/ui/PickerInput";
import Choice from "@/components/ui/Choice";
import { TODAY_BIRTH_KEY, type TodayBirth } from "@/lib/today/birth-store";

/**
 * 오늘의운세 입력 팝업(스펙 §3) — 새창이 아닌 바텀시트. 입력은 localStorage에만 저장한다.
 * 시간 미상(timeUnknown)·성별 미선택을 허용한다 — 온보딩과 같은 결.
 */
export default function TodayInputSheet({
  onSaved,
}: {
  onSaved: (b: TodayBirth) => void;
}) {
  const [birthDate, setBirthDate] = useState("");
  const [birthTime, setBirthTime] = useState("");
  const [timeUnknown, setTimeUnknown] = useState(false);
  const [gender, setGender] = useState<"male" | "female" | null>(null);

  const canSubmit = /^\d{4}-\d{2}-\d{2}$/.test(birthDate) && (timeUnknown || /^\d{2}:\d{2}$/.test(birthTime));

  const submit = () => {
    const b: TodayBirth = {
      birthDate,
      birthTime: timeUnknown ? "" : birthTime,
      timeUnknown,
      gender,
    };
    try {
      window.localStorage.setItem(TODAY_BIRTH_KEY, JSON.stringify(b));
    } catch {
      // 저장 불가(시크릿 모드 등)여도 이번 화면은 계속
    }
    onSaved(b);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      {/* 딤 배경 — 닫기 없음(입력해야 진행되는 첫 관문) */}
      <div aria-hidden className="absolute inset-0 bg-black/50" />
      <div className="fade-rise relative w-full max-w-[var(--shell-width)] rounded-t-[28px] bg-warm-base p-6 pb-8 lg:max-w-[var(--shell-width-lg)]">
        <p className="text-xs text-text-soft">
          <span aria-hidden>🏮</span> 달지기 · 오늘의운세
        </p>
        <h2 className="mt-1 font-[family-name:var(--font-serif-kr)] text-xl text-primary-green">
          태어난 날을 알려주실래요?
        </h2>
        <p className="mt-1 text-sm text-text-soft">
          오늘의 기운을 당신에게 맞춰 보여드릴게요. 입력한 정보는 이 기기에만 저장돼요.
        </p>

        <label className="mt-5 block text-sm text-text-soft">태어난 날</label>
        <div className="mt-1">
          <PickerInput type="date" value={birthDate} onChange={setBirthDate} placeholder="생년월일을 선택해 주세요" />
        </div>

        <label className="mt-4 block text-sm text-text-soft">태어난 시간</label>
        <div className="mt-1">
          <PickerInput
            type="time"
            value={birthTime}
            onChange={setBirthTime}
            placeholder="태어난 시각을 선택해 주세요"
            disabled={timeUnknown}
          />
        </div>
        <div className="mt-2 grid grid-cols-1">
          <Choice small selected={timeUnknown} onClick={() => setTimeUnknown(!timeUnknown)}>
            시간을 몰라요
          </Choice>
        </div>

        <label className="mt-4 block text-sm text-text-soft">성별 (선택)</label>
        <div className="mt-1 grid grid-cols-2 gap-2">
          <Choice small selected={gender === "male"} onClick={() => setGender(gender === "male" ? null : "male")}>
            남성
          </Choice>
          <Choice small selected={gender === "female"} onClick={() => setGender(gender === "female" ? null : "female")}>
            여성
          </Choice>
        </div>

        <button
          type="button"
          disabled={!canSubmit}
          onClick={submit}
          className="press mt-6 w-full rounded-card bg-accent-coral py-3.5 font-medium text-white disabled:opacity-40"
        >
          오늘의 기운 보기
        </button>
      </div>
    </div>
  );
}
```

Run: `npx vitest run src/components/today/TodayInputSheet.test.tsx` → PASS (2 tests)

- [ ] **Step 7: TodayTeaser 실패 테스트**

`src/components/today/TodayTeaser.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import TodayTeaser from "./TodayTeaser";

describe("블러 티저 (스펙 §3 — 개인화부터 잠금)", () => {
  it("잠긴 카드 3장 제목과 로그인 CTA를 렌더한다", () => {
    render(<TodayTeaser />);
    expect(screen.getByText("내 일간으로 본 오늘")).toBeInTheDocument();
    expect(screen.getByText("내 띠와 오늘")).toBeInTheDocument();
    expect(screen.getByText("AI가 다듬은 오늘의 이야기")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /로그인하고 모두 열어보기/ })).toHaveAttribute("href", "/login");
  });

  it("잠긴 본문은 DOM에 없다 — 자리표시자는 aria-hidden 장식뿐 (P9 §5.1)", () => {
    const { container } = render(<TodayTeaser />);
    // 개인화 문구의 흔적(십성·관계 문장 등)이 텍스트로 존재하지 않는다
    expect(container.textContent).not.toMatch(/기운이에요|날이에요|육합|삼합/);
    // 자리표시자 막대는 전부 aria-hidden
    const bars = container.querySelectorAll(".teaser-bar");
    expect(bars.length).toBeGreaterThan(0);
    for (const bar of bars) expect(bar).toHaveAttribute("aria-hidden");
  });
});
```

- [ ] **Step 8: 실패 확인 후 TodayTeaser 구현**

Run: `npx vitest run src/components/today/TodayTeaser.test.tsx` → FAIL (모듈 없음)

`src/components/today/TodayTeaser.tsx`:

```tsx
import Link from "next/link";

// 잠긴 카드 목록(스펙 §3) — 제목·설명만 있고 본문은 서버가 아예 만들지 않는다(P9 §5.1).
// 블러 느낌은 CSS 자리표시자 막대로만 낸다.
const TEASERS = [
  { title: "내 일간으로 본 오늘", desc: "타고난 기운과 오늘이 만나는 결" },
  { title: "내 띠와 오늘", desc: "내 띠와 오늘 일진이 맺는 관계" },
  { title: "AI가 다듬은 오늘의 이야기", desc: "당신만을 위해 다듬은 문장" },
] as const;

/** 무료 화면의 블러 티저 — 정적. 개인화 내용은 이 컴포넌트 어디에도 없다. */
export default function TodayTeaser() {
  return (
    <section className="mt-4" aria-label="잠긴 풀이">
      <div className="flex flex-col gap-3">
        {TEASERS.map((t) => (
          <div key={t.title} className="rounded-card bg-warm-surface p-5">
            <p className="flex items-center gap-2 text-sm font-medium text-text-main">
              <span aria-hidden>🔒</span> {t.title}
            </p>
            <p className="mt-1 text-xs text-text-soft">{t.desc}</p>
            <div className="mt-3 space-y-2">
              <div aria-hidden className="teaser-bar h-3 w-11/12 rounded-full bg-text-soft/15 blur-[2px]" />
              <div aria-hidden className="teaser-bar h-3 w-4/5 rounded-full bg-text-soft/15 blur-[2px]" />
              <div aria-hidden className="teaser-bar h-3 w-2/3 rounded-full bg-text-soft/15 blur-[2px]" />
            </div>
          </div>
        ))}
      </div>
      <Link
        href="/login"
        className="press mt-4 block w-full rounded-card bg-accent-coral py-3.5 text-center font-medium text-white"
      >
        로그인하고 모두 열어보기 ✨
      </Link>
      <p className="mt-2 text-center text-xs text-text-soft">
        로그인하면 기록이 보관함에 차곡차곡 쌓여요.
      </p>
    </section>
  );
}
```

Run: `npx vitest run src/components/today/TodayTeaser.test.tsx` → PASS (2 tests)

- [ ] **Step 9: 검증 후 커밋**

```bash
npm run verify
git add src/lib/today/ src/components/today/
git commit -m "feat(today): 오늘의운세 조각 — 입력 저장소(localStorage)·바텀시트 팝업·블러 티저(본문 비노출)"
```

---

### Task 2: `/today` 페이지 + 비로그인 흐름 + `/daily` 정리

**Files:**
- Create: `src/components/today/TodayFreeFlow.tsx`
- Create: `src/app/(tabs)/today/page.tsx`
- Modify: `src/app/daily/page.tsx` (전체 교체 — 리다이렉트)
- Delete: `src/components/daily/YearForm.tsx`, `YearForm.test.tsx`, `DailySignSection.tsx`, `DailySignSection.test.tsx` (년도 단독 무료 개인화는 "기본만 무료" 결정과 상충 — 스펙 §3)

**Interfaces:**
- Consumes: Task 1 전부, `computeDaily`/`assembleDaily`/`toKstParts`, `yearSign` 모듈의 `ZODIAC_ANIMALS`·`branchRelation`(**서버에서만**), `relationLine`(`@/lib/interpret/content/year-sign`), `EARTHLY_BRANCHES`, `PERSONAS`, `DailyRecorder`, `ShareSheet`, `dailyCardQuery`
- Produces: `/today` 라우트(탭). `TodayFreeFlow({ headline, mind, color, keyword, lucky })` — 클라이언트, 시트↔무료 뷰 전환.

- [ ] **Step 1: TodayFreeFlow 구현** (클라이언트 조각 — 시트·티저는 Task 1에서 테스트됨, 이 조각은 상태 전환 래퍼라 페이지 검증으로 커버)

`src/components/today/TodayFreeFlow.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";
import TodayInputSheet from "./TodayInputSheet";
import TodayTeaser from "./TodayTeaser";
import { TODAY_BIRTH_KEY, parseTodayBirth, type TodayBirth } from "@/lib/today/birth-store";

/**
 * 비로그인 오늘의운세 흐름(스펙 §3): 저장된 입력이 없으면 바텀시트가 뜨고,
 * 저장되면 무료 공통 일진 + 블러 티저를 보여준다. 공통 일진은 서버가 계산해 props로 내려준다
 * — 이 컴포넌트는 엔진을 모른다(클라이언트 번들 보호).
 * localStorage는 마운트 후(useEffect)에만 읽는다 — 시트 표시 여부는 구조 차이라
 * 초기화식에서 읽으면 하이드레이션 불일치가 난다.
 */
export default function TodayFreeFlow({
  headline,
  mind,
  color,
  keyword,
  lucky,
}: {
  headline: string;
  mind: string;
  color: string;
  keyword: string;
  lucky: string;
}) {
  const [ready, setReady] = useState(false);
  const [birth, setBirth] = useState<TodayBirth | null>(null);
  useEffect(() => {
    setBirth(parseTodayBirth(window.localStorage.getItem(TODAY_BIRTH_KEY)));
    setReady(true);
  }, []);

  return (
    <>
      <section className="persona-card mt-5 rounded-card bg-warm-surface p-6">
        <span aria-hidden className="persona-star" style={{ top: "12%", right: "10%" }} />
        <span aria-hidden className="persona-star" style={{ top: "26%", right: "24%" }} />
        <span aria-hidden className="persona-star" style={{ top: "16%", right: "38%" }} />
        <p className="text-xs text-text-soft">
          <span aria-hidden>🏮</span> 달지기 · 오늘의운세 — 누구나 무료
        </p>
        <p className="mt-2 font-[family-name:var(--font-serif-kr)] text-lg leading-relaxed text-primary-green">
          {headline}
        </p>
        <p className="mt-3 leading-relaxed text-text-main">{mind}</p>
        <div className="mt-5 flex gap-2">
          <span className="rounded-full bg-warm-base px-3 py-1.5 text-sm text-text-soft">
            오늘의 색 · {color}
          </span>
          <span className="rounded-full bg-warm-base px-3 py-1.5 text-sm text-text-soft">{keyword}</span>
        </div>
        <p className="mt-4 text-sm text-text-soft">🍀 행운 포인트 — {lucky}</p>
      </section>

      <TodayTeaser />

      {ready && !birth && <TodayInputSheet onSaved={setBirth} />}
      {ready && birth && (
        <button
          type="button"
          onClick={() => setBirth(null)}
          className="mt-3 block w-full text-center text-xs text-text-soft underline"
        >
          태어난 정보 다시 입력하기
        </button>
      )}
    </>
  );
}
```

- [ ] **Step 2: `/today` 페이지 구현**

`src/app/(tabs)/today/page.tsx`:

```tsx
import Link from "next/link";
import type { Metadata } from "next";
import { createServerSupabase } from "@/lib/supabase/server";
import { computeDaily } from "@/lib/engine/daily";
import { assembleDaily } from "@/lib/interpret/content/daily";
import { toKstParts } from "@/lib/engine/kst";
import { EARTHLY_BRANCHES } from "@/lib/engine/constants";
import { ZODIAC_ANIMALS, branchRelation } from "@/lib/engine/year-sign";
import { relationLine } from "@/lib/interpret/content/year-sign";
import { PERSONAS } from "@/lib/persona/personas";
import DailyRecorder from "@/components/DailyRecorder";
import ShareSheet from "@/components/share/ShareSheet";
import TodayFreeFlow from "@/components/today/TodayFreeFlow";
import { dailyCardQuery } from "@/lib/share/card-copy";
import type { ProfileRow, InterpretationRow } from "@/lib/db/types";

export const metadata: Metadata = {
  title: "오늘의운세 — 옴니마인드",
  description: "매일 새로 흐르는 오늘의 기운 — 기본은 누구나 무료.",
};

export const dynamic = "force-dynamic"; // 날짜·세션에 따라 매번 렌더

/**
 * 오늘의운세 탭(스펙 §3) — 로그인+프로필이면 전체(심화+띠 관계+마음 챗 진입),
 * 아니면 무료 공통 일진 + 블러 티저(입력 팝업 포함). 잠긴 개인화 본문은
 * 비로그인 응답에 아예 없다(P9 §5.1).
 */
export default async function TodayPage() {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();

  const todayKst = toKstParts(new Date());
  const todayDateStr = `${todayKst.y}-${String(todayKst.mo).padStart(2, "0")}-${String(todayKst.d).padStart(2, "0")}`;

  let profile: ProfileRow | null = null;
  let cachedDaily: InterpretationRow | null = null;
  if (user) {
    const [profileRes, cachedRes] = await Promise.all([
      supabase.from("profiles").select("*").eq("user_id", user.id).maybeSingle<ProfileRow>(),
      supabase.from("interpretations").select("*")
        .eq("user_id", user.id).eq("kind", "daily").eq("target_date", todayDateStr)
        .maybeSingle<InterpretationRow>(),
    ]);
    profile = profileRes.data ?? null;
    cachedDaily = cachedRes.data ?? null;
  }

  // ── 전체 뷰: 로그인+프로필 — 심화 일진 + 띠 관계 + 마음 챗 진입 ──
  if (profile) {
    const daily = computeDaily(
      { y: todayKst.y, mo: todayKst.mo, d: todayKst.d },
      profile.profile_context.dayMaster.element,
      profile.profile_context.dayMaster.stem,
    );
    const guide = assembleDaily(daily, profile.nickname);
    const llmParagraph =
      cachedDaily?.body.find((s) => s.title === "오늘, 당신만을 위한 이야기")?.body ?? null;

    // 띠 관계 — 프로필 년주(pillars.year = "경오" 등)의 지지 × 오늘 일진 지지
    const yearBranch = EARTHLY_BRANCHES.indexOf(
      profile.profile_context.pillars.year[1] as (typeof EARTHLY_BRANCHES)[number],
    );
    const todayBranch = EARTHLY_BRANCHES.indexOf(
      daily.dayGanzhi[1] as (typeof EARTHLY_BRANCHES)[number],
    );
    const signLine =
      yearBranch >= 0 ? relationLine(branchRelation(yearBranch, todayBranch)) : null;

    return (
      <main className="fade-rise p-6">
        <h1 className="font-[family-name:var(--font-serif-kr)] text-2xl text-primary-green">
          오늘의운세
        </h1>
        <section className="persona-card mt-5 rounded-card bg-warm-surface p-6">
          <span aria-hidden className="persona-star" style={{ top: "12%", right: "10%" }} />
          <span aria-hidden className="persona-star" style={{ top: "26%", right: "24%" }} />
          <span aria-hidden className="persona-star" style={{ top: "16%", right: "38%" }} />
          <p className="text-xs text-text-soft">
            <span aria-hidden>🏮</span> {PERSONAS.dalzigi.name} · 오늘의운세
          </p>
          <p className="mt-2 font-[family-name:var(--font-serif-kr)] text-lg leading-relaxed text-primary-green">
            {guide.headline}
          </p>
          <p className="mt-3 leading-relaxed text-text-main">{guide.mind}</p>
          {guide.personal && (
            <p className="mt-3 rounded-card bg-warm-base p-3 text-sm leading-relaxed text-text-main">
              {guide.personal}
            </p>
          )}
          {signLine && (
            <p className="mt-3 rounded-card bg-warm-base p-3 text-sm leading-relaxed text-text-main">
              <span className="text-text-soft">
                {ZODIAC_ANIMALS[yearBranch]}띠인 당신에게 —{" "}
              </span>
              {signLine}
            </p>
          )}
          {llmParagraph && (
            <p className="mt-3 rounded-card border border-primary-green/20 bg-warm-base p-3 text-sm leading-relaxed text-text-main">
              🌿 {llmParagraph}
            </p>
          )}
          <div className="mt-5 flex gap-2">
            <span className="rounded-full bg-warm-base px-3 py-1.5 text-sm text-text-soft">
              오늘의 색 · {guide.color}
            </span>
            <span className="rounded-full bg-warm-base px-3 py-1.5 text-sm text-text-soft">
              {guide.keyword}
            </span>
          </div>
          <p className="mt-4 text-sm text-text-soft">🍀 행운 포인트 — {guide.lucky}</p>

          <details className="mt-4 text-xs text-text-soft">
            <summary className="cursor-pointer">이 풀이의 근거</summary>
            <ul className="mt-2 list-disc space-y-1 pl-4">
              <li>일진은 천문 산술로 계산해 한국천문연구원 공표값 467건과 대조해 확인했어요.</li>
              <li>절기는 태양의 실제 위치로 구해 미국 해군천문대 공표값과 대조해요.</li>
              <li>계산에는 AI가 관여하지 않아요 — 문장을 다듬는 일만 맡아요.</li>
            </ul>
            <Link href="/sources" className="mt-2 inline-block underline">
              전체 근거 보기
            </Link>
          </details>
        </section>

        {/* 마음 챗 진입 — 잠금 해제된 화면에만 노출(확정 결정 7) */}
        <Link
          href="/mind"
          className="press mt-4 block rounded-card bg-warm-surface p-4 text-center text-sm text-text-main"
        >
          💬 오늘 마음에 남는 게 있다면 — 마음 챗
        </Link>

        <DailyRecorder />
        <ShareSheet
          query={dailyCardQuery(profile.profile_context, guide)}
          via="daily"
          label="오늘의 나 카드"
        />
        <Link href="/archive" className="mt-4 block text-center text-sm text-text-soft underline">
          지난 기록 보기 (보관함)
        </Link>
      </main>
    );
  }

  // ── 무료 뷰: 공통 일진만 서버 계산 — 개인화 결과는 이 응답에 없다 ──
  const daily = computeDaily({ y: todayKst.y, mo: todayKst.mo, d: todayKst.d });
  const guide = assembleDaily(daily);

  return (
    <main className="fade-rise p-6">
      <h1 className="font-[family-name:var(--font-serif-kr)] text-2xl text-primary-green">
        오늘의운세
      </h1>
      <p className="mt-1 text-sm text-text-soft">
        <span aria-hidden>🏮</span> {PERSONAS.dalzigi.homeLine}
      </p>
      <TodayFreeFlow
        headline={guide.headline}
        mind={guide.mind}
        color={guide.color}
        keyword={guide.keyword}
        lucky={guide.lucky}
      />
    </main>
  );
}
```

- [ ] **Step 3: `/daily` 리다이렉트 교체 + 구 컴포넌트 삭제**

`src/app/daily/page.tsx` 전체를 다음으로 교체:

```tsx
import { redirect } from "next/navigation";

// 년도 단독 흐름은 4탭 IA의 오늘의운세 탭으로 대체됐다(스펙 §3). 링크 호환용 리다이렉트.
export default function DailyRedirect() {
  redirect("/today");
}
```

삭제:

```bash
git rm src/components/daily/YearForm.tsx src/components/daily/YearForm.test.tsx src/components/daily/DailySignSection.tsx src/components/daily/DailySignSection.test.tsx
```

- [ ] **Step 4: 검증**

Run: `npm run verify`
Expected: 통과 — 삭제된 컴포넌트를 참조하는 곳이 남아 있으면 typecheck가 잡는다(구 `/daily` 페이지가 유일한 사용처였음). `npm run dev`에서 `/today` 비로그인: 시트 → 입력 → 무료 카드+티저(개인화 문구 없음), `/daily` → `/today` 리다이렉트 확인.

- [ ] **Step 5: 커밋**

```bash
git add -A
git commit -m "feat(today): 오늘의운세 탭 — 전체/무료 분기·팝업 흐름·/daily 리다이렉트·년도 단독 흐름 폐기"
```

---

### Task 3: 보관함 (`/archive`)

**Files:**
- Create: `src/components/archive/ArchiveView.tsx` / Test: `src/components/archive/ArchiveView.test.tsx`
- Create: `src/app/(tabs)/archive/page.tsx`

**Interfaces:**
- Consumes: 기존 `interpretations`(kind=daily) 조회 패턴(`/history`와 동일)
- Produces: `interface ArchiveEntry { id: string; date: string; headline: string }`, `ArchiveView({ loggedIn, entries }: { loggedIn: boolean; entries: ArchiveEntry[] })` — 기본 export(동기·테스트 가능), `/archive` 라우트

- [ ] **Step 1: 실패하는 테스트 작성**

`src/components/archive/ArchiveView.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import ArchiveView from "./ArchiveView";

describe("보관함 (스펙 §5)", () => {
  it("비로그인 — 로그인 게이트만 보여준다", () => {
    render(<ArchiveView loggedIn={false} entries={[]} />);
    expect(screen.getByText(/기록을 남기고 다시 보려면/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /로그인하고 시작하기/ })).toHaveAttribute("href", "/login");
    expect(screen.queryByText("오늘의운세 기록")).not.toBeInTheDocument();
  });

  it("로그인 — 기록 목록과 마음·고민 진입을 보여준다", () => {
    render(
      <ArchiveView
        loggedIn
        entries={[{ id: "1", date: "2026-07-18", headline: "오늘은 화(병오)의 기운이 흐르는 날이에요." }]}
      />,
    );
    expect(screen.getByText("오늘의운세 기록")).toBeInTheDocument();
    expect(screen.getByText("2026-07-18")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /마음 대화/ })).toHaveAttribute("href", "/mind");
    expect(screen.getByRole("link", { name: /고민 기록/ })).toHaveAttribute("href", "/concern");
  });

  it("로그인 + 기록 0건 — 빈 상태 안내", () => {
    render(<ArchiveView loggedIn entries={[]} />);
    expect(screen.getByText(/아직 쌓인 기록이 없어요/)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `npx vitest run src/components/archive/ArchiveView.test.tsx`
Expected: FAIL — `Cannot find module './ArchiveView'`

- [ ] **Step 3: ArchiveView 구현**

`src/components/archive/ArchiveView.tsx`:

```tsx
import Link from "next/link";

export interface ArchiveEntry {
  id: string;
  date: string;     // "YYYY-MM-DD"
  headline: string; // 그날 "오늘의 기운" 한 줄
}

/**
 * 보관함(스펙 §5) — 로그인해야 기록이 쌓인다. 비로그인은 게이트만.
 * 마음·고민 진입은 로그인 화면에만 노출한다(확정 결정 7).
 */
export default function ArchiveView({
  loggedIn,
  entries,
}: {
  loggedIn: boolean;
  entries: ArchiveEntry[];
}) {
  if (!loggedIn) {
    return (
      <section className="mt-8 rounded-card bg-warm-surface p-6 text-center">
        <p aria-hidden className="text-3xl">📦</p>
        <p className="mt-3 leading-relaxed text-text-main">
          기록을 남기고 다시 보려면 로그인이 필요해요.
        </p>
        <p className="mt-1 text-sm text-text-soft">
          오늘의운세와 풀이들이 여기에 차곡차곡 쌓여요.
        </p>
        <Link
          href="/login"
          className="press mt-5 block w-full rounded-card bg-accent-coral py-3.5 font-medium text-white"
        >
          로그인하고 시작하기
        </Link>
      </section>
    );
  }

  return (
    <>
      <section className="mt-6">
        <h2 className="font-[family-name:var(--font-serif-kr)] text-lg text-primary-green">
          오늘의운세 기록
        </h2>
        {entries.length === 0 ? (
          <p className="mt-3 text-sm text-text-soft">
            아직 쌓인 기록이 없어요. 오늘의운세에 매일 들르면 하나씩 모여요 🌱
          </p>
        ) : (
          <ul className="mt-3 space-y-3">
            {entries.map((e) => (
              <li key={e.id} className="rounded-card bg-warm-surface p-4">
                <p className="text-xs text-text-soft">{e.date}</p>
                <p className="mt-1 text-sm leading-relaxed text-text-main">{e.headline}</p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-6">
        <h2 className="font-[family-name:var(--font-serif-kr)] text-lg text-primary-green">
          이어지는 이야기
        </h2>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <Link href="/mind" className="press rounded-card bg-warm-surface p-4 text-center text-sm text-text-main">
            💬 마음 대화
          </Link>
          <Link href="/concern" className="press rounded-card bg-warm-surface p-4 text-center text-sm text-text-main">
            🧭 고민 기록
          </Link>
        </div>
      </section>
    </>
  );
}
```

Run: `npx vitest run src/components/archive/ArchiveView.test.tsx` → PASS (3 tests)

- [ ] **Step 4: 페이지 구현**

`src/app/(tabs)/archive/page.tsx`:

```tsx
import type { Metadata } from "next";
import { createServerSupabase } from "@/lib/supabase/server";
import ArchiveView, { type ArchiveEntry } from "@/components/archive/ArchiveView";
import type { InterpretationRow } from "@/lib/db/types";

export const metadata: Metadata = { title: "보관함 — 옴니마인드" };
export const dynamic = "force-dynamic";

export default async function ArchivePage() {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();

  let entries: ArchiveEntry[] = [];
  if (user) {
    const { data } = await supabase
      .from("interpretations").select("*")
      .eq("user_id", user.id).eq("kind", "daily")
      .order("target_date", { ascending: false }).limit(30)
      .returns<InterpretationRow[]>();
    entries = (data ?? []).map((r) => ({
      id: r.id,
      date: r.target_date ?? "",
      headline: r.body.find((s) => s.title === "오늘의 기운")?.body ?? "",
    }));
  }

  return (
    <main className="fade-rise p-6">
      <h1 className="font-[family-name:var(--font-serif-kr)] text-2xl text-primary-green">
        보관함
      </h1>
      <ArchiveView loggedIn={Boolean(user)} entries={entries} />
    </main>
  );
}
```

- [ ] **Step 5: 검증 후 커밋**

```bash
npm run verify
git add src/components/archive/ src/app/(tabs)/archive/
git commit -m "feat(archive): 보관함 탭 — 로그인 게이트·오늘의운세 기록·마음/고민 진입"
```

---

### Task 4: IA 스위치 — 카탈로그 v2 · `/saju` · 홈 개편 · 4탭

카탈로그 교체는 셸프·카드 테스트와 얽혀 있어 **한 태스크에서 원자적으로** 바꾼다(중간 상태에서 verify가 깨지지 않도록).

**Files:**
- Modify: `src/lib/persona/products.ts` (전체 교체 — v2), `src/lib/persona/products.test.ts` (전체 교체)
- Modify: `src/components/home/PersonaCard.test.tsx` (v2 id 기준)
- Create: `src/app/(tabs)/saju/page.tsx` / Test: `src/app/(tabs)/saju/page.test.tsx`
- Modify: `src/app/(tabs)/page.tsx` (전체 교체 — 홈 v2)
- Delete: `src/components/home/ProductShelf.tsx`, `ProductShelf.test.tsx`
- Modify: `src/components/BottomNav.tsx`, `src/components/BottomNav.test.tsx` (전체 교체)

**Interfaces:**
- Consumes: `PersonaCard`(유지), `FAQ_ITEMS`(`@/app/faq/page`), `PERSONAS`
- Produces:
  - `type ProductId = "today" | "chongun" | "career" | "love" | "wealth" | "match" | "marriage"`
  - `PRODUCTS: Product[]` — 순서: today, chongun, career, love, wealth, match, marriage (Product 형태·`ACCESS_LABEL`은 기존과 동일)
  - `/saju` 라우트(동기), 홈 v2, 4탭 내비

- [ ] **Step 1: 카탈로그 v2 테스트 교체**

`src/lib/persona/products.test.ts` 전체 교체:

```ts
import { describe, expect, it } from "vitest";
import { checkTone, checkToneWarnings } from "@/lib/interpret/tone-guard";
import { PERSONAS } from "./personas";
import { ACCESS_LABEL, PRODUCTS } from "./products";

describe("상품 카탈로그 v2 (4탭 IA 스펙 §4)", () => {
  it("7종 — today + 총운/직업/연애/재물/궁합/결혼", () => {
    expect(PRODUCTS.map((p) => p.id)).toEqual([
      "today", "chongun", "career", "love", "wealth", "match", "marriage",
    ]);
  });

  it("접근 등급 — today 무료, 총운 로그인 무료, 나머지 크레딧 (확정 결정 5)", () => {
    const access = Object.fromEntries(PRODUCTS.map((p) => [p.id, p.access]));
    expect(access).toEqual({
      today: "free", chongun: "login",
      career: "credit", love: "credit", wealth: "credit", match: "credit", marriage: "credit",
    });
  });

  it("페르소나 — 서온=총운·직업, 홍연=연애·궁합·결혼, 금오=재물, 달지기=today", () => {
    const persona = Object.fromEntries(PRODUCTS.map((p) => [p.id, p.personaId]));
    expect(persona).toEqual({
      today: "dalzigi", chongun: "seoon", career: "seoon",
      love: "hongyeon", match: "hongyeon", marriage: "hongyeon", wealth: "geumo",
    });
    for (const p of PRODUCTS) expect(PERSONAS[p.personaId]).toBeDefined();
  });

  it("1단계 연결 — today=/today, chongun=/me, match=/match live; 나머지 soon", () => {
    const href = Object.fromEntries(PRODUCTS.map((p) => [p.id, `${p.status}:${p.href}`]));
    expect(href).toEqual({
      today: "live:/today", chongun: "live:/me", match: "live:/match",
      career: "soon:", love: "soon:", wealth: "soon:", marriage: "soon:",
    });
  });

  it("카피가 톤 가드를 통과한다", () => {
    const texts = [
      ...PRODUCTS.flatMap((p) => [p.title, p.tagline]),
      ...Object.values(ACCESS_LABEL),
    ];
    for (const t of texts) {
      expect(checkTone(t)).toEqual([]);
      expect(checkToneWarnings(t)).toEqual([]);
    }
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `npx vitest run src/lib/persona/products.test.ts`
Expected: FAIL — 구 카탈로그(5종 daily/profile_deep/…)와 불일치

- [ ] **Step 3: 카탈로그 v2 구현**

`src/lib/persona/products.ts` 전체 교체:

```ts
// 상품 카탈로그 v2(4탭 IA 스펙 §4) — 표현 계층 순수 상수. 접근 "규칙"(잠금·크레딧 차감)은
// 2단계에서 consult/quota.ts의 readingAccess로 들어간다. 여기는 홈 그리드·사주팔자 탭이
// 함께 쓰는 라인업 메타데이터만 둔다.

import type { PersonaId } from "./personas";

export type ProductId =
  | "today" | "chongun" | "career" | "love" | "wealth" | "match" | "marriage";
export type ProductAccess = "free" | "login" | "credit";

export interface Product {
  id: ProductId;
  title: string;
  tagline: string;         // 카드 한 줄 소개 — 톤 가드 준수
  personaId: PersonaId;
  access: ProductAccess;
  href: string;            // 연결 화면 — 전용 라우트가 생기면 갱신(2·3단계)
  status: "live" | "soon"; // soon = 카드 비활성(링크 없음)
}

export const PRODUCTS: Product[] = [
  {
    id: "today", title: "오늘의운세", personaId: "dalzigi",
    tagline: "매일 밤 새로 켜지는 오늘의 기운",
    access: "free", href: "/today", status: "live",
  },
  {
    id: "chongun", title: "총운", personaId: "seoon",
    tagline: "여덟 글자에 담긴 인생 전반의 흐름",
    access: "login", href: "/me", status: "live",
  },
  {
    id: "career", title: "직업운", personaId: "seoon",
    tagline: "일과 재능의 결이 흐르는 방향",
    access: "credit", href: "", status: "soon",
  },
  {
    id: "love", title: "연애운", personaId: "hongyeon",
    tagline: "다가오는 인연과 마음의 흐름",
    access: "credit", href: "", status: "soon",
  },
  {
    id: "wealth", title: "재물운", personaId: "geumo",
    tagline: "재물의 물길이 흐르는 방향",
    access: "credit", href: "", status: "soon",
  },
  {
    id: "match", title: "궁합", personaId: "hongyeon",
    tagline: "두 사람의 기운이 만나는 자리",
    access: "credit", href: "/match", status: "live",
  },
  {
    id: "marriage", title: "결혼운", personaId: "hongyeon",
    tagline: "함께 걷는 길의 때와 결",
    access: "credit", href: "", status: "soon",
  },
];

export const ACCESS_LABEL: Record<ProductAccess, string> = {
  free: "누구나 무료",
  login: "로그인하면 무료",
  credit: "크레딧",
};
```

Run: `npx vitest run src/lib/persona/products.test.ts` → PASS (5 tests)

- [ ] **Step 4: PersonaCard 테스트 갱신**

`src/components/home/PersonaCard.test.tsx`에서 픽스처 두 줄만 교체:

```tsx
const profileDeep = PRODUCTS.find((p) => p.id === "profile_deep")!;
const fate = PRODUCTS.find((p) => p.id === "fate")!;
```
→
```tsx
const profileDeep = PRODUCTS.find((p) => p.id === "chongun")!;
const fate = PRODUCTS.find((p) => p.id === "career")!;
```

그리고 단언 문구 갱신 — `"내 사주 심층 풀이"` → `"총운"`, `/서고에 이미 닿아 있어요/`는 유지(서온 homeLine 그대로), `"인연 풀이"` → `"직업운"`. (soon 카드의 `"곧 만나요"` 단언은 유지.)

Run: `npx vitest run src/components/home/PersonaCard.test.tsx` → PASS (3 tests)

- [ ] **Step 5: `/saju` 실패 테스트**

`src/app/(tabs)/saju/page.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import SajuPage from "./page";

describe("사주팔자 탭 (스펙 §4)", () => {
  it("6종 풀이가 순서대로 — today는 없다", () => {
    render(<SajuPage />);
    const titles = ["총운", "직업운", "연애운", "재물운", "궁합", "결혼운"];
    const rendered = screen.getAllByRole("heading", { level: 3 }).map((h) => h.textContent);
    expect(rendered).toEqual(titles);
    expect(screen.queryByText("오늘의운세")).not.toBeInTheDocument();
  });

  it("live 링크는 총운=/me, 궁합=/match 뿐 — 나머지는 준비 중", () => {
    render(<SajuPage />);
    const hrefs = screen.getAllByRole("link").map((a) => a.getAttribute("href"));
    expect(hrefs).toEqual(["/me", "/match"]);
    expect(screen.getAllByText("곧 만나요")).toHaveLength(4);
  });
});
```

Run: `npx vitest run "src/app/(tabs)/saju/page.test.tsx"` → FAIL (모듈 없음)

- [ ] **Step 6: `/saju` 구현**

`src/app/(tabs)/saju/page.tsx`:

```tsx
import type { Metadata } from "next";
import { PRODUCTS } from "@/lib/persona/products";
import PersonaCard from "@/components/home/PersonaCard";

export const metadata: Metadata = {
  title: "사주팔자 — 옴니마인드",
  description: "여덟 글자에 담긴 흐름을 여섯 갈래로 — 총운·직업·연애·재물·궁합·결혼.",
};

/** 사주팔자 탭(스펙 §4) — 6종 풀이 목록. 오늘의운세는 전용 탭이 담당한다. */
export default function SajuPage() {
  const items = PRODUCTS.filter((p) => p.id !== "today");
  return (
    <main className="fade-rise p-6">
      <h1 className="font-[family-name:var(--font-serif-kr)] text-2xl text-primary-green">
        사주팔자
      </h1>
      <p className="mt-1 text-sm text-text-soft">
        여덟 글자에 담긴 흐름을 여섯 갈래로 풀어드려요.
      </p>
      <div className="mt-5 flex flex-col gap-3">
        {items.map((p) => (
          <PersonaCard key={p.id} product={p} />
        ))}
      </div>
    </main>
  );
}
```

Run: `npx vitest run "src/app/(tabs)/saju/page.test.tsx"` → PASS (2 tests)

- [ ] **Step 7: 홈 v2 교체 + ProductShelf 삭제**

`src/app/(tabs)/page.tsx` 전체를 다음으로 교체:

```tsx
import Link from "next/link";
import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase/server";
import { currentMilestone, isMilestoneToday } from "@/lib/interpret/milestone";
import { PRODUCTS, ACCESS_LABEL } from "@/lib/persona/products";
import { FAQ_ITEMS } from "@/app/faq/page";
import AdSlot from "@/components/ads/AdSlot";
import type { ProfileRow } from "@/lib/db/types";

export const dynamic = "force-dynamic"; // 세션에 따라 매번 렌더

/**
 * 홈(4탭 IA 스펙 §2) — 6종 풀이 그리드(→ 사주팔자 탭) + 고객리뷰(실후기 생기는
 * 4단계까지 숨김 — P9 §5.2 "빈 상태를 꾸미지 않는다") + FAQ 발췌.
 * 마음·고민 진입은 홈에 없다(확정 결정 7 — 잠금 해제 화면에만).
 */
export default async function HomePage() {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();

  async function signOut() {
    "use server";
    const supabase = await createServerSupabase();
    await supabase.auth.signOut();
    redirect("/");
  }

  let profile: ProfileRow | null = null;
  if (user) {
    const { data } = await supabase
      .from("profiles").select("*").eq("user_id", user.id).maybeSingle<ProfileRow>();
    profile = data ?? null;
  }

  let companionDays = 0;
  if (profile) {
    const start = new Date(profile.created_at);
    const now = new Date();
    companionDays = Math.max(1, Math.floor((now.getTime() - start.getTime()) / 86_400_000) + 1);
  }
  const badge = currentMilestone(companionDays);
  const justReached = Boolean(isMilestoneToday(companionDays));

  const grid = PRODUCTS.filter((p) => p.id !== "today");

  return (
    <main className="fade-rise p-6">
      <div className="flex items-baseline justify-between">
        <h1 className="font-[family-name:var(--font-serif-kr)] text-2xl text-primary-green">
          옴니마인드
        </h1>
        {companionDays > 0 && (
          <span className="flex items-center gap-1 text-xs text-text-soft">
            함께한 지 {companionDays}일째
            {badge && (
              <span
                className={`rounded-full bg-warm-surface px-2 py-0.5 text-primary-green ${justReached ? "badge-pop" : ""}`}
              >
                {badge.emoji} {badge.label}
              </span>
            )}
          </span>
        )}
      </div>
      <p className="mt-1 text-sm text-text-soft">오늘 밤도 당신의 이야기를 켜 두었어요.</p>

      {/* 6종 풀이 그리드 — 클릭하면 사주팔자 탭으로(확정 결정: 홈 → 사주팔자 이동) */}
      <section className="mt-6" aria-label="풀이 종류">
        <div className="grid grid-cols-2 gap-3">
          {grid.map((p) => (
            <Link
              key={p.id}
              href="/saju"
              className="press rounded-card bg-warm-surface p-4"
            >
              <p className="font-[family-name:var(--font-serif-kr)] text-lg text-primary-green">
                {p.title}
              </p>
              <p className="mt-1 text-xs text-text-soft">{p.tagline}</p>
              <p className="mt-2 text-[11px] text-moon-gold">{ACCESS_LABEL[p.access]}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* 프로필 없으면 개인화 유도 */}
      {!profile && (
        <section className="mt-6 rounded-card border border-accent-coral/30 bg-warm-surface p-5">
          <p className="text-text-soft">
            {user ? (
              <>반가워요. 이제 <span className="text-text-main">당신의 조각들</span>을 이어볼까요?</>
            ) : (
              <>나의 사주로 <span className="text-text-main">더 깊은 오늘</span>을 받아볼까요?</>
            )}
          </p>
          <Link
            href="/onboarding"
            className="press mt-4 block w-full rounded-card bg-accent-coral py-3.5 text-center font-medium text-white"
          >
            나를 알아보기 ✨
          </Link>
          {!user && (
            <Link href="/login" className="mt-3 block text-center text-sm text-text-soft underline">
              이미 함께했던 분이라면 — 다시 이어보기 (로그인)
            </Link>
          )}
        </section>
      )}

      {/* 고객리뷰 — 실제 후기가 쌓이는 4단계까지 섹션 자체를 렌더하지 않는다(P9 §5.2) */}

      {/* 자주묻는질문 발췌 3문항 */}
      <section className="mt-8" aria-label="자주 묻는 질문">
        <h2 className="font-[family-name:var(--font-serif-kr)] text-lg text-primary-green">
          자주 묻는 질문
        </h2>
        <div className="mt-3 flex flex-col gap-2">
          {FAQ_ITEMS.slice(0, 3).map((item) => (
            <details key={item.q} className="rounded-card bg-warm-surface p-4">
              <summary className="cursor-pointer text-sm font-medium text-text-main">
                {item.q}
              </summary>
              <p className="mt-2 text-sm leading-relaxed text-text-soft">{item.a}</p>
            </details>
          ))}
        </div>
        <Link href="/faq" className="mt-3 block text-center text-sm text-text-soft underline">
          전체 질문 보기
        </Link>
      </section>

      <AdSlot />

      {user && (
        <form action={signOut} className="mt-8 text-center">
          <button className="press text-sm text-text-soft underline">
            잠시 떠나기 (로그아웃)
          </button>
        </form>
      )}
    </main>
  );
}
```

삭제:

```bash
git rm src/components/home/ProductShelf.tsx src/components/home/ProductShelf.test.tsx
```

- [ ] **Step 8: BottomNav 4탭 교체 (테스트 먼저)**

`src/components/BottomNav.test.tsx` 전체 교체:

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import BottomNav from "./BottomNav";

vi.mock("next/navigation", () => ({ usePathname: () => "/today" }));

describe("하단 탭바 (4탭 IA 스펙 §2)", () => {
  it("4탭 — 홈·오늘의운세·사주팔자·보관함", () => {
    render(<BottomNav />);
    const pairs: [string, string][] = [
      ["홈", "/"], ["오늘의운세", "/today"], ["사주팔자", "/saju"], ["보관함", "/archive"],
    ];
    for (const [label, href] of pairs) {
      expect(screen.getByRole("link", { name: new RegExp(label) })).toHaveAttribute("href", href);
    }
  });

  it("현재 경로의 탭이 활성 스타일을 갖는다", () => {
    render(<BottomNav />);
    expect(screen.getByRole("link", { name: /오늘의운세/ })).toHaveClass("font-semibold");
    expect(screen.getByRole("link", { name: /^홈/ })).not.toHaveClass("font-semibold");
  });
});
```

Run: `npx vitest run src/components/BottomNav.test.tsx` → FAIL (구 4탭 라벨)

`src/components/BottomNav.tsx`의 `tabs` 배열만 교체:

```tsx
const tabs = [
  { href: "/", label: "홈", emoji: "🌿" },
  { href: "/today", label: "오늘의운세", emoji: "🏮" },
  { href: "/saju", label: "사주팔자", emoji: "🌙" },
  { href: "/archive", label: "보관함", emoji: "📦" },
];
```

Run: `npx vitest run src/components/BottomNav.test.tsx` → PASS (2 tests)

- [ ] **Step 9: 전체 검증 + 육안 확인**

Run: `npm run verify` → 통과 (삭제된 ProductShelf 참조 잔존 시 typecheck가 잡는다)
`npm run dev`: 탭 4개 전환, 홈 그리드 → /saju, /saju 카드 → /me·/match, 마음/고민이 홈·무료 화면에 없는지 확인.

- [ ] **Step 10: 커밋**

```bash
git add -A
git commit -m "feat(ia): 4탭 스위치 — 카탈로그 v2(7종)·사주팔자 탭·홈 그리드/FAQ 발췌·탭바 교체"
```

---

### Task 5: 최종 검증 · 머지

- [ ] **Step 1:** `npm run verify` 전체 통과
- [ ] **Step 2:** 수동 스모크: ① 비로그인 /today — 시트 입력 → 무료 카드+티저(개인화 문구 DOM 부재 — 소스 보기로 확인) ② 로그인+프로필 /today — 심화+띠 관계+마음 챗 카드 ③ /daily → /today ④ 홈 그리드 6종 → /saju ⑤ /archive 게이트(비로그인)·기록(로그인) ⑥ 탭 4개 활성 표시 ⑦ 마음·고민이 무료 화면 어디에도 안 보임
- [ ] **Step 3:** 전체 브랜치 리뷰 → `omni-merge`로 main 머지·push·브랜치 정리

---

## Self-Review 기록

- **스펙 커버리지:** §2 탭 구조(Task 4) · §3 오늘의운세 전부(Task 1·2 — 팝업·무료/블러·전체 뷰·/daily 정리) · §4 사주팔자(Task 4 — 카탈로그 v2·목록·1단계 연결) · §5 보관함(Task 3) · §7 테스트 목록 전 항목 대응 · §8 비목표 준수(크레딧/readings 없음, 서버 저장 없음).
- **타입 일관성:** `TodayBirth`(Task 1) ↔ `TodayInputSheet.onSaved`/`TodayFreeFlow`(Task 2) 일치. `ArchiveEntry`(Task 3) 페이지 매핑 일치. `ProductId` v2(Task 4) ↔ saju/홈 filter 사용부 일치. `FAQ_ITEMS`는 기존 export 재사용(Task 4 홈).
- **잠금 원칙:** 무료 응답에 개인화 본문이 없음을 테스트로 고정(Task 1 Step 7 — DOM 부재 단언).
- **하이드레이션:** TodayFreeFlow는 localStorage를 useEffect에서만 읽음(구조 분기라 초기화식 금지 — YearForm 사례와 구분해 주석 명시).
- **중간 상태 안전:** 카탈로그 교체와 소비처 갱신을 Task 4 하나로 묶어 각 커밋에서 verify가 깨지지 않는다.
