# 오늘의 일진 — 년도·띠 기반 무료 훅 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 스펙 `docs/superpowers/specs/2026-07-18-daily-year-sign-design.md` 구현 — 온보딩 없이 출생 년도만으로 띠·년간 기반 상세 일진을 보여주는 `/daily` 페이지와, 홈 일진의 밤의 서재 통일.

**Architecture:** URL 파라미터 + 서버 렌더(`/daily?year=1990`) — 엔진이 클라이언트 번들에 실리지 않는다. 새 계산은 `src/lib/engine/year-sign.ts` 순수 함수 하나(년간지·띠 산술 + 지지 관계 테이블)뿐이고, 년간 십성 개인화는 기존 `computeDaily(date, myElement, myStem)`에 년간을 넘겨 재사용한다. `/daily`는 3상태(프로필 심화 / 띠 일진 / 입력 폼) 분기 서버 컴포넌트.

**Tech Stack:** Next.js 16 (App Router, Promise형 searchParams) · Vitest + Testing Library · 기존 엔진·페르소나 상수 재사용

## Global Constraints

- **커밋 전 `npm run verify` 통과 필수.** 작업 브랜치 `feat/daily-year-sign`(생성됨) 위에서 진행.
- **엔진 원칙:** `src/lib/engine/`는 순수 함수 — 네트워크·IO·`Date.now()`·로컬 `Date` 게터 금지. TDD 필수 영역.
- **톤 규칙(§5.4):** 새 사용자 대면 문구에서 `하세요`/`[가-힣]니다`/`조심하세요|나쁜 기운|불행`/`회원님|사용자님`/낙인형 `사람이(에요|죠|야)` 금지 — tone-guard 테스트로 강제. 충·형·파도 "나쁜 날" 단정 없이 마음가짐 제안으로 끝낸다.
- **관계 판정 우선순위(스펙 §4 확정):** 충 > 육합 > 삼합 > 형 > 해 > 파 > 무관계(null).
- **띠는 양력 연도 기준** — 화면에 입춘 고지 문구 필수: "띠는 양력 연도 기준이에요. 입춘(2월 초) 무렵에 태어났다면 앞뒤 띠일 수 있어요."
- **년도 유효 범위:** 1900 ≤ year ≤ 올해(KST). 범위 밖/비숫자 → 부드러운 안내와 함께 폼 재표시.
- 엔진을 클라이언트 컴포넌트에서 import하지 않는다(절기 테이블 번들 방지). 클라이언트는 `YearForm` 하나뿐.
- 컴포넌트는 디자인 토큰만 참조. 기존 `persona-card`/`persona-star` CSS 재사용.

## 파일 구조

```
src/lib/engine/year-sign.ts / year-sign.test.ts             [신규] 년간지·띠·지지 관계 순수 계산
src/lib/interpret/content/year-sign.ts / year-sign.test.ts  [신규] 관계 문구·헤더·고지 카피
src/components/daily/YearForm.tsx / YearForm.test.tsx        [신규] 년도 GET 폼(localStorage prefill)
src/components/daily/DailySignSection.tsx / .test.tsx        [신규] 띠 일진 상세(동기·props만)
src/app/daily/page.tsx                                       [신규] 3상태 분기 서버 컴포넌트
src/app/(tabs)/page.tsx                                      [수정] 일진 섹션 제거
src/components/home/ProductShelf.tsx / .test.tsx             [수정] daily 필터 제거
src/lib/persona/products.ts / products.test.ts               [수정] daily href → /daily
```

---

### Task 1: 엔진 — 년간지·띠·지지 관계 (`year-sign.ts`)

**Files:**
- Create: `src/lib/engine/year-sign.ts`
- Test: `src/lib/engine/year-sign.test.ts`

**Interfaces:**
- Consumes: `HEAVENLY_STEMS`, `EARTHLY_BRANCHES` from `./constants`
- Produces:
  - `const ZODIAC_ANIMALS: readonly string[]` — 12개, `EARTHLY_BRANCHES`(자~해)와 같은 인덱스
  - `interface YearSign { stem: number; branch: number; ganzhi: string; animal: string }`
  - `yearSign(year: number): YearSign`
  - `type BranchRelation = "육합" | "삼합" | "충" | "형" | "해" | "파"`
  - `branchRelation(a: number, b: number): BranchRelation | null` (a, b는 지지 인덱스 0=자…11=해)

- [ ] **Step 1: 실패하는 테스트 작성**

