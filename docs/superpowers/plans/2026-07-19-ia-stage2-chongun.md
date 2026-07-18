# IA 2단계 — 총운·readings 캐싱·readingAccess Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 스펙 `docs/superpowers/specs/2026-07-19-ia-stage2-chongun.md` 구현 — `readingAccess` 접근 규칙, `readings` 캐싱, 총운 전용 화면 `/saju/chongun`(비로그인 엿보기 / 로그인 전체), 카탈로그 갱신.

**Architecture:** 무료 상품(총운)으로 열람·캐싱·잠금 파이프라인을 결제 없이 검증한다. 접근 규칙은 `consult/quota.ts`에 순수 함수로 추가(새 모듈 금지 — P9 §6.3), 캐시 키는 `stableStringify` + sha256(입력·엔진 버전·현재 대운 간지), 본문 조립은 기존 `assembleProfile` 재사용 + '운의 계절' 섹션. 페르소나 인사는 캐시에 넣지 않는다(표현 계층).

**Tech Stack:** Next.js 16 · Supabase(RLS) · node:crypto sha256 · Vitest

## Global Constraints

- **커밋 전 `npm run verify` 통과 필수.** 브랜치 `feat/ia-stage2-chongun`(생성됨).
- **잠긴 본문 서버 비노출(P9 §5.1):** 비로그인 엿보기에는 제목·한 줄 소개만 — 개인화 본문이 DOM에 없다.
- **접근 규칙은 `src/lib/consult/quota.ts` 하나에**(P9 §6.3). 판정 순서: 비로그인→login / chongun→무료 / 레거시 프리미엄→무제한 / 크레딧>0→consumesCredit / 아니면 credit 잠금.
- **캐싱(P9 §6.2):** `(user_id, product, input_hash)` 일치 + `context_version >= PROFILE_CONTEXT_VERSION`(현재 2) → 저장본 반환·재생성 없음. 크레딧 차감 실행은 3단계 — 이번엔 판정만.
- **해시 안정성:** DB jsonb 왕복과 무관하게 같은 값 → 같은 해시가 되도록 재귀 키 정렬(stableStringify) 후 sha256.
- **톤 규칙(§5.4):** 새 카피에서 `하세요`/`[가-힣]니다`/공포 문구/`회원님|사용자님`/낙인형 단정 금지.
- **해석 축 위계(§3):** 팔자 문장이 먼저 — `assembleProfile` 재사용으로 보장, 새 섹션은 팔자(대운)만.
- 페르소나(서온) 인사는 화면이 렌더 — readings 캐시에 저장 금지.
- 컴포넌트는 토큰만 참조. `teaser-bar` 자리표시자 패턴 재사용(`TodayTeaser` 참조).

## 파일 구조

```
src/lib/consult/quota.ts / quota.test.ts             [수정] readingAccess 추가(기존 consultAccess 불변)
supabase/migrations/0010_stage2_readings.sql          [신규] readings 테이블 + RLS
src/lib/db/types.ts                                   [수정] ReadingRow 추가
src/lib/readings/hash.ts / hash.test.ts               [신규] stableStringify·readingInputHash(순수)
src/lib/interpret/content/chongun.ts / chongun.test.ts [신규] assembleChongun — 총운 섹션 조립
src/components/saju/ChongunPeek.tsx / .test.tsx        [신규] 비로그인 엿보기(본문 비노출)
src/app/(tabs)/saju/chongun/page.tsx                   [신규] 3상태 총운 페이지(캐시 경유)
src/lib/persona/products.ts / products.test.ts         [수정] chongun.href → /saju/chongun
```

---

### Task 1: `readingAccess` — 접근 규칙 (quota.ts)

**Files:**
- Modify: `src/lib/consult/quota.ts` (파일 끝에 추가 — 기존 코드 불변)
- Modify: `src/lib/consult/quota.test.ts` (describe 블록 추가 — 기존 테스트 불변)

**Interfaces:**
- Consumes: 기존 `isPremium`
- Produces:
  - `type ReadingProduct = "chongun" | "career" | "love" | "wealth" | "match" | "marriage"`
  - `interface ReadingUserState { loggedIn: boolean; credits: number; premiumUntil?: string | null; now: Date }`
  - `interface ReadingAccess { allowed: boolean; lockReason: "login" | "credit" | null; consumesCredit: boolean }`
  - `readingAccess(product: ReadingProduct, s: ReadingUserState): ReadingAccess`

