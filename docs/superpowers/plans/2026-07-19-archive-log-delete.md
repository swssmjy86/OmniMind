# 보관함 로그 삭제 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 보관함의 **오늘의운세 기록**(interpretations kind='daily')을 개별·전체 삭제할 수 있게 한다(사용자 확정 범위 — 유료 풀이 캐시(readings)는 재열람 무료 보호를 위해 제외).

**Architecture:** 기존 마음·고민 로그 삭제(P8)의 검증된 패턴을 그대로 확장 — RLS delete 정책을 daily로 넓히는 마이그레이션(0012) + concern actions와 동형의 서버 액션 + ConcernRoom과 동일한 UX(개별 ✕ `delete-btn`, "전체 삭제"+`window.confirm`, 낙관적 제거+실패 롤백)의 클라이언트 목록.

**Tech Stack:** 기존 패턴 재사용(신규 개념 없음) · Vitest

## Global Constraints

- **커밋 전 `npm run verify` 통과 필수.** 브랜치 `feat/archive-log-delete`(Task 1에서 main으로부터 생성).
- **삭제 범위: kind='daily'만.** advice는 기존 정책 유지, profile 스냅샷·readings는 삭제 불가 그대로.
- **UX 동일성:** ConcernRoom 패턴 준수 — 개별 ✕(`delete-btn` 클래스, aria-label), "전체 삭제" 밑줄 텍스트 버튼, `window.confirm("…모두 지울까요? 되돌릴 수 없어요.")`, 낙관적 제거+실패 시 롤백.
- **개인정보처리방침 정합:** §4 "기록 삭제" 약속의 이행 — 마이그레이션 주석에 근거 명시. 오늘 행 삭제 시 다음 방문에 하루 1회 캐시가 재생성될 수 있음(무료 티어 1회)은 허용 트레이드오프.
- 톤 규칙(§5.4) — confirm 문구 포함(기존 문구와 같은 결).
- 기존 ArchiveView 테스트가 검증하던 동작(게이트·빈 상태·목록·마음/고민 링크)은 전부 유지.

## 파일 구조

```
supabase/migrations/0012_archive_daily_delete.sql   [신규] daily delete RLS
src/lib/archive/actions.ts                           [신규] deleteDailyLog·deleteAllDailyLogs
src/components/archive/ArchiveLogList.tsx / .test.tsx [신규] 삭제 가능한 기록 목록(클라이언트)
src/components/archive/ArchiveView.tsx / .test.tsx    [수정] 기록 섹션을 ArchiveLogList로 위임
```

---

### Task 1: 마이그레이션 + 삭제 액션

**Files:**
- Create: `supabase/migrations/0012_archive_daily_delete.sql`
- Create: `src/lib/archive/actions.ts`

먼저 `git switch -c feat/archive-log-delete main`.

**Interfaces:**
- Produces: `deleteDailyLog(id: string): Promise<{ ok: boolean }>`, `deleteAllDailyLogs(): Promise<{ ok: boolean }>` — `src/lib/concern/actions.ts`의 `deleteConcernLog`/`deleteAllConcernLogs`(115~141행)와 동형(서버 액션, throw 없음).

- [ ] **Step 1: 마이그레이션**

`supabase/migrations/0012_archive_daily_delete.sql`:

```sql
-- 보관함 로그 삭제: 오늘의운세 기록(kind='daily')도 본인 삭제 허용. (0011 이후 실행)
-- 실행: Supabase SQL Editor에 붙여넣고 Run.
--
-- 0008은 advice만 삭제를 열었다(당시 삭제 UI가 advice뿐). 개인정보처리방침 §4의
-- "마음(채팅)·고민 기록은 직접 삭제" 약속을 오늘의운세 기록까지 넓힌다(보관함 삭제 기능).
-- profile 스냅샷은 계속 제외(삭제 시 온보딩 재생성 필요 — 캐시 무결성).
-- 오늘 날짜 행을 지우면 다음 방문 때 하루 1회 데일리 캐시가 재생성될 수 있다(무료 티어
-- LLM 1회) — 사용자 권리가 우선이라 허용한다.

drop policy if exists "own daily: delete" on public.interpretations;
create policy "own daily: delete" on public.interpretations
  for delete using (auth.uid() = user_id and kind = 'daily');
```

- [ ] **Step 2: 액션 구현**

`src/lib/archive/actions.ts`:

```ts
"use server";

import { createServerSupabase } from "@/lib/supabase/server";

export type DeleteResult = { ok: boolean };

/** 오늘의운세 기록 개별 삭제 — 본인 것만(kind='daily'로 제한, concern actions와 동형). */
export async function deleteDailyLog(id: string): Promise<DeleteResult> {
  try {
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { ok: false };
    const { error } = await supabase
      .from("interpretations").delete().eq("id", id).eq("user_id", user.id).eq("kind", "daily");
    return { ok: !error };
  } catch {
    return { ok: false };
  }
}

/** 오늘의운세 기록 전체 삭제 — 본인 것만(kind='daily'로 제한). */
export async function deleteAllDailyLogs(): Promise<DeleteResult> {
  try {
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { ok: false };
    const { error } = await supabase
      .from("interpretations").delete().eq("user_id", user.id).eq("kind", "daily");
    return { ok: !error };
  } catch {
    return { ok: false };
  }
}
```

- [ ] **Step 3: 검증·커밋** (액션은 concern 패턴 동형 — 단위 테스트 없음, 기존 원칙)

```bash
npm run verify
git add supabase/migrations/0012_archive_daily_delete.sql src/lib/archive/
git commit -m "feat(archive): 오늘의운세 기록 삭제 액션·RLS — 개인정보 삭제 권리를 데일리 기록까지"
```

---

### Task 2: `ArchiveLogList` + ArchiveView 통합

**Files:**
- Create: `src/components/archive/ArchiveLogList.tsx` / Test: `src/components/archive/ArchiveLogList.test.tsx`
- Modify: `src/components/archive/ArchiveView.tsx` (기록 섹션을 ArchiveLogList로 위임), `src/components/archive/ArchiveView.test.tsx` (동작 동일 — 필요 시 쿼리만 보정)

**Interfaces:**
- Consumes: Task 1 액션(mock 경계), `ArchiveEntry`(ArchiveView export 유지)
- Produces: `ArchiveLogList({ entries }: { entries: ArchiveEntry[] })` — 헤더(제목+전체 삭제)·빈 상태·삭제 가능한 목록을 전담. `ArchiveView`의 로그인 분기는 `<ArchiveLogList entries={entries} />` + 기존 '이어지는 이야기' 섹션.

- [ ] **Step 1: 실패하는 테스트 작성**

`src/components/archive/ArchiveLogList.test.tsx`:

```tsx
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ArchiveLogList from "./ArchiveLogList";
import { deleteAllDailyLogs, deleteDailyLog } from "@/lib/archive/actions";

vi.mock("@/lib/archive/actions", () => ({
  deleteDailyLog: vi.fn(),
  deleteAllDailyLogs: vi.fn(),
}));

const entries = [
  { id: "a", date: "2026-07-19", headline: "오늘은 화(병오)의 기운이 흐르는 날이에요." },
  { id: "b", date: "2026-07-18", headline: "오늘은 목(갑인)의 기운이 흐르는 날이에요." },
];

describe("ArchiveLogList — 개별·전체 삭제", () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(() => vi.restoreAllMocks());

  it("기록·개별 삭제 버튼·전체 삭제 버튼을 렌더한다", () => {
    render(<ArchiveLogList entries={entries} />);
    expect(screen.getByText("오늘의운세 기록")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "이 기록 삭제" })).toHaveLength(2);
    expect(screen.getByRole("button", { name: "전체 삭제" })).toBeInTheDocument();
  });

  it("개별 삭제 — 낙관적 제거, 실패 시 롤백", async () => {
    vi.mocked(deleteDailyLog).mockResolvedValue({ ok: false });
    render(<ArchiveLogList entries={entries} />);
    fireEvent.click(screen.getAllByRole("button", { name: "이 기록 삭제" })[0]);
    await waitFor(() => expect(screen.getByText(/2026-07-19/)).toBeInTheDocument()); // 롤백
    vi.mocked(deleteDailyLog).mockResolvedValue({ ok: true });
    fireEvent.click(screen.getAllByRole("button", { name: "이 기록 삭제" })[0]);
    await waitFor(() => expect(screen.queryByText(/2026-07-19/)).not.toBeInTheDocument());
    expect(screen.getByText(/2026-07-18/)).toBeInTheDocument();
  });

  it("전체 삭제 — confirm 후 비우고 빈 상태 표시, 취소 시 유지", async () => {
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(false);
    render(<ArchiveLogList entries={entries} />);
    fireEvent.click(screen.getByRole("button", { name: "전체 삭제" }));
    expect(deleteAllDailyLogs).not.toHaveBeenCalled();

    confirmSpy.mockReturnValue(true);
    vi.mocked(deleteAllDailyLogs).mockResolvedValue({ ok: true });
    fireEvent.click(screen.getByRole("button", { name: "전체 삭제" }));
    expect(await screen.findByText(/아직 쌓인 기록이 없어요/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "전체 삭제" })).not.toBeInTheDocument();
  });

  it("빈 목록 — 빈 상태 안내, 전체 삭제 버튼 없음", () => {
    render(<ArchiveLogList entries={[]} />);
    expect(screen.getByText(/아직 쌓인 기록이 없어요/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "전체 삭제" })).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: 실패 확인 후 구현**

Run: `npx vitest run src/components/archive/ArchiveLogList.test.tsx` → FAIL (모듈 없음)

`src/components/archive/ArchiveLogList.tsx`:

```tsx
"use client";