`src/lib/engine/year-sign.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { EARTHLY_BRANCHES } from "./constants";
import { ZODIAC_ANIMALS, yearSign, branchRelation } from "./year-sign";

describe("yearSign — 년도 → 년간지·띠 (스펙 §4)", () => {
  it("대조 년도: 1990=경오·말, 2000=경진·용, 1900=경자·쥐, 2026=병오·말", () => {
    expect(yearSign(1990)).toMatchObject({ ganzhi: "경오", animal: "말" });
    expect(yearSign(2000)).toMatchObject({ ganzhi: "경진", animal: "용" });
    expect(yearSign(1900)).toMatchObject({ ganzhi: "경자", animal: "쥐" });
    expect(yearSign(2026)).toMatchObject({ ganzhi: "병오", animal: "말" });
  });

  it("띠 배열은 12개고 지지 인덱스와 정렬된다 (자=쥐, 해=돼지)", () => {
    expect(ZODIAC_ANIMALS).toHaveLength(12);
    expect(EARTHLY_BRANCHES[0]).toBe("자");
    expect(ZODIAC_ANIMALS[0]).toBe("쥐");
    expect(ZODIAC_ANIMALS[11]).toBe("돼지");
  });

  it("stem·branch 인덱스가 ganzhi 문자열과 일치한다", () => {
    const s = yearSign(1984); // 갑자년
    expect(s).toMatchObject({ stem: 0, branch: 0, ganzhi: "갑자", animal: "쥐" });
  });
});

describe("branchRelation — 우선순위: 충 > 육합 > 삼합 > 형 > 해 > 파 (스펙 §4)", () => {
  const idx = (ch: string) => EARTHLY_BRANCHES.indexOf(ch as (typeof EARTHLY_BRANCHES)[number]);

  it("기본 관계: 자축=육합, 신자=삼합, 자오=충, 자미=해, 자유=파", () => {
    expect(branchRelation(idx("자"), idx("축"))).toBe("육합");
    expect(branchRelation(idx("신"), idx("자"))).toBe("삼합"); // 신자진 수국
    expect(branchRelation(idx("자"), idx("오"))).toBe("충");
    expect(branchRelation(idx("자"), idx("미"))).toBe("해");
    expect(branchRelation(idx("자"), idx("유"))).toBe("파");
  });

  it("겹치는 쌍은 우선순위로 하나만: 인해=육합(파 아님), 사신=육합(형·파 아님), 인사=형(해 아님)", () => {
    expect(branchRelation(idx("인"), idx("해"))).toBe("육합");
    expect(branchRelation(idx("사"), idx("신"))).toBe("육합");
    expect(branchRelation(idx("인"), idx("사"))).toBe("형");
  });

  it("형: 상호형(축술)·자묘형·자형(진진·오오·유유·해해)", () => {
    expect(branchRelation(idx("축"), idx("술"))).toBe("형");
    expect(branchRelation(idx("자"), idx("묘"))).toBe("형");
    expect(branchRelation(idx("진"), idx("진"))).toBe("형");
    expect(branchRelation(idx("오"), idx("오"))).toBe("형");
  });

  it("삼합은 같은 국의 서로 다른 지지만: 자진=삼합, 자자=null(자는 자형 아님)", () => {
    expect(branchRelation(idx("자"), idx("진"))).toBe("삼합");
    expect(branchRelation(idx("자"), idx("자"))).toBeNull();
  });

  it("무관계는 null이고 판정은 대칭이다", () => {
    expect(branchRelation(idx("자"), idx("인"))).toBeNull();
    for (let a = 0; a < 12; a++)
      for (let b = 0; b < 12; b++)
        expect(branchRelation(a, b)).toBe(branchRelation(b, a));
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `npx vitest run src/lib/engine/year-sign.test.ts`
Expected: FAIL — `Cannot find module './year-sign'`

- [ ] **Step 3: 구현**

`src/lib/engine/year-sign.ts`:

```ts
// 년도 하나로 구하는 년간지·띠와, 두 지지의 전통 관계(육합·삼합·충·형·해·파) 판정.
// 순수 산술 — 절기·시각 무관. 띠는 양력 연도 기준이며 입춘 경계는 화면에서 고지한다(설계서 §4).
import { HEAVENLY_STEMS, EARTHLY_BRANCHES } from "./constants";

/** EARTHLY_BRANCHES(자~해)와 같은 인덱스의 띠 동물. */
export const ZODIAC_ANIMALS = [
  "쥐", "소", "호랑이", "토끼", "용", "뱀", "말", "양", "원숭이", "닭", "개", "돼지",
] as const;

export interface YearSign {
  stem: number;   // 년간 인덱스(0=갑)
  branch: number; // 년지 인덱스(0=자)
  ganzhi: string; // "경오"
  animal: string; // "말"
}

/** 서기 년도 → 년간지·띠. 서기 4년=갑자년 앵커 산술(음수 모듈로 안전). */
export function yearSign(year: number): YearSign {
  const stem = (((year - 4) % 10) + 10) % 10;
  const branch = (((year - 4) % 12) + 12) % 12;
  return {
    stem,
    branch,
    ganzhi: HEAVENLY_STEMS[stem] + EARTHLY_BRANCHES[branch],
    animal: ZODIAC_ANIMALS[branch],
  };
}

export type BranchRelation = "육합" | "삼합" | "충" | "형" | "해" | "파";

// 관계 테이블 — 지지 인덱스 쌍(순서 무관). 삼합은 국(局) 단위.
const YUKHAP: [number, number][] = [[0, 1], [2, 11], [3, 10], [4, 9], [5, 8], [6, 7]];
//                                  자축      인해       묘술      진유     사신     오미
const SAMHAP: number[][] = [[8, 0, 4], [11, 3, 7], [2, 6, 10], [5, 9, 1]];
//                          신자진(수)  해묘미(목)   인오술(화)   사유축(금)
const HYEONG_GROUPS: number[][] = [[2, 5, 8], [1, 10, 7]]; // 인사신 · 축술미 (상호형)
const HYEONG_PAIRS: [number, number][] = [[0, 3]]; // 자묘형
const SELF_HYEONG = new Set([4, 6, 9, 11]); // 진·오·유·해 (자형 — 같은 지지끼리)
const HAE: [number, number][] = [[0, 7], [1, 6], [2, 5], [3, 4], [8, 11], [9, 10]];
const PA: [number, number][] = [[0, 9], [1, 4], [2, 11], [3, 6], [5, 8], [10, 7]];

const inPairs = (pairs: [number, number][], a: number, b: number) =>
  pairs.some(([x, y]) => (x === a && y === b) || (x === b && y === a));