- [ ] **Step 1: 실패하는 테스트 추가**

`src/lib/consult/quota.test.ts` 파일 끝에 추가:

```ts
import { readingAccess, type ReadingProduct } from "./quota";

describe("readingAccess — 상품별 접근 규칙 전수 (P9 §6.3, 2단계 스펙 §2)", () => {
  const now = new Date("2026-07-19T12:00:00+09:00");
  const CREDIT_PRODUCTS: ReadingProduct[] = ["career", "love", "wealth", "match", "marriage"];
  const ALL: ReadingProduct[] = ["chongun", ...CREDIT_PRODUCTS];

  it("비로그인 — 전 상품 login 잠금", () => {
    for (const p of ALL) {
      expect(readingAccess(p, { loggedIn: false, credits: 5, premiumUntil: null, now })).toEqual({
        allowed: false, lockReason: "login", consumesCredit: false,
      });
    }
  });

  it("로그인 — 총운은 크레딧 0이어도 무료 허용", () => {
    expect(readingAccess("chongun", { loggedIn: true, credits: 0, premiumUntil: null, now })).toEqual({
      allowed: true, lockReason: null, consumesCredit: false,
    });
  });

  it("로그인 — 크레딧 상품: 크레딧 있으면 허용·소비, 없으면 credit 잠금", () => {
    for (const p of CREDIT_PRODUCTS) {
      expect(readingAccess(p, { loggedIn: true, credits: 2, premiumUntil: null, now })).toEqual({
        allowed: true, lockReason: null, consumesCredit: true,
      });
      expect(readingAccess(p, { loggedIn: true, credits: 0, premiumUntil: null, now })).toEqual({
        allowed: false, lockReason: "credit", consumesCredit: false,
      });
    }
  });

  it("레거시 프리미엄 — 크레딧 상품도 차감 없이 무제한(P8 약속 유지)", () => {
    const future = "2027-01-01T00:00:00+09:00";
    for (const p of CREDIT_PRODUCTS) {
      expect(readingAccess(p, { loggedIn: true, credits: 0, premiumUntil: future, now })).toEqual({
        allowed: true, lockReason: null, consumesCredit: false,
      });
    }
    // 만료된 프리미엄은 무시된다
    expect(
      readingAccess("career", { loggedIn: true, credits: 0, premiumUntil: "2026-01-01T00:00:00+09:00", now }),
    ).toEqual({ allowed: false, lockReason: "credit", consumesCredit: false });
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `npx vitest run src/lib/consult/quota.test.ts`
Expected: FAIL — `readingAccess`가 export되지 않음 (기존 consultAccess 테스트는 계속 통과)

- [ ] **Step 3: 구현**

`src/lib/consult/quota.ts` 파일 끝에 추가:

```ts
// ── P9 §6.3 / IA 2단계: 풀이 상품 접근 규칙 ───────────────────────────────
// 이 함수 하나가 모든 풀이 잠금의 단일 진실 공급원이다. 크레딧 "차감 실행"은 3단계 —
// 여기서는 consumesCredit 판정만 한다. 상품 메타(제목·페르소나)는 persona/products.ts.

export type ReadingProduct =
  | "chongun" | "career" | "love" | "wealth" | "match" | "marriage";

export interface ReadingUserState {
  loggedIn: boolean;
  credits: number;
  premiumUntil?: string | null;
  now: Date;
}

export interface ReadingAccess {
  allowed: boolean;
  /** 잠금 사유 — CTA가 갈린다(P9 §5.1): login="로그인하고 무료로", credit="크레딧으로 열기" */
  lockReason: "login" | "credit" | null;
  consumesCredit: boolean;
}