import { useState } from "react";
import { deleteAllDailyLogs, deleteDailyLog } from "@/lib/archive/actions";
import type { ArchiveEntry } from "./ArchiveView";

/**
 * 오늘의운세 기록 목록 + 개별·전체 삭제 — ConcernRoom의 로그 삭제 UX와 같은 결
 * (낙관적 제거·실패 롤백·confirm). 삭제 범위는 데일리 기록뿐(유료 풀이 캐시는 보호).
 */
export default function ArchiveLogList({ entries: initial }: { entries: ArchiveEntry[] }) {
  const [entries, setEntries] = useState(initial);

  async function removeOne(id: string) {
    const before = entries;
    setEntries(entries.filter((e) => e.id !== id));
    const res = await deleteDailyLog(id);
    if (!res.ok) setEntries(before);
  }

  async function removeAll() {
    if (!window.confirm("오늘의운세 기록을 모두 지울까요? 되돌릴 수 없어요.")) return;
    const before = entries;
    setEntries([]);
    const res = await deleteAllDailyLogs();
    if (!res.ok) setEntries(before);
  }

  return (
    <section className="mt-6">
      <div className="flex items-baseline justify-between">
        <h2 className="font-[family-name:var(--font-serif-kr)] text-lg text-primary-green">
          오늘의운세 기록
        </h2>
        {entries.length > 0 && (
          <button
            onClick={() => void removeAll()}
            className="press text-xs text-text-soft underline underline-offset-4"
          >
            전체 삭제
          </button>
        )}
      </div>
      {entries.length === 0 ? (
        <p className="mt-3 text-sm text-text-soft">
          아직 쌓인 기록이 없어요. 오늘의운세에 매일 들르면 하나씩 모여요 🌱
        </p>
      ) : (
        <ul className="mt-3 space-y-3">
          {entries.map((e) => (
            <li key={e.id} className="group flex items-start gap-2 rounded-card bg-warm-surface p-4">
              <div className="min-w-0 flex-1">
                <p className="text-xs text-text-soft">{e.date}</p>
                <p className="mt-1 text-sm leading-relaxed text-text-main">{e.headline}</p>
              </div>
              <button
                onClick={() => void removeOne(e.id)}
                aria-label="이 기록 삭제"
                className="delete-btn shrink-0 rounded-full p-1 text-xs text-text-soft"
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
```

Run → PASS (4 tests)

- [ ] **Step 3: ArchiveView 위임**

`src/components/archive/ArchiveView.tsx`의 로그인 분기에서 기존 "오늘의운세 기록" `<section>` 블록 전체를 다음 한 줄로 교체(import 추가):

```tsx
      <ArchiveLogList entries={entries} />
```

`ArchiveView.test.tsx`: 동작 단언은 그대로 유지되어야 한다 — 클라이언트 자식도 jsdom에서 동기 렌더되므로 "오늘의운세 기록"·날짜·빈 상태 단언은 무수정 통과가 기대값. 통과하지 않으면 쿼리만 보정(단언 의미 변경 금지).

- [ ] **Step 4: 검증·커밋**

Run: `npx vitest run src/components/archive/` → 전부 PASS → `npm run verify` → 통과

```bash
git add src/components/archive/
git commit -m "feat(archive): 기록 목록 개별 ✕·전체 삭제 — 낙관적 제거·실패 롤백(기존 로그 삭제 UX)"
```

---

### Task 3: 최종 검증 · 머지

- [ ] **Step 1:** `npm run verify` 전체 통과
- [ ] **Step 2:** 수동 스모크: 보관함에서 개별 삭제 → 목록에서 사라짐·DB 행 삭제 / 전체 삭제 confirm 취소 → 유지 / 확인 → 빈 상태 / 비로그인 게이트·마음/고민 링크 회귀 없음
- [ ] **Step 3:** 전체 브랜치 리뷰 → `omni-merge`. 머지 후 **Supabase에 0012 적용 안내**(미적용 시 삭제 버튼이 실패 롤백으로만 동작 — 화면 무해)

---

## Self-Review 기록

- 범위: 사용자 확정(daily만) — readings·advice·profile 정책 무변경. RLS·액션·UI 삼중으로 kind='daily' 제한.
- UX: ConcernRoom과 문구·클래스·confirm 흐름 동형. `delete-btn`은 터치 기기 항상 표시(기존 a11y 결정 상속).
- ArchiveView 기존 테스트 의미 보존을 명시(쿼리 보정만 허용).