const inGroup = (groups: number[][], a: number, b: number) =>
  a !== b && groups.some((g) => g.includes(a) && g.includes(b));

/**
 * 두 지지의 전통 관계. 겹치는 쌍(인-해=육합+파, 사-신=육합+형+파, 인-사=형+해 등)은
 * 설계서 §4의 우선순위 — 충 > 육합 > 삼합 > 형 > 해 > 파 — 로 하나만 돌려준다. 무관계면 null.
 */
export function branchRelation(a: number, b: number): BranchRelation | null {
  if ((a + 6) % 12 === b) return "충";
  if (inPairs(YUKHAP, a, b)) return "육합";
  if (inGroup(SAMHAP, a, b)) return "삼합";
  if (inGroup(HYEONG_GROUPS, a, b) || inPairs(HYEONG_PAIRS, a, b) || (a === b && SELF_HYEONG.has(a)))
    return "형";
  if (inPairs(HAE, a, b)) return "해";
  if (inPairs(PA, a, b)) return "파";
  return null;
}
```

- [ ] **Step 4: 통과 확인**

Run: `npx vitest run src/lib/engine/year-sign.test.ts`
Expected: PASS (6 tests)

- [ ] **Step 5: 검증 후 커밋**

```bash
npm run verify
git add src/lib/engine/year-sign.ts src/lib/engine/year-sign.test.ts
git commit -m "feat(engine): 년간지·띠·지지 관계 순수 계산 — 우선순위 충>육합>삼합>형>해>파"
```

---

### Task 2: 해석 문구 — 관계별 카피 (`content/year-sign.ts`)

**Files:**
- Create: `src/lib/interpret/content/year-sign.ts`
- Test: `src/lib/interpret/content/year-sign.test.ts`

**Interfaces:**
- Consumes: `BranchRelation` from `@/lib/engine/year-sign`; `checkTone`, `checkToneWarnings` from `@/lib/interpret/tone-guard`
- Produces:
  - `relationLine(r: BranchRelation | null): string` — 관계별 한 단락(무관계 포함 7종)
  - `signHeadline(year: number, animal: string): string` — `"1990년생, 말띠시군요."`
  - `const SOLAR_TERM_NOTE: string` — 입춘 고지
  - `const YEAR_STEM_LABEL: string` — `"타고난 해의 기운으로 보면"` (년간 십성 문단 라벨)

- [ ] **Step 1: 실패하는 테스트 작성**

`src/lib/interpret/content/year-sign.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { checkTone, checkToneWarnings } from "@/lib/interpret/tone-guard";
import type { BranchRelation } from "@/lib/engine/year-sign";
import {
  relationLine, signHeadline, SOLAR_TERM_NOTE, YEAR_STEM_LABEL,
} from "./year-sign";

const RELATIONS: (BranchRelation | null)[] = ["육합", "삼합", "충", "형", "해", "파", null];