/** 풀이 상품 접근 판정: 비로그인→login / 총운→로그인 무료 / 레거시 무제한 / 크레딧 / credit 잠금. */
export function readingAccess(product: ReadingProduct, s: ReadingUserState): ReadingAccess {
  if (!s.loggedIn) return { allowed: false, lockReason: "login", consumesCredit: false };
  if (product === "chongun") return { allowed: true, lockReason: null, consumesCredit: false };
  if (isPremium(s.premiumUntil, s.now)) return { allowed: true, lockReason: null, consumesCredit: false };
  if (s.credits > 0) return { allowed: true, lockReason: null, consumesCredit: true };
  return { allowed: false, lockReason: "credit", consumesCredit: false };
}
```

- [ ] **Step 4: 통과 확인 후 검증·커밋**

Run: `npx vitest run src/lib/consult/quota.test.ts` → PASS (기존 + 신규 4 tests)

```bash
npm run verify
git add src/lib/consult/
git commit -m "feat(quota): readingAccess — 풀이 상품 접근 규칙 단일 지점(전수 테스트)"
```

---

### Task 2: `readings` 마이그레이션 + 해시 모듈

**Files:**
- Create: `supabase/migrations/0010_stage2_readings.sql`
- Modify: `src/lib/db/types.ts` (파일 끝에 ReadingRow 추가)
- Create: `src/lib/readings/hash.ts` / Test: `src/lib/readings/hash.test.ts`

**Interfaces:**
- Consumes: `PROFILE_CONTEXT_VERSION`(`@/lib/engine/index`), node:crypto
- Produces:
  - `stableStringify(value: unknown): string` — 재귀 키 정렬 직렬화
  - `readingInputHash(ctx: unknown, season: string): string` — sha256 hex
  - `interface ReadingRow { id: string; user_id: string; product: string; input_hash: string; context_version: number; sections: InterpretationSection[]; created_at: string }`

- [ ] **Step 1: 마이그레이션 작성**

`supabase/migrations/0010_stage2_readings.sql`:

```sql
-- IA 2단계: 풀이 캐싱(P9 §6.1·§6.2) — "같은 해석을 두 번 생성하지 않는다". (0009 이후 실행)
-- 실행: Supabase SQL Editor에 붙여넣고 Run.
-- reading_reviews(후기)는 4단계 마이그레이션에서 만든다.

create table if not exists public.readings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  product text not null,              -- "chongun" | (3단계) "career" | "love" | ...
  input_hash text not null,           -- 입력(프로필·대운 간지) 해시 — 바뀌면 재생성
  context_version int not null,       -- PROFILE_CONTEXT_VERSION — 낮으면 재계산 대상
  sections jsonb not null,
  created_at timestamptz not null default now(),
  unique (user_id, product, input_hash)
);

alter table public.readings enable row level security;

-- 본인 행만 select/insert(P9 §6.1). 갱신·삭제는 열지 않는다 — 캐시는 불변, 새 입력은 새 행.
drop policy if exists "own readings: select" on public.readings;
create policy "own readings: select" on public.readings
  for select using (auth.uid() = user_id);
drop policy if exists "own readings: insert" on public.readings;
create policy "own readings: insert" on public.readings
  for insert with check (auth.uid() = user_id);
```

- [ ] **Step 2: 해시 실패 테스트**

`src/lib/readings/hash.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { readingInputHash, stableStringify } from "./hash";

describe("풀이 캐시 키 (2단계 스펙 §3)", () => {
  it("stableStringify — 키 순서가 달라도 같은 문자열", () => {
    expect(stableStringify({ b: 1, a: { d: 2, c: [3, { f: 4, e: 5 }] } })).toBe(
      stableStringify({ a: { c: [3, { e: 5, f: 4 }], d: 2 }, b: 1 }),
    );
  });

  it("같은 입력 → 같은 해시(64자 hex), 키 순서 무관", () => {
    const h1 = readingInputHash({ x: 1, y: 2 }, "경오");
    const h2 = readingInputHash({ y: 2, x: 1 }, "경오");
    expect(h1).toBe(h2);
    expect(h1).toMatch(/^[0-9a-f]{64}$/);
  });

  it("ctx·대운 간지가 바뀌면 해시가 달라진다", () => {
    const base = readingInputHash({ x: 1 }, "경오");
    expect(readingInputHash({ x: 2 }, "경오")).not.toBe(base);
    expect(readingInputHash({ x: 1 }, "신미")).not.toBe(base); // 대운 경계 → 자연 재생성
    expect(readingInputHash({ x: 1 }, "none")).not.toBe(base);
  });
});
```

- [ ] **Step 3: 실패 확인 후 구현**

Run: `npx vitest run src/lib/readings/hash.test.ts` → FAIL (모듈 없음)

`src/lib/readings/hash.ts`:

```ts
// 풀이 캐시 키(2단계 스펙 §3) — 같은 입력은 반드시 같은 해시가 되어야 "같은 해석을 두 번
// 생성하지 않는다"(P9 §6.2)가 성립한다. DB jsonb 왕복은 키 순서를 바꿀 수 있으므로
// 재귀 키 정렬로 정규화한 뒤 해시한다. 서버 전용(node:crypto).
import { createHash } from "node:crypto";
import { PROFILE_CONTEXT_VERSION } from "@/lib/engine/index";

/** 재귀 키 정렬 JSON 직렬화 — 객체 키 순서와 무관하게 같은 값이면 같은 문자열. */
export function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, v]) => v !== undefined)
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([k, v]) => `${JSON.stringify(k)}:${stableStringify(v)}`);
  return `{${entries.join(",")}}`;
}

/**
 * 풀이 입력 해시 — 프로필 컨텍스트 + 엔진 버전 + 현재 대운 간지(대운이 바뀌면 '운의
 * 계절' 섹션이 바뀌므로 캐시도 자연 무효화). season은 대운 미상이면 "none".
 */
export function readingInputHash(ctx: unknown, season: string): string {
  return createHash("sha256")
    .update(stableStringify({ v: PROFILE_CONTEXT_VERSION, season, ctx }))
    .digest("hex");
}
```

Run: `npx vitest run src/lib/readings/hash.test.ts` → PASS (3 tests)

- [ ] **Step 4: ReadingRow 추가**

`src/lib/db/types.ts` 파일 끝에 추가:

```ts
/** IA 2단계 풀이 캐시(readings) 한 행 — P9 §6.1. */
export interface ReadingRow {
  id: string;
  user_id: string;
  product: string;
  input_hash: string;
  context_version: number;
  sections: InterpretationSection[];
  created_at: string;
}
```

(파일 상단에 `InterpretationSection` import가 이미 있는지 확인 — 없으면 기존 import 스타일대로 `import type { InterpretationSection } from "@/lib/interpret/types";` 추가.)

- [ ] **Step 5: 검증·커밋**

```bash
npm run verify
git add supabase/migrations/0010_stage2_readings.sql src/lib/readings/ src/lib/db/types.ts
git commit -m "feat(readings): 캐시 테이블(0010)·안정 해시 — 같은 해석을 두 번 생성하지 않는다"
```

---

### Task 3: `assembleChongun` — 총운 섹션 조립

**Files:**
- Create: `src/lib/interpret/content/chongun.ts` / Test: `src/lib/interpret/content/chongun.test.ts`

**Interfaces:**
- Consumes: `assembleProfile`(`../templates`), `currentDaeun`(`@/lib/engine/daeun`), `daeunSeasonText`(`./daeun`), `ProfileContext`, `InterpretationSection`
- Produces: `assembleChongun(ctx: ProfileContext, nickname: string, age: number | null): InterpretationSection[]`, `const SEASON_TITLE = "운의 계절"`

- [ ] **Step 1: 실패하는 테스트 작성**

`src/lib/interpret/content/chongun.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { computeProfile } from "@/lib/engine";
import { assembleProfile } from "../templates";
import { checkTone } from "../tone-guard";
import { SEASON_TITLE, assembleChongun } from "./chongun";

// 실제 엔진으로 만든 컨텍스트 — 목이 아닌 진짜 값으로 조립을 검증한다.
const ctx = computeProfile({
  birthDate: "1990-06-15", birthTime: "07:30", timeUnknown: false,
  bloodType: "A", mbti: "ENFJ", gender: "male",
});
const noGenderCtx = computeProfile({
  birthDate: "1990-06-15", birthTime: "07:30", timeUnknown: false,
  bloodType: "A", mbti: "ENFJ",
});