describe("띠 일진 문구 (스펙 §5)", () => {
  it("관계 7종(무관계 포함) 전부 비어 있지 않은 단락을 돌려준다", () => {
    for (const r of RELATIONS) {
      expect(relationLine(r).length).toBeGreaterThan(20);
    }
  });

  it("모든 문구가 톤 가드를 통과한다 — 충·형·파도 공포 없이", () => {
    const texts = [
      ...RELATIONS.map((r) => relationLine(r)),
      signHeadline(1990, "말"),
      SOLAR_TERM_NOTE,
      YEAR_STEM_LABEL,
    ];
    for (const t of texts) {
      expect(checkTone(t)).toEqual([]);
      expect(checkToneWarnings(t)).toEqual([]);
    }
  });

  it("헤더는 년도와 띠를 담는다", () => {
    expect(signHeadline(1990, "말")).toBe("1990년생, 말띠시군요.");
  });

  it("입춘 고지는 양력 기준임을 밝힌다", () => {
    expect(SOLAR_TERM_NOTE).toContain("양력");
    expect(SOLAR_TERM_NOTE).toContain("입춘");
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `npx vitest run src/lib/interpret/content/year-sign.test.ts`
Expected: FAIL — `Cannot find module './year-sign'`

- [ ] **Step 3: 구현**

`src/lib/interpret/content/year-sign.ts`:

```ts
// 띠 일진 문구(설계서 §5) — 년지 × 오늘 일진 지지의 관계별 한 단락. 달지기 톤(~요체).
// 충·형·해·파도 '나쁜 날' 단정 없이 마음가짐 제안으로 끝낸다(§5.4 지적인 따뜻함).
import type { BranchRelation } from "@/lib/engine/year-sign";

const RELATION_LINE: Record<BranchRelation, string> = {
  육합: "당신의 띠와 오늘의 일진이 서로 손을 맞잡는 육합의 날이에요. 마음이 잘 통하고 매듭이 부드럽게 풀리니, 미뤄둔 만남이나 부탁을 꺼내보아도 좋아요.",
  삼합: "당신의 띠와 오늘의 기운이 한 방향으로 모이는 삼합의 날이에요. 여럿이 함께하는 일, 힘을 모으는 자리에서 흐름이 자연스럽게 붙어요.",
  충: "당신의 띠와 오늘의 일진이 마주 서는 충의 날이에요. 마음이 들뜨거나 변화가 생기기 쉬우니, 큰 결정은 한 번 더 숨을 고르고 중심을 지켜보아요.",
  형: "당신의 띠와 오늘의 기운이 서로 결을 다듬는 형의 날이에요. 작은 마찰에 마음 쓰기보다, 한 템포 쉬어가며 정리하는 하루가 어울려요.",
  해: "당신의 띠와 오늘의 기운이 살짝 어긋나는 해의 날이에요. 서두르면 엇갈리기 쉬우니, 약속과 말은 여유를 두고 천천히 건네보아요.",
  파: "당신의 띠와 오늘의 기운이 계획을 흔들 수 있는 파의 날이에요. 틀어진 일정에 마음 쓰기보다, 여백을 두고 유연하게 움직여보아요.",
};

const RELATION_NONE_LINE =
  "오늘의 일진과 당신의 띠는 특별히 부딪히는 자리 없이 평온하게 흐르는 사이예요. 담담하게, 나의 속도로 걷기 좋은 날이에요.";

/** 년지 × 오늘 일진 지지 관계의 한 단락. 무관계(null)도 온전한 문장을 돌려준다. */
export function relationLine(r: BranchRelation | null): string {
  return r ? RELATION_LINE[r] : RELATION_NONE_LINE;
}

/** 띠 일진 헤더 — "1990년생, 말띠시군요." */
export function signHeadline(year: number, animal: string): string {
  return `${year}년생, ${animal}띠시군요.`;
}

/** 입춘 경계 정직 고지(설계서 §4) — 년도만으로는 판별 불가. */
export const SOLAR_TERM_NOTE =
  "띠는 양력 연도 기준이에요. 입춘(2월 초) 무렵에 태어났다면 앞뒤 띠일 수 있어요.";

/** 년간 십성 문단 라벨 — 일간 기반 심화와 구분한다(설계서 §2). */
export const YEAR_STEM_LABEL = "타고난 해의 기운으로 보면";
```

- [ ] **Step 4: 통과 확인**

Run: `npx vitest run src/lib/interpret/content/year-sign.test.ts`
Expected: PASS (4 tests)

- [ ] **Step 5: 검증 후 커밋**

```bash
npm run verify
git add src/lib/interpret/content/year-sign.ts src/lib/interpret/content/year-sign.test.ts
git commit -m "feat(interpret): 띠 일진 문구 — 관계 7종·헤더·입춘 고지, 톤 가드 강제"
```

---

### Task 3: 년도 입력 폼 (`YearForm`)

**Files:**
- Create: `src/components/daily/YearForm.tsx`
- Test: `src/components/daily/YearForm.test.tsx`

**Interfaces:**
- Consumes: 없음 (엔진 import 금지 — 클라이언트 번들 보호)
- Produces: `YearForm({ currentYear, invalid }: { currentYear: number; invalid?: boolean })` — 기본 export. GET 제출로 같은 경로에 `?year=…`를 붙인다. 제출 시 localStorage(`om-birth-year`)에 저장, 마운트 시 prefill.

- [ ] **Step 1: 실패하는 테스트 작성**

`src/components/daily/YearForm.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import YearForm from "./YearForm";

describe("YearForm (스펙 §2 입력 폼)", () => {
  beforeEach(() => window.localStorage.clear());

  it("year 이름의 숫자 입력(1900~올해)과 제출 버튼을 GET 폼으로 렌더한다", () => {
    render(<YearForm currentYear={2026} />);
    const input = screen.getByLabelText("태어난 해 (4자리)");
    expect(input).toHaveAttribute("name", "year");
    expect(input).toHaveAttribute("min", "1900");
    expect(input).toHaveAttribute("max", "2026");
    expect(input.closest("form")).toHaveAttribute("method", "get");
    expect(screen.getByRole("button", { name: "내 띠로 오늘 보기" })).toBeInTheDocument();
  });

  it("invalid면 부드러운 안내를 보여준다", () => {
    render(<YearForm currentYear={2026} invalid />);
    expect(screen.getByText(/1900년부터 올해 사이/)).toBeInTheDocument();
  });

  it("localStorage에 저장된 년도를 prefill한다", () => {
    window.localStorage.setItem("om-birth-year", "1990");
    render(<YearForm currentYear={2026} />);
    expect(screen.getByLabelText("태어난 해 (4자리)")).toHaveValue(1990);
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `npx vitest run src/components/daily/YearForm.test.tsx`
Expected: FAIL — `Cannot find module './YearForm'`

- [ ] **Step 3: 구현**

`src/components/daily/YearForm.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "om-birth-year";

/**
 * 년도 입력 폼(설계서 §2) — GET 제출로 /daily?year=…를 서버가 렌더한다.
 * 입력값은 localStorage에 기억해 재방문 시 prefill만 한다(자동 리다이렉트는 하지 않음 — §2).
 * 엔진을 import하지 않는다 — 계산은 전부 서버 컴포넌트 몫.
 */
export default function YearForm({
  currentYear,
  invalid,
}: {
  currentYear: number;
  invalid?: boolean;
}) {
  const [year, setYear] = useState("");
  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved) setYear(saved);
  }, []);

  return (
    <form
      method="get"
      onSubmit={() => {
        if (year) window.localStorage.setItem(STORAGE_KEY, year);
      }}
      className="mt-5 rounded-card bg-warm-surface p-5"
    >
      <label className="text-sm text-text-soft" htmlFor="year-input">
        태어난 해 (4자리)
      </label>
      <input
        id="year-input"
        name="year"
        type="number"
        inputMode="numeric"
        min={1900}
        max={currentYear}
        required
        value={year}
        onChange={(e) => setYear(e.target.value)}
        placeholder="1990"
        className="mt-2 w-full rounded-card border border-text-soft/25 bg-warm-base p-3 text-text-main"
      />
      {invalid && (
        <p className="mt-2 text-sm text-accent-coral">
          1900년부터 올해 사이의 년도로 다시 알려주실래요?
        </p>
      )}
      <button
        type="submit"
        className="press mt-4 w-full rounded-card bg-accent-coral py-3.5 font-medium text-white"
      >
        내 띠로 오늘 보기
      </button>
    </form>
  );
}
```

- [ ] **Step 4: 통과 확인**

Run: `npx vitest run src/components/daily/YearForm.test.tsx`
Expected: PASS (3 tests)

- [ ] **Step 5: 검증 후 커밋**

```bash
npm run verify
git add src/components/daily/
git commit -m "feat(daily): 년도 입력 폼 — GET 제출·localStorage prefill·유효성 안내"
```

---

### Task 4: 띠 일진 상세 섹션 (`DailySignSection`)

**Files:**
- Create: `src/components/daily/DailySignSection.tsx`
- Test: `src/components/daily/DailySignSection.test.tsx`

**Interfaces:**
- Consumes: `YearSign`, `BranchRelation`(Task 1 타입), `relationLine`/`signHeadline`/`SOLAR_TERM_NOTE`/`YEAR_STEM_LABEL`(Task 2), `DailyGuide` from `@/lib/interpret/content/daily`, `PERSONAS` from `@/lib/persona/personas`
- Produces: `DailySignSection({ year, sign, relation, guide })` — 기본 export, 동기 컴포넌트(props만 — 테스트 가능). Task 5의 `/daily` 페이지가 사용.

- [ ] **Step 1: 실패하는 테스트 작성**

`src/components/daily/DailySignSection.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import DailySignSection from "./DailySignSection";
import { yearSign } from "@/lib/engine/year-sign";
import type { DailyGuide } from "@/lib/interpret/content/daily";

const guide: DailyGuide = {
  headline: "오늘은 화(병오)의 기운이 흐르는 날이에요.",
  mind: "해가 만물을 비추듯, 마음속 이야기를 환하게 꺼내 보여도 좋은 날이에요.",
  color: "밝은 코랄",
  keyword: "환한 표현",
  lucky: "안부 인사 한마디",
  personal: "오늘의 기운은 당신과 나란히 걷는 비견의 결이에요. 평소의 당신다움을 믿고 가면 되는 날이죠.",
};

describe("DailySignSection (스펙 §2 띠 일진)", () => {
  it("띠 헤더·년간지·공통 일진·띠 단락·년간 라벨·입춘 고지·온보딩 CTA를 렌더한다", () => {
    render(
      <DailySignSection year={1990} sign={yearSign(1990)} relation={"충"} guide={guide} />,
    );
    expect(screen.getByText("1990년생, 말띠시군요.")).toBeInTheDocument();
    expect(screen.getByText(/경오년의 기운/)).toBeInTheDocument();
    expect(screen.getByText(/화\(병오\)의 기운/)).toBeInTheDocument();
    expect(screen.getByText(/마주 서는 충의 날/)).toBeInTheDocument();
    expect(screen.getByText(/타고난 해의 기운으로 보면/)).toBeInTheDocument();
    expect(screen.getByText(/양력 연도 기준/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /나를 알아보기/ })).toHaveAttribute(
      "href", "/onboarding",
    );
  });

  it("personal이 null이면 년간 문단이 없다", () => {
    render(
      <DailySignSection
        year={1990} sign={yearSign(1990)} relation={null}
        guide={{ ...guide, personal: null }}
      />,
    );
    expect(screen.queryByText(/타고난 해의 기운으로 보면/)).not.toBeInTheDocument();
    expect(screen.getByText(/평온하게 흐르는 사이/)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `npx vitest run src/components/daily/DailySignSection.test.tsx`
Expected: FAIL — `Cannot find module './DailySignSection'`

- [ ] **Step 3: 구현**

`src/components/daily/DailySignSection.tsx`:

```tsx
import Link from "next/link";
import type { YearSign, BranchRelation } from "@/lib/engine/year-sign";
import type { DailyGuide } from "@/lib/interpret/content/daily";
import {
  relationLine, signHeadline, SOLAR_TERM_NOTE, YEAR_STEM_LABEL,
} from "@/lib/interpret/content/year-sign";
import { PERSONAS } from "@/lib/persona/personas";

/** 띠 일진 상세(설계서 §2) — 서버에서 계산된 결과만 받아 그리는 동기 컴포넌트. */
export default function DailySignSection({
  year,
  sign,
  relation,
  guide,
}: {
  year: number;
  sign: YearSign;
  relation: BranchRelation | null;
  guide: DailyGuide;
}) {
  return (
    <section className="persona-card mt-5 rounded-card bg-warm-surface p-6">
      <span aria-hidden className="persona-star" style={{ top: "12%", right: "10%" }} />
      <span aria-hidden className="persona-star" style={{ top: "26%", right: "24%" }} />
      <span aria-hidden className="persona-star" style={{ top: "16%", right: "38%" }} />
      <p className="text-xs text-text-soft">
        <span aria-hidden>🏮</span> {PERSONAS.dalzigi.name} · 오늘의 일진 — 누구나 무료
      </p>

      <h2 className="mt-2 font-[family-name:var(--font-serif-kr)] text-xl text-primary-green">
        {signHeadline(year, sign.animal)}
      </h2>
      <p className="mt-1 text-sm text-text-soft">{sign.ganzhi}년의 기운을 타고났어요.</p>

      {/* 공통 일진 — 기존 assembleDaily 그대로 */}
      <p className="mt-4 font-[family-name:var(--font-serif-kr)] text-lg leading-relaxed text-primary-green">
        {guide.headline}
      </p>
      <p className="mt-3 leading-relaxed text-text-main">{guide.mind}</p>

      {/* 띠 단락 — 년지 × 오늘 일진 지지의 전통 관계 */}
      <p className="mt-3 rounded-card bg-warm-base p-3 text-sm leading-relaxed text-text-main">
        {relationLine(relation)}
      </p>

      {/* 년간 십성 문단 — 일간 기반 심화와 구분되는 라벨을 붙인다(설계서 §2) */}
      {guide.personal && (
        <p className="mt-3 rounded-card bg-warm-base p-3 text-sm leading-relaxed text-text-main">
          {YEAR_STEM_LABEL}, {guide.personal}
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

      <p className="mt-4 text-xs text-text-soft">{SOLAR_TERM_NOTE}</p>

      <Link
        href="/onboarding"
        className="press mt-5 block w-full rounded-card bg-accent-coral py-3.5 text-center font-medium text-white"
      >
        생년월일시로 더 깊이 — 나를 알아보기 ✨
      </Link>
    </section>
  );
}
```

- [ ] **Step 4: 통과 확인**

Run: `npx vitest run src/components/daily/DailySignSection.test.tsx`
Expected: PASS (2 tests)

- [ ] **Step 5: 검증 후 커밋**

```bash
npm run verify
git add src/components/daily/DailySignSection.tsx src/components/daily/DailySignSection.test.tsx
git commit -m "feat(daily): 띠 일진 상세 섹션 — 띠 헤더·관계 단락·년간 라벨·입춘 고지·온보딩 CTA"
```

---

### Task 5: `/daily` 페이지 — 3상태 분기

**Files:**
- Create: `src/app/daily/page.tsx`

**Interfaces:**
- Consumes: Task 1~4 전부 + 기존: `computeDaily`(`@/lib/engine/daily`), `assembleDaily`(`@/lib/interpret/content/daily`), `toKstParts`(`@/lib/engine/kst`), `HEAVENLY_STEMS`/`EARTHLY_BRANCHES`/`ELEMENTS`/`stemElement`(`@/lib/engine/constants`), `createServerSupabase`, `DailyRecorder`, `ShareSheet`, `dailyCardQuery`, `PERSONAS`, DB 타입
- Produces: `/daily` 라우트. Task 6의 셸프 카드가 링크한다.

`/daily`는 세션·날짜를 읽는 async 서버 컴포넌트라 동기 렌더 테스트에서 제외한다(`pages.test.tsx` 기존 원칙). 상세 UI는 Task 3·4에서 이미 단위 테스트됨.

- [ ] **Step 1: 구현**

`src/app/daily/page.tsx`:

```tsx
import Link from "next/link";
import type { Metadata } from "next";
import { createServerSupabase } from "@/lib/supabase/server";
import { computeDaily } from "@/lib/engine/daily";
import { assembleDaily } from "@/lib/interpret/content/daily";
import { toKstParts } from "@/lib/engine/kst";
import {
  HEAVENLY_STEMS, EARTHLY_BRANCHES, ELEMENTS, stemElement,
} from "@/lib/engine/constants";
import { yearSign, branchRelation } from "@/lib/engine/year-sign";
import { PERSONAS } from "@/lib/persona/personas";
import DailyRecorder from "@/components/DailyRecorder";
import ShareSheet from "@/components/share/ShareSheet";
import YearForm from "@/components/daily/YearForm";
import DailySignSection from "@/components/daily/DailySignSection";
import { dailyCardQuery } from "@/lib/share/card-copy";
import type { ProfileRow, InterpretationRow } from "@/lib/db/types";

export const metadata: Metadata = {
  title: "오늘의 일진 — 옴니마인드",
  description: "출생 년도만으로 띠와 오늘의 일진을 풀어드려요. 누구나 무료.",
};

export const dynamic = "force-dynamic"; // 날짜·세션·쿼리에 따라 매번 렌더

/**
 * 오늘의 일진(설계서 §2) — 3상태 분기:
 * ① 프로필 있는 로그인 사용자 → 일간 기반 심화(홈에서 이사)
 * ② ?year=YYYY 유효 → 띠 일진 상세
 * ③ 그 외 → 달지기 인사 + 년도 입력 폼
 */
export default async function DailyPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string }>;
}) {
  const { year: yearParam } = await searchParams;
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();

  const todayKst = toKstParts(new Date());
  const todayDateStr = `${todayKst.y}-${String(todayKst.mo).padStart(2, "0")}-${String(todayKst.d).padStart(2, "0")}`;

  // ① 프로필 심화 — 홈에 있던 일진 섹션이 그대로 이사(설계서 §2·§3)
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

  if (profile) {
    const daily = computeDaily(
      { y: todayKst.y, mo: todayKst.mo, d: todayKst.d },
      profile.profile_context.dayMaster.element,
      profile.profile_context.dayMaster.stem,
    );
    const guide = assembleDaily(daily, profile.nickname);
    const llmParagraph =
      cachedDaily?.body.find((s) => s.title === "오늘, 당신만을 위한 이야기")?.body ?? null;

    return (
      <main className="fade-rise p-6">
        <h1 className="font-[family-name:var(--font-serif-kr)] text-2xl text-primary-green">
          오늘의 일진
        </h1>
        <section className="persona-card mt-5 rounded-card bg-warm-surface p-6">
          <span aria-hidden className="persona-star" style={{ top: "12%", right: "10%" }} />
          <span aria-hidden className="persona-star" style={{ top: "26%", right: "24%" }} />
          <span aria-hidden className="persona-star" style={{ top: "16%", right: "38%" }} />
          <p className="text-xs text-text-soft">
            <span aria-hidden>🏮</span> {PERSONAS.dalzigi.name} · 오늘의 일진 — 누구나 무료
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

          {/* 이 풀이의 근거(§7.3) — 핵심 3줄 + 전체 보기 */}
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

        <DailyRecorder />
        <ShareSheet
          query={dailyCardQuery(profile.profile_context, guide)}
          via="daily"
          label="오늘의 나 카드"
        />
        <Link href="/history" className="mt-4 block text-center text-sm text-text-soft underline">
          지난 이야기 보기
        </Link>
      </main>
    );
  }

  // ② 띠 일진 — ?year 유효성: 1900 ≤ year ≤ 올해(KST)
  const parsed = yearParam ? Number(yearParam) : NaN;
  const validYear =
    Number.isInteger(parsed) && parsed >= 1900 && parsed <= todayKst.y ? parsed : null;

  if (validYear) {
    const sign = yearSign(validYear);
    // 년간 십성 개인화 — 기존 computeDaily 재사용(설계서 §4): 년간을 내 천간으로 넘긴다
    const daily = computeDaily(
      { y: todayKst.y, mo: todayKst.mo, d: todayKst.d },
      ELEMENTS[stemElement(sign.stem)],
      HEAVENLY_STEMS[sign.stem],
    );
    const guide = assembleDaily(daily);
    const todayBranch = EARTHLY_BRANCHES.indexOf(
      daily.dayGanzhi[1] as (typeof EARTHLY_BRANCHES)[number],
    );
    const relation = branchRelation(sign.branch, todayBranch);

    return (
      <main className="fade-rise p-6">
        <h1 className="font-[family-name:var(--font-serif-kr)] text-2xl text-primary-green">
          오늘의 일진
        </h1>
        <DailySignSection year={validYear} sign={sign} relation={relation} guide={guide} />
        <p className="mt-4 text-center text-sm">
          <Link href="/daily" className="text-text-soft underline">
            다른 년도로 보기
          </Link>
        </p>
      </main>
    );
  }

  // ③ 입력 폼 — 달지기 인사. year 파라미터가 있었는데 무효면 부드러운 안내(설계서 §2)
  return (
    <main className="fade-rise p-6">
      <h1 className="font-[family-name:var(--font-serif-kr)] text-2xl text-primary-green">
        오늘의 일진
      </h1>
      <p className="mt-2 text-sm leading-relaxed text-text-soft">
        <span aria-hidden>🏮</span> {PERSONAS.dalzigi.greeting} 태어난 해만 알려주시면, 띠와
        오늘의 기운을 함께 볼 수 있어요.
      </p>
      <YearForm currentYear={todayKst.y} invalid={Boolean(yearParam)} />
    </main>
  );
}
```

- [ ] **Step 2: 검증**

Run: `npm run verify`
Expected: 통과. `npm run dev`로 `/daily`(폼) → `?year=1990`(말띠 상세) → `?year=1800`(안내와 함께 폼) 확인. 로그인+프로필 상태면 심화 뷰.

- [ ] **Step 3: 커밋**

```bash
git add src/app/daily/
git commit -m "feat(daily): /daily 3상태 페이지 — 프로필 심화·띠 일진·년도 입력 폼"
```

---

### Task 6: 홈·셸프·카탈로그 개편 — 일진을 서재로 통일

**Files:**
- Modify: `src/lib/persona/products.ts` (daily `href: "/" → "/daily"`)
- Modify: `src/lib/persona/products.test.ts` (daily href 단언 추가)
- Modify: `src/components/home/ProductShelf.tsx` (daily 제외 필터 제거)
- Modify: `src/components/home/ProductShelf.test.tsx` (5장·일진 첫 번째·/daily 링크)
- Modify: `src/app/(tabs)/page.tsx` (일진 섹션 제거)

**Interfaces:**
- Consumes: `/daily` 라우트(Task 5)
- Produces: 홈 = 헤더(동행일·배지 유지) + 오늘 밤 한 줄 + (프로필 없음 CTA) + 셸프 5장 + 마음/고민 + AdSlot + 로그아웃

- [ ] **Step 1: 실패하는 테스트로 변경 고정**

`src/components/home/ProductShelf.test.tsx` 전체를 다음으로 교체:

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import ProductShelf from "./ProductShelf";

describe("ProductShelf (§4.4 홈 상품 목록 — 일진 포함 5장)", () => {
  it("오늘의 일진이 맨 위, 총 5장 순서대로 렌더된다", () => {
    render(<ProductShelf />);
    const titles = ["오늘의 일진", "내 사주 심층 풀이", "궁합 심층", "인연 풀이", "재물 풀이"];
    const rendered = screen.getAllByRole("heading", { level: 3 }).map((h) => h.textContent);
    expect(rendered).toEqual(titles);
  });

  it("live 상품 링크: 일진 → /daily가 첫 번째", () => {
    render(<ProductShelf />);
    const hrefs = screen.getAllByRole("link").map((a) => a.getAttribute("href"));
    expect(hrefs).toEqual(["/daily", "/me", "/match"]);
  });
});
```

`src/lib/persona/products.test.ts`의 "live 상품은 실제 경로로 연결되고…" 테스트 안에 단언 한 줄 추가 — `for` 루프 위에:

```ts
    expect(PRODUCTS.find((p) => p.id === "daily")?.href).toBe("/daily");
```

- [ ] **Step 2: 실패 확인**

Run: `npx vitest run src/components/home/ProductShelf.test.tsx src/lib/persona/products.test.ts`
Expected: FAIL — 셸프 4장(일진 없음)·daily href "/"

- [ ] **Step 3: 구현 — 카탈로그·셸프**

`src/lib/persona/products.ts`의 daily 항목에서 `href: "/"` → `href: "/daily"`.

`src/components/home/ProductShelf.tsx`에서 필터 제거 — 함수 본문을 다음으로 교체:

```tsx
import { PRODUCTS } from "@/lib/persona/products";
import PersonaCard from "./PersonaCard";

/** 홈 상품 셸프(§4.4) — 오늘의 일진(무료 훅)이 맨 위, 전체 5장. */
export default function ProductShelf() {
  return (
    <section className="mt-8" aria-label="풀이 상품">
      <h2 className="font-[family-name:var(--font-serif-kr)] text-lg text-primary-green">
        밤의 서재
      </h2>
      <p className="mt-1 text-sm text-text-soft">네 명의 안내자가 각자의 풀이를 준비했어요.</p>
      <div className="mt-3 flex flex-col gap-3">
        {PRODUCTS.map((p) => (
          <PersonaCard key={p.id} product={p} />
        ))}
      </div>
    </section>
  );
}
```

- [ ] **Step 4: 구현 — 홈에서 일진 섹션 제거**

`src/app/(tabs)/page.tsx`에서:

1. **import 제거:** `computeDaily`, `assembleDaily`, `PERSONAS`, `DailyRecorder`, `ShareSheet`, `dailyCardQuery`, `InterpretationRow`(cachedDaily 전용이었음). `Link`·`redirect`·`createServerSupabase`·`currentMilestone`·`isMilestoneToday`·`toKstParts`·`AdSlot`·`ProductShelf`·`ProfileRow`는 유지.
2. **데이터 로직 축소:** `cachedDaily` 조회·`daily`/`guide` 계산·`llmParagraph` 제거. `todayDateStr`도 cachedDaily 전용이었으므로 제거. 프로필 조회는 단건으로:

```tsx
  let profile: ProfileRow | null = null;
  if (user) {
    const { data } = await supabase
      .from("profiles").select("*").eq("user_id", user.id).maybeSingle<ProfileRow>();
    profile = data ?? null;
  }
```

(`todayKst`는 더 쓰지 않으므로 함께 제거. `companionDays` 계산은 그대로.)

3. **JSX 제거:** `{/* 오늘의 일진 — 달지기 … */}` 섹션 전체, `{profile && (<> <DailyRecorder/> <ShareSheet/> … 지난 이야기 링크 </>)}` 블록 전체.
4. **유지:** h1+동행일/배지, "오늘 밤도 당신의 이야기를 켜 두었어요." 한 줄, 프로필 없음 CTA 섹션, `<ProductShelf />`, 마음/고민 그리드, `<AdSlot />`, 로그아웃 폼.

- [ ] **Step 5: 통과 확인 + 검증**

Run: `npx vitest run src/components/home/ProductShelf.test.tsx src/lib/persona/products.test.ts`
Expected: PASS (4 tests)
Run: `npm run verify` → 통과 (미사용 import가 남으면 lint가 잡는다 — 모두 제거됐는지 확인)

- [ ] **Step 6: 육안 확인 + 커밋**

`npm run dev`: 홈에 일진 섹션이 없고 서재 맨 위 '오늘의 일진' 카드 → `/daily` 이동 확인.

```bash
git add src/lib/persona/ src/components/home/ src/app/(tabs)/page.tsx
git commit -m "feat(home): 일진을 밤의 서재로 통일 — 홈 섹션 제거·셸프 5장·daily 카드 /daily 연결"
```

---

### Task 7: 최종 검증 · 머지

- [ ] **Step 1:** `npm run verify` 전체 통과 확인
- [ ] **Step 2:** 수동 스모크: ① `/daily` 폼 → 1990 제출 → "1990년생, 말띠시군요" + 관계 단락 + 년간 문단 + 입춘 고지 ② 재방문 시 년도 prefill ③ 잘못된 년도(1800) → 안내 ④ 로그인+프로필 → 심화 뷰(하루기록·공유 동작) ⑤ 홈 → 서재 → 일진 카드 진입
- [ ] **Step 3:** `omni-merge` 스킬로 리뷰 확인 후 main 머지·push·브랜치 정리

---

## Self-Review 기록

- **스펙 커버리지:** §2 3상태(Task 5) · §3 홈 변경(Task 6) · §4 계산+우선순위+입춘 고지(Task 1·2·4) · §5 문구 7종+톤(Task 2) · §7 파일 구조 일치 · §8 테스트 항목 전부 대응(홈 일진 부재는 §8대로 스모크). §9 비목표 준수 — 서버 저장·정밀 입춘 판정 없음.
- **타입 일관성:** `YearSign`/`BranchRelation`(Task 1) ↔ Task 2 `relationLine(r: BranchRelation | null)` ↔ Task 4 props ↔ Task 5 사용부 일치. `DailyGuide.personal: string | null`(기존) 처리 확인.
- **관계 테이블 검증:** 스펙 §8 케이스 전부 테스트에 반영(인해=육합, 사신=육합, 인사=형, 진진=형, 자진=삼합, 자자=null). 대칭성 전수(12×12) 테스트 포함.
- **번들 보호:** 클라이언트 컴포넌트(YearForm)는 엔진 import 없음 — Global Constraints로 고정, 리뷰 관점 포함.