describe("총운 조립 (2단계 스펙 §4)", () => {
  it("assembleProfile 섹션 전부 + 운의 계절 섹션 하나가 뒤에 붙는다", () => {
    const base = assembleProfile(ctx, "새벽");
    const out = assembleChongun(ctx, "새벽", 36);
    expect(out.slice(0, base.length)).toEqual(base); // 위계·순서 그대로(§3)
    expect(out).toHaveLength(base.length + 1);
    expect(out[out.length - 1].title).toBe(SEASON_TITLE);
    expect(out[out.length - 1].body).toContain("대운");
  });

  it("첫 대운 이전 나이 — 시작 안내 문구", () => {
    const out = assembleChongun(ctx, "새벽", 0);
    expect(out[out.length - 1].body).toContain("첫 대운");
  });

  it("성별 미상(daeun 없음) — 온보딩 안내 문구로 완전 동작(폴백 §3.2)", () => {
    const out = assembleChongun(noGenderCtx, "새벽", 36);
    expect(out[out.length - 1].title).toBe(SEASON_TITLE);
    expect(out[out.length - 1].body).toContain("성별");
  });

  it("운의 계절 문구가 톤 가드를 통과한다", () => {
    for (const age of [0, 36, null]) {
      expect(checkTone(assembleChongun(ctx, "새벽", age).at(-1)!.body)).toEqual([]);
    }
    expect(checkTone(assembleChongun(noGenderCtx, "새벽", 36).at(-1)!.body)).toEqual([]);
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `npx vitest run src/lib/interpret/content/chongun.test.ts`
Expected: FAIL — `Cannot find module './chongun'`

(참고: `computeProfile`의 입력 형태가 위와 다르면 — 예: EngineInput 필드명 — 기존 `src/lib/engine/index.test.ts`의 사용 예를 따라 테스트 픽스처만 맞춘다. 조립 로직 요구는 동일.)

- [ ] **Step 3: 구현**

`src/lib/interpret/content/chongun.ts`:

```ts
// 총운 풀이 조립(2단계 스펙 §4) — 순수 템플릿, LLM 없음(항상 동작).
// 본문 = 기존 assembleProfile(해석 축 위계 §3의 검증된 구현) + '운의 계절'(대운) 한 섹션.
// 페르소나 인사는 여기 없다 — 표현 계층은 화면이 렌더하고, 캐시에는 해석만 담는다.
import type { ProfileContext } from "@/lib/engine/index";
import type { InterpretationSection } from "../types";
import { assembleProfile } from "../templates";
import { currentDaeun } from "@/lib/engine/daeun";
import { daeunSeasonText } from "./daeun";

export const SEASON_TITLE = "운의 계절";

/** 대운 섹션 — /me와 같은 3분기: 진행 중 / 첫 대운 이전 / 성별 미상(폴백, 항상 동작). */
function seasonSection(ctx: ProfileContext, age: number | null): InterpretationSection {
  if (!ctx.daeun) {
    return {
      title: SEASON_TITLE,
      body: "성별을 알려주시면 10년 단위 운의 흐름(대운)까지 읽어드려요. 온보딩에서 이야기를 다시 이어볼 수 있어요.",
    };
  }
  const season = age !== null ? currentDaeun(ctx.daeun, age) : null;
  if (!season) {
    return {
      title: SEASON_TITLE,
      body: `당신의 첫 대운은 ${ctx.daeun.startAge}세에 시작돼요. 아직은 타고난 결이 자라나는 계절이에요.`,
    };
  }
  return {
    title: SEASON_TITLE,
    body: `지금 당신은 ${season.ganzhi} 대운을 지나고 있어요 — ${season.fromAge}세부터 ${season.toAge}세까지, 10년의 큰 계절이에요. ${daeunSeasonText(season.ganzhi)}`,
  };
}

/** 총운 섹션 전체 — assembleProfile 뒤에 운의 계절이 붙는다(팔자 주축 순서 유지). */
export function assembleChongun(
  ctx: ProfileContext,
  nickname: string,
  age: number | null,
): InterpretationSection[] {
  return [...assembleProfile(ctx, nickname), seasonSection(ctx, age)];
}
```

(참고: `currentDaeun(ctx.daeun, age)`가 첫 대운 이전에 null을 돌려주는지는 `src/lib/engine/daeun.ts` 시그니처를 확인해 맞춘다 — `/me` 페이지가 같은 호출을 쓰므로 그 사용법을 그대로 따른다.)

- [ ] **Step 4: 통과 확인 후 검증·커밋**

Run: `npx vitest run src/lib/interpret/content/chongun.test.ts` → PASS (4 tests)

```bash
npm run verify
git add src/lib/interpret/content/chongun.ts src/lib/interpret/content/chongun.test.ts
git commit -m "feat(interpret): assembleChongun — assembleProfile 재사용 + 운의 계절(대운) 섹션"
```

---

### Task 4: `ChongunPeek` — 비로그인 엿보기

**Files:**
- Create: `src/components/saju/ChongunPeek.tsx` / Test: `src/components/saju/ChongunPeek.test.tsx`

**Interfaces:**
- Consumes: 없음 (정적 — `TodayTeaser`와 같은 패턴)
- Produces: `ChongunPeek()` — 기본 export. 잠긴 섹션 4장 + "로그인하고 무료로 열람" CTA(→ /login)

- [ ] **Step 1: 실패하는 테스트 작성**

`src/components/saju/ChongunPeek.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import ChongunPeek from "./ChongunPeek";

describe("총운 엿보기 (2단계 스펙 §5 — lockReason login)", () => {
  it("잠긴 섹션 4장 제목과 로그인 CTA를 렌더한다", () => {
    render(<ChongunPeek />);
    for (const title of ["타고난 그릇", "오행의 풍경", "재능의 흐름", "운의 계절"]) {
      expect(screen.getByText(title)).toBeInTheDocument();
    }
    expect(screen.getByRole("link", { name: /로그인하고 무료로 열람/ })).toHaveAttribute("href", "/login");
  });

  it("본문은 DOM에 없다 — 자리표시자는 aria-hidden 장식뿐(P9 §5.1)", () => {
    const { container } = render(<ChongunPeek />);
    expect(container.textContent).not.toMatch(/기운이에요|면이 있어요|대운을 지나고/);
    const bars = container.querySelectorAll(".teaser-bar");
    expect(bars.length).toBeGreaterThan(0);
    for (const bar of bars) expect(bar).toHaveAttribute("aria-hidden");
  });
});
```

- [ ] **Step 2: 실패 확인 후 구현**

Run: `npx vitest run src/components/saju/ChongunPeek.test.tsx` → FAIL (모듈 없음)

`src/components/saju/ChongunPeek.tsx`:

```tsx
import Link from "next/link";

// 총운 엿보기(2단계 스펙 §5) — 비로그인용. 제목·한 줄 소개만 공개하고 본문은 서버가
// 아예 만들지 않는다(P9 §5.1). 티저는 일반 소개다 — 프로필이 없어 개인화 티저는 불가능.
const PEEKS = [
  { title: "타고난 그릇", desc: "당신을 이루는 첫 글자, 일간의 결" },
  { title: "오행의 풍경", desc: "다섯 기운이 그리는 나만의 지형" },
  { title: "재능의 흐름", desc: "십성이 알려주는 재능과 관계의 방향" },
  { title: "운의 계절", desc: "10년 단위로 흐르는 큰 계절, 대운" },
] as const;

/** 비로그인 총운 엿보기 — 잠긴 카드 4장 + 로그인 CTA. */
export default function ChongunPeek() {
  return (
    <section className="mt-5" aria-label="잠긴 총운 풀이">
      <div className="flex flex-col gap-3">
        {PEEKS.map((p) => (
          <div key={p.title} className="rounded-card bg-warm-surface p-5">
            <p className="flex items-center gap-2 text-sm font-medium text-text-main">
              <span aria-hidden>🔒</span> {p.title}
            </p>
            <p className="mt-1 text-xs text-text-soft">{p.desc}</p>
            <div className="mt-3 space-y-2">
              <div aria-hidden className="teaser-bar h-3 w-11/12 rounded-full bg-text-soft/15 blur-[2px]" />
              <div aria-hidden className="teaser-bar h-3 w-3/4 rounded-full bg-text-soft/15 blur-[2px]" />
            </div>
          </div>
        ))}
      </div>
      <Link
        href="/login"
        className="press mt-4 block w-full rounded-card bg-accent-coral py-3.5 text-center font-medium text-white"
      >
        로그인하고 무료로 열람 ✨
      </Link>
      <p className="mt-2 text-center text-xs text-text-soft">
        총운은 로그인만 하면 무료예요. 열어본 풀이는 보관함에 남아요.
      </p>
    </section>
  );
}
```

Run: `npx vitest run src/components/saju/ChongunPeek.test.tsx` → PASS (2 tests)

- [ ] **Step 3: 검증·커밋**

```bash
npm run verify
git add src/components/saju/
git commit -m "feat(saju): 총운 엿보기 — 제목·소개만 공개, 본문 서버 비노출(P9 §5.1)"
```

---

### Task 5: `/saju/chongun` 페이지 + 카탈로그 갱신

**Files:**
- Create: `src/app/(tabs)/saju/chongun/page.tsx`
- Modify: `src/lib/persona/products.ts` (chongun `href: "/me" → "/saju/chongun"`)
- Modify: `src/lib/persona/products.test.ts` (href 기대값 갱신)
- Modify: `src/app/(tabs)/saju/page.test.tsx` (live 링크 기대값 갱신)

**Interfaces:**
- Consumes: Task 1~4 전부, `readingAccess`, `readingInputHash`, `assembleChongun`, `SajuChart`, `PERSONAS`, `toKstParts`, `currentDaeun`, `ReadingRow`
- Produces: `/saju/chongun` 라우트

- [ ] **Step 1: 테스트 기대값 갱신(실패 유도)**

`src/lib/persona/products.test.ts`의 1단계 연결 테스트에서 `chongun: "live:/me"` → `chongun: "live:/saju/chongun"`.
`src/app/(tabs)/saju/page.test.tsx`의 live 링크 기대값 `["/me", "/match"]` → `["/saju/chongun", "/match"]`.

Run: `npx vitest run src/lib/persona/products.test.ts "src/app/(tabs)/saju/page.test.tsx"`
Expected: FAIL (현재 href는 /me)

- [ ] **Step 2: 카탈로그 갱신**

`src/lib/persona/products.ts`의 chongun 항목 `href: "/me"` → `href: "/saju/chongun"`.

Run: 위 두 테스트 → PASS

- [ ] **Step 3: 페이지 구현**

`src/app/(tabs)/saju/chongun/page.tsx`:

```tsx
import Link from "next/link";
import type { Metadata } from "next";
import { createServerSupabase } from "@/lib/supabase/server";
import { readingAccess } from "@/lib/consult/quota";
import { readingInputHash } from "@/lib/readings/hash";
import { assembleChongun } from "@/lib/interpret/content/chongun";
import { PROFILE_CONTEXT_VERSION } from "@/lib/engine/index";
import { currentDaeun } from "@/lib/engine/daeun";
import { toKstParts } from "@/lib/engine/kst";
import { PERSONAS } from "@/lib/persona/personas";
import SajuChart from "@/components/profile/SajuChart";
import ChongunPeek from "@/components/saju/ChongunPeek";
import type { ProfileRow, ReadingRow } from "@/lib/db/types";
import type { InterpretationSection } from "@/lib/interpret/types";

export const metadata: Metadata = {
  title: "총운 — 옴니마인드",
  description: "여덟 글자에 담긴 인생 전반의 흐름 — 로그인하면 무료.",
};

export const dynamic = "force-dynamic";

/**
 * 총운 풀이(2단계 스펙 §5) — 무료 상품으로 열람·캐싱·잠금 파이프라인을 검증한다.
 * 비로그인: 엿보기(본문 비노출) / 로그인·프로필 없음: 온보딩 유도 /
 * 로그인+프로필: readings 캐시 경유(같은 입력이면 재생성 없음 — P9 §6.2).
 */
export default async function ChongunPage() {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();

  const seoon = PERSONAS.seoon;
  const header = (
    <>
      <h1 className="font-[family-name:var(--font-serif-kr)] text-2xl text-primary-green">
        총운
      </h1>
      <p className="mt-1 text-sm text-text-soft">
        <span aria-hidden>📜</span> {seoon.name} · {seoon.greeting}
      </p>
    </>
  );

  const access = readingAccess("chongun", {
    loggedIn: Boolean(user),
    credits: 0, // 총운 판정에는 쓰이지 않는다 — 크레딧 상품은 3단계에서 실제 값 전달
    premiumUntil: null,
    now: new Date(),
  });

  if (!access.allowed) {
    // lockReason === "login" — 엿보기 + 로그인 CTA(본문은 이 응답에 없다)
    return (
      <main className="fade-rise p-6">
        {header}
        <ChongunPeek />
      </main>
    );
  }

  const { data: profile } = await supabase
    .from("profiles").select("*").eq("user_id", user!.id).maybeSingle<ProfileRow>();

  if (!profile) {
    return (
      <main className="fade-rise p-6">
        {header}
        <section className="mt-6 rounded-card border border-accent-coral/30 bg-warm-surface p-5">
          <p className="text-text-soft">
            총운을 풀려면 먼저 <span className="text-text-main">당신의 여덟 글자</span>가 필요해요.
          </p>
          <Link
            href="/onboarding"
            className="press mt-4 block w-full rounded-card bg-accent-coral py-3.5 text-center font-medium text-white"
          >
            나를 알아보기 ✨
          </Link>
        </section>
      </main>
    );
  }

  const ctx = profile.profile_context;

  // 현재 대운 간지 — 캐시 키에 포함(대운이 바뀌면 자연 재생성, 스펙 §3)
  const t = toKstParts(new Date());
  const age = Math.max(0, t.y - Number(profile.birth_date.slice(0, 4)));
  const season = ctx.daeun ? currentDaeun(ctx.daeun, age) : null;
  const hash = readingInputHash(ctx, season?.ganzhi ?? "none");

  // 캐시 조회 → 없으면 조립해 insert(P9 §6.2). 조회·저장 실패는 조용히 새 조립으로 폴백.
  let sections: InterpretationSection[] | null = null;
  const { data: cached } = await supabase
    .from("readings").select("*")
    .eq("user_id", user!.id).eq("product", "chongun").eq("input_hash", hash)
    .gte("context_version", PROFILE_CONTEXT_VERSION)
    .maybeSingle<ReadingRow>();
  if (cached) sections = cached.sections;

  if (!sections) {
    sections = assembleChongun(ctx, profile.nickname, age);
    await supabase.from("readings").insert({
      user_id: user!.id, product: "chongun", input_hash: hash,
      context_version: PROFILE_CONTEXT_VERSION, sections,
    });
  }

  return (
    <main className="fade-rise p-6">
      {header}
      <div className="mt-6">
        <SajuChart ctx={ctx} />
      </div>
      <div className="mt-6 space-y-4">
        {sections.map((s, i) => (
          <section key={`${i}-${s.title}`} className="rounded-card bg-warm-surface p-5">
            <h2 className="font-[family-name:var(--font-serif-kr)] text-lg text-primary-green">
              {s.title}
            </h2>
            <p className="mt-2 leading-relaxed text-text-main">{s.body}</p>
          </section>
        ))}
      </div>
      <Link href="/me" className="mt-6 block text-center text-sm text-text-soft underline">
        내 프로필·공유 카드 보기
      </Link>
    </main>
  );
}
```

- [ ] **Step 4: 검증**

Run: `npm run verify` → 통과. `npm run dev`: 비로그인 `/saju/chongun` → 엿보기(소스에 본문 없음), 로그인+프로필 → 총운 섹션.

- [ ] **Step 5: 커밋**

```bash
git add src/app/(tabs)/saju/chongun/ src/lib/persona/ "src/app/(tabs)/saju/page.test.tsx"
git commit -m "feat(saju): 총운 전용 풀이 — readingAccess 잠금·readings 캐시 경유·카탈로그 연결"
```

---

### Task 6: 최종 검증 · 머지

- [ ] **Step 1:** `npm run verify` 전체 통과
- [ ] **Step 2:** Supabase SQL Editor에서 `0010_stage2_readings.sql` 실행(사람 몫 — 미실행 시 총운은 캐시 없이 매번 조립될 뿐 화면은 동작)
- [ ] **Step 3:** 수동 스모크: ① 비로그인 /saju/chongun 엿보기(페이지 소스에 풀이 본문 없음) ② 로그인+프로필 → 총운 전체 ③ 재방문 → readings에 행 1개 그대로(created_at 불변 — 재생성 없음) ④ 사주팔자 탭 총운 카드 → /saju/chongun
- [ ] **Step 4:** 전체 브랜치 리뷰 → `omni-merge`로 main 머지·push·브랜치 정리

---

## Self-Review 기록

- **스펙 커버리지:** §2 readingAccess(Task 1 — 전수 테스트) · §3 캐싱(Task 2 해시·마이그레이션, Task 5 조회/insert 경로) · §4 assembleChongun(Task 3) · §5 화면 3상태(Task 4·5) · §6 테스트 목록 전 항목 · §7 비목표 준수(차감 실행·후기·LLM 없음).
- **타입 일관성:** `ReadingProduct`/`ReadingAccess`(Task 1) ↔ Task 5 호출부, `readingInputHash(ctx, season)`(Task 2) ↔ Task 5, `assembleChongun(ctx, nickname, age)`(Task 3) ↔ Task 5, `ReadingRow.sections: InterpretationSection[]`(Task 2) ↔ Task 5 렌더 일치.
- **엔진 시그니처 주의:** `computeProfile` 입력 필드와 `currentDaeun` 반환(첫 대운 이전 null 여부)은 기존 테스트·/me 사용례를 따르도록 태스크에 명시 — 구현자가 실제 시그니처와 다르면 픽스처만 맞추고 로직 요구는 유지.
- **캐시 안전성:** insert 실패(마이그레이션 미적용 등)는 무시되고 조립본으로 렌더 — 서비스 동작 우선(P9 §12 에러 처리 원칙).
