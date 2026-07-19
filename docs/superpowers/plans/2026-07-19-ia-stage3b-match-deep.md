# IA 3b — 궁합 심층 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 스펙 `docs/superpowers/specs/2026-07-19-ia-stage3-credit-readings.md` §5(3b) — 상대 정보를 직접 입력받는 크레딧 궁합 심층(`/saju/match-deep`), 3a의 하드닝된 차감 파이프라인 재사용.

**Architecture:** `computeDeepMatch(me, partner, mode)`는 양쪽 모두 완전한 `ProfileContext`를 요구한다(초대 수락 흐름에서 검증됨 — `partner.mbti.type`·`partner.blood.type` 접근). 따라서 심층 폼은 상대의 생년월일·시(모름 허용)·MBTI·혈액형을 **전부** 받고, 서버가 `computeProfile`로 상대 ctx를 만들어 기존 `assembleDeepMatch` 섹션 + 유료 LLM 문단을 캐시한다. 차감 로직(insert 성공 후 차감·동시 중복 재사용·LLM 실패 무차감)은 3a에서 리뷰로 굳힌 패턴을 **공용 헬퍼로 추출**해 두 액션이 함께 쓴다.

**Tech Stack:** 기존 엔진(match)·3a 파이프라인 재사용 · Vitest

## Global Constraints

- **커밋 전 `npm run verify` 통과 필수.** 브랜치 `feat/ia-stage3b-match-deep`(Task 1에서 main으로부터 생성).
- **차감 규칙(3a에서 확정·리뷰됨):** 캐시 히트 무차감 / insert **성공 후에만** RPC 차감 / insert 실패 시 동시 중복 행 재사용(무차감) 또는 무료 전달(손실 방향=회사) / LLM 실패=차감·캐시 없이 템플릿본 / RPC는 자체 try-catch 격리, null이면 remaining=0.
- **캐시 키:** `readingInputHash({ me: ctx, partner: 입력, mode }, "match-deep")` — 상대·모드가 다르면 새 풀이(새 차감), 같으면 재열람 무료. product 열은 `"match"`(quota의 `ReadingProduct`와 일치).
- **잠긴 본문 서버 비노출(P9 §5.1)** / **톤 규칙(§5.4)** — 기존과 동일.
- 상대 입력의 서버 저장은 readings의 캐시 행뿐(별도 테이블 없음). 검증은 순수 함수로 분리.
- 무료 `/match`는 유지하고 하단에 심층 업셀 링크 한 줄만 추가(기존 화면 개편 금지 — 스펙 §7).
- 클라이언트 컴포넌트는 엔진 import 금지.

## 파일 구조

```
src/lib/readings/match-input.ts / .test.ts        [신규] 상대 입력 파싱·검증(순수)
src/lib/readings/actions.ts                        [수정] 공용 헬퍼 추출 + unlockMatchDeep 추가
src/lib/interpret/content/match-deep.ts / .test.ts [신규] 섹션 제목 목록·LLM 프롬프트(조립은 기존 assembleDeepMatch)
src/components/saju/MatchDeepForm.tsx / .test.tsx  [신규] 상대 입력 폼 + 열기 + 결과(클라이언트)
src/app/(tabs)/saju/match-deep/page.tsx            [신규] 3상태 + 지난 궁합 기록
src/app/(tabs)/match/page.tsx                      [수정] 하단 업셀 링크 1줄
src/lib/persona/products.ts / .test.ts             [수정] match href → /saju/match-deep
src/app/(tabs)/saju/page.test.tsx                  [수정] 링크 기대값
```

---

### Task 1: 브랜치 + 상대 입력 검증 (`match-input.ts`)

**Files:**
- Create: `src/lib/readings/match-input.ts` / Test: `src/lib/readings/match-input.test.ts`

먼저 `git switch -c feat/ia-stage3b-match-deep main` 으로 브랜치를 만든다(이미 있으면 그 위에서 진행).

**Interfaces:**
- Consumes: `isMbti`(`@/lib/engine/mbti`), `isBloodType`(`@/lib/engine/blood`), `isMatchModeSlug`·`SLUG_TO_MODE`(`@/lib/engine/match`)
- Produces:
  - `interface MatchDeepInput { birthDate: string; birthTime: string | null; timeUnknown: boolean; mbti: Mbti; bloodType: BloodType; mode: MatchMode }`
  - `parseMatchDeepInput(raw: unknown): MatchDeepInput | null` — 형식 위반 시 null

- [ ] **Step 1: 실패하는 테스트 작성**

`src/lib/readings/match-input.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { parseMatchDeepInput } from "./match-input";

const valid = {
  birthDate: "1992-03-10", birthTime: "14:20", timeUnknown: false,
  mbti: "ISTP", bloodType: "O", mode: "lover",
};

describe("궁합 심층 상대 입력 검증 (3단계 스펙 §5)", () => {
  it("정상 입력 — 모드 슬러그가 한글 모드로 변환된다", () => {
    expect(parseMatchDeepInput(valid)).toEqual({
      birthDate: "1992-03-10", birthTime: "14:20", timeUnknown: false,
      mbti: "ISTP", bloodType: "O", mode: "연인",
    });
  });

  it("시간 모름 — birthTime은 null로 정규화", () => {
    const out = parseMatchDeepInput({ ...valid, birthTime: "", timeUnknown: true });
    expect(out?.birthTime).toBeNull();
    expect(out?.timeUnknown).toBe(true);
  });

  it("위반은 전부 null — 날짜 형식·시간 형식·MBTI·혈액형·모드", () => {
    expect(parseMatchDeepInput({ ...valid, birthDate: "1992/03/10" })).toBeNull();
    expect(parseMatchDeepInput({ ...valid, birthTime: "25:00" })).toBeNull();
    expect(parseMatchDeepInput({ ...valid, mbti: "ABCD" })).toBeNull();
    expect(parseMatchDeepInput({ ...valid, bloodType: "C" })).toBeNull();
    expect(parseMatchDeepInput({ ...valid, mode: "rival" })).toBeNull();
    expect(parseMatchDeepInput(null)).toBeNull();
    expect(parseMatchDeepInput("str")).toBeNull();
  });
});
```

- [ ] **Step 2: 실패 확인 후 구현**

Run: `npx vitest run src/lib/readings/match-input.test.ts` → FAIL (모듈 없음)

`src/lib/readings/match-input.ts`:

```ts
// 궁합 심층 상대 입력(3단계 스펙 §5) — computeDeepMatch가 상대도 완전한 ProfileContext를
// 요구하므로(MBTI·혈액형 접근) 전부 필수다. 검증은 순수 함수 — 액션이 신뢰 경계에서 호출.
import { isMbti } from "@/lib/engine/mbti";
import { isBloodType } from "@/lib/engine/blood";
import { isMatchModeSlug, SLUG_TO_MODE, type MatchMode } from "@/lib/engine/match";
import type { BloodType, Mbti } from "@/lib/engine/types";

export interface MatchDeepInput {
  birthDate: string;        // "YYYY-MM-DD"
  birthTime: string | null; // "HH:MM" — timeUnknown이면 null
  timeUnknown: boolean;
  mbti: Mbti;
  bloodType: BloodType;
  mode: MatchMode;          // 슬러그 입력을 한글 모드로 변환해 담는다
}

/** 클라이언트가 보낸 값 → 검증된 입력. 하나라도 어긋나면 null. */
export function parseMatchDeepInput(raw: unknown): MatchDeepInput | null {
  if (raw === null || typeof raw !== "object") return null;
  const d = raw as Record<string, unknown>;
  if (typeof d.birthDate !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(d.birthDate)) return null;
  if (typeof d.timeUnknown !== "boolean") return null;
  let birthTime: string | null = null;
  if (!d.timeUnknown) {
    if (typeof d.birthTime !== "string") return null;
    const t = /^(\d{2}):(\d{2})$/.exec(d.birthTime);
    if (!t || Number(t[1]) > 23 || Number(t[2]) > 59) return null;
    birthTime = d.birthTime;
  }
  if (typeof d.mbti !== "string" || !isMbti(d.mbti)) return null;
  if (typeof d.bloodType !== "string" || !isBloodType(d.bloodType)) return null;
  if (typeof d.mode !== "string" || !isMatchModeSlug(d.mode)) return null;
  return {
    birthDate: d.birthDate, birthTime, timeUnknown: d.timeUnknown,
    mbti: d.mbti, bloodType: d.bloodType, mode: SLUG_TO_MODE[d.mode],
  };
}
```

(참고: `isMbti`/`isBloodType`의 실제 export 위치가 다르면 — onboarding `draft.ts`의 import를 참조 — 실제 위치를 따른다.)

- [ ] **Step 3: 통과 확인 후 검증·커밋**

Run: 테스트 → PASS (3 tests)

```bash
npm run verify
git add src/lib/readings/match-input.ts src/lib/readings/match-input.test.ts
git commit -m "feat(readings): 궁합 심층 상대 입력 검증 — 전 필드 필수·모드 슬러그 변환"
```

---

### Task 2: 제목·프롬프트 (`content/match-deep.ts`) + 액션 공용화 + `unlockMatchDeep`

**Files:**
- Create: `src/lib/interpret/content/match-deep.ts` / Test: `src/lib/interpret/content/match-deep.test.ts`
- Modify: `src/lib/readings/actions.ts` (공용 헬퍼 추출 + `unlockMatchDeep`)

**Interfaces:**
- Consumes: `assembleDeepMatch`(기존), `computeDeepMatch`·`MatchMode`(엔진), `computeProfile`, `parseMatchDeepInput`, 3a의 차감 패턴
- Produces:
  - `matchDeepSectionTitles(mode: MatchMode): string[]` — assembleDeepMatch의 실제 제목 + LLM 제목 (엿보기용: "우리의 온도"·"기운의 흐름"·"서로를 채우는 조각"·"별이 말하길"·"마음이 만나는 자리"·"혈액형이 말하길"·`${mode}로서 함께할 때`·"당신만을 위한 이야기")
  - `matchDeepPrompt(sections: InterpretationSection[]): string`
  - `unlockMatchDeep(raw: unknown): Promise<UnlockResult>` — 서버 액션 (UnlockResult는 기존 재사용, `reason: "invalid"` 추가)

- [ ] **Step 1: 제목·프롬프트 실패 테스트**

`src/lib/interpret/content/match-deep.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { computeProfile } from "@/lib/engine";
import { computeDeepMatch, MATCH_MODES } from "@/lib/engine/match";
import { assembleDeepMatch } from "./match";
import { matchDeepPrompt, matchDeepSectionTitles } from "./match-deep";

const me = computeProfile({
  birthDate: "1990-06-15", birthTime: "07:30", timeUnknown: false,
  bloodType: "A", mbti: "ENFJ", gender: "male",
});
const partner = computeProfile({
  birthDate: "1992-03-10", birthTime: "14:20", timeUnknown: false,
  bloodType: "O", mbti: "ISTP",
});

describe("궁합 심층 제목·프롬프트 (3단계 스펙 §5)", () => {
  it("제목 목록이 실제 assembleDeepMatch 출력과 어긋날 수 없다 — 전 모드 대조", () => {
    for (const mode of MATCH_MODES) {
      const sections = assembleDeepMatch({
        match: computeDeepMatch(me, partner, mode),
        myElement: me.dayMaster.element, myName: "새벽", partnerName: "상대",
      });
      const titles = matchDeepSectionTitles(mode);
      expect(titles.slice(0, sections.length)).toEqual(sections.map((s) => s.title));
      expect(titles.at(-1)).toBe("당신만을 위한 이야기");
    }
  });

  it("프롬프트는 섹션 본문을 담고 새 단정을 금지한다", () => {
    const sections = assembleDeepMatch({
      match: computeDeepMatch(me, partner, "연인"),
      myElement: me.dayMaster.element, myName: "새벽", partnerName: "상대",
    });
    const p = matchDeepPrompt(sections);
    expect(p).toContain(sections[0].body.slice(0, 15));
    expect(p).toContain("새로운 단정");
  });
});
```

- [ ] **Step 2: 실패 확인 후 content 구현**

Run: 테스트 → FAIL (모듈 없음)

`src/lib/interpret/content/match-deep.ts`:

```ts
// 궁합 심층의 화면 계약(3단계 스펙 §5) — 조립은 기존 assembleDeepMatch(P7-2 검증)를 그대로
// 쓰고, 여기는 엿보기 제목 목록과 유료 LLM 프롬프트만 둔다.
import type { MatchMode } from "@/lib/engine/match";
import type { InterpretationSection } from "../types";
import { LLM_SECTION_TITLE } from "./credit-readings";

/** 엿보기용 제목(P9 §5.1 — 잠김 상태에도 제목은 공개). assembleDeepMatch의 실제 제목 순서. */
export function matchDeepSectionTitles(mode: MatchMode): string[] {
  return [
    "우리의 온도", "기운의 흐름", "서로를 채우는 조각", "별이 말하길",
    "마음이 만나는 자리", "혈액형이 말하길", `${mode}로서 함께할 때`, LLM_SECTION_TITLE,
  ];
}

/** 유료 LLM 개인화 요청문 — 두 사람의 결을 이어 다듬기만, 새 단정 금지(§5.4). */
export function matchDeepPrompt(sections: InterpretationSection[]): string {
  return [
    "[궁합 심층 · 유료 개인화]",
    ...sections.map((s) => `${s.title}: ${s.body}`),
    "위 궁합의 결 위에서, 두 사람이 지금 함께 살려볼 수 있는 구체적인 이야기를 3~4문장으로 들려줘요.",
    "위 문장을 반복하지 말고, 새로운 단정을 만들지 말고, 결을 이어서 다듬어줘요.",
  ].join("\n");
}
```

Run: 테스트 → PASS (2 tests)

- [ ] **Step 3: 액션 공용화 + unlockMatchDeep**

`src/lib/readings/actions.ts` 리팩터:
1. `UnlockResult`의 실패 reason에 `"invalid"` 추가.
2. 기존 `unlockReading`의 "LLM 성공 → insert(에러 확인) → 동시 중복 재사용/무료 전달 → 성공 시에만 RPC 차감(자체 try-catch, null→remaining 0)" 블록을 **비공개 헬퍼로 추출**:

```ts
/** 생성 성공본을 캐시하고 성공 시에만 차감한다 — 3a 리뷰로 굳힌 머니 패스(이중 차감 봉쇄). */
async function cacheAndCharge(args: {
  supabase: Awaited<ReturnType<typeof createServerSupabase>>;
  userId: string;
  product: string;
  hash: string;
  sections: InterpretationSection[];
  consumesCredit: boolean;
  remainingNow: number;
}): Promise<{ sections: InterpretationSection[]; usedCredit: boolean; remaining: number }> { ... }
```

(본문은 기존 unlockReading의 해당 블록을 그대로 옮긴다 — recordEvent 호출은 헬퍼 밖(액션별 product 라벨)에서. 동작 변화 0 — 기존 unlockReading 경로의 결과가 달라지면 안 된다.)

3. `unlockMatchDeep` 추가:

```ts
/** 궁합 심층 열람(3단계 스펙 §5) — 상대 전체 입력 필수, 캐시 키에 상대·모드 포함. */
export async function unlockMatchDeep(raw: unknown): Promise<UnlockResult> {
  const input = parseMatchDeepInput(raw);
  if (!input) return { ok: false, reason: "invalid" };

  try {
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { ok: false, reason: "auth" };

    const { data: profile } = await supabase
      .from("profiles").select("*").eq("user_id", user.id).maybeSingle<ProfileRow>();
    if (!profile) return { ok: false, reason: "no-profile" };

    const now = new Date();
    const credits = profile.consult_credits ?? 0;
    const premium = isPremium(profile.premium_until, now);
    const access = readingAccess("match", {
      loggedIn: true, credits, premiumUntil: profile.premium_until, now,
    });
    if (!access.allowed) return { ok: false, reason: "locked" };

    const ctx = await ensureCurrentProfile(supabase, profile);
    // 상대 ctx — 엔진이 형식·범위를 최종 검증(범위 밖 연도 등은 throw → catch에서 invalid로)
    let partnerCtx;
    try {
      partnerCtx = computeProfile({
        birthDate: input.birthDate, birthTime: input.birthTime,
        timeUnknown: input.timeUnknown, bloodType: input.bloodType, mbti: input.mbti,
      });
    } catch {
      return { ok: false, reason: "invalid" };
    }

    const hash = readingInputHash(
      { me: ctx, partner: { ...input }, mode: input.mode }, "match-deep",
    );
    const remainingNow = premium ? UNLIMITED : credits;

    const { data: cached } = await supabase
      .from("readings").select("*")
      .eq("user_id", user.id).eq("product", "match").eq("input_hash", hash)
      .gte("context_version", PROFILE_CONTEXT_VERSION)
      .maybeSingle<ReadingRow>();
    if (cached) {
      return { ok: true, sections: cached.sections, usedCredit: false, remaining: remainingNow };
    }

    const match = computeDeepMatch(ctx, partnerCtx, input.mode);
    const sections = assembleDeepMatch({
      match, myElement: ctx.dayMaster.element,
      myName: profile.nickname, partnerName: "상대",
    });

    const r = await respond(
      { profile: ctx, nickname: profile.nickname, history: [], message: matchDeepPrompt(sections) },
      { template: { chat: async () => "" }, llm: new OpenRouterProvider({ premium: true }) },
    );

    if (r.source === "llm" && r.text) {
      const full = [...sections, { title: LLM_SECTION_TITLE, body: r.text }];
      const out = await cacheAndCharge({
        supabase, userId: user.id, product: "match", hash, sections: full,
        consumesCredit: access.consumesCredit, remainingNow,
      });
      await recordEvent("reading_unlock", { product: "match", source: "llm", charged: out.usedCredit });
      return { ok: true, ...out };
    }

    await recordEvent("reading_unlock", { product: "match", source: "template" });
    return { ok: true, sections, usedCredit: false, remaining: remainingNow };
  } catch {
    return { ok: false, reason: "error" };
  }
}
```

(import 추가: `computeProfile`, `computeDeepMatch`, `assembleDeepMatch`, `matchDeepPrompt`, `parseMatchDeepInput`. 기존 unlockReading의 recordEvent 위치·의미는 그대로 유지하며 헬퍼 추출로만 정리한다.)

- [ ] **Step 4: 검증·커밋**

Run: `npx vitest run src/lib/interpret/content/match-deep.test.ts src/lib/readings/match-input.test.ts` → PASS
Run: `npm run verify` → 통과 (헬퍼 추출로 기존 테스트 영향 없음)

```bash
git add src/lib/interpret/content/match-deep.ts src/lib/interpret/content/match-deep.test.ts src/lib/readings/actions.ts
git commit -m "feat(readings): unlockMatchDeep — 상대 전체 입력·머니 패스 공용화(cacheAndCharge)"
```

---

### Task 3: `MatchDeepForm` 컴포넌트

**Files:**
- Create: `src/components/saju/MatchDeepForm.tsx` / Test: `src/components/saju/MatchDeepForm.test.tsx`

**Interfaces:**
- Consumes: `unlockMatchDeep`(mock 경계), `PickerInput`·`Choice`(UI 킷). 엔진 import 금지 — MBTI 조합은 로컬 상수로 만든다.
- Produces: `MatchDeepForm({ remaining, unlimited }: { remaining: number; unlimited: boolean })` — 상대 입력(생년월일·시/모름·MBTI 4축 Choice·혈액형·관계 모드) + 열기 버튼(크레딧 0·비무제한이면 충전 링크) + 성공 시 섹션 렌더.

- [ ] **Step 1: 실패하는 테스트 작성**

`src/components/saju/MatchDeepForm.test.tsx`:

```tsx
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import MatchDeepForm from "./MatchDeepForm";
import { unlockMatchDeep } from "@/lib/readings/actions";

vi.mock("@/lib/readings/actions", () => ({ unlockMatchDeep: vi.fn() }));

function fill(container: HTMLElement) {
  fireEvent.change(container.querySelector('input[type="date"]')!, {
    target: { value: "1992-03-10" },
  });
  fireEvent.click(screen.getByRole("button", { name: "시간을 몰라요" }));
  // MBTI 4축 — I / S / T / P
  for (const axis of ["I", "S", "T", "P"]) {
    fireEvent.click(screen.getByRole("button", { name: axis }));
  }
  fireEvent.click(screen.getByRole("button", { name: "O" }));   // 혈액형
  fireEvent.click(screen.getByRole("button", { name: "연인" })); // 모드
}

describe("MatchDeepForm (3단계 스펙 §5)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("상대 입력 필드 전부와 비활성 열기 버튼을 렌더한다", () => {
    render(<MatchDeepForm remaining={2} unlimited={false} />);
    expect(screen.getByText("상대의 생년월일")).toBeInTheDocument();
    expect(screen.getByText("상대의 태어난 시간")).toBeInTheDocument();
    expect(screen.getByText("상대의 MBTI")).toBeInTheDocument();
    expect(screen.getByText("상대의 혈액형")).toBeInTheDocument();
    expect(screen.getByText("우리는 어떤 사이인가요?")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /크레딧 1개로 열기/ })).toBeDisabled();
  });

  it("전부 채우면 버튼 활성 → 성공 시 섹션 렌더·액션에 슬러그 모드 전달", async () => {
    vi.mocked(unlockMatchDeep).mockResolvedValue({
      ok: true, usedCredit: true, remaining: 1,
      sections: [{ title: "우리의 온도", body: "두 분의 온도는 78°예요." }],
    });
    const { container } = render(<MatchDeepForm remaining={2} unlimited={false} />);
    fill(container);
    const btn = screen.getByRole("button", { name: /크레딧 1개로 열기/ });
    expect(btn).not.toBeDisabled();
    fireEvent.click(btn);
    expect(await screen.findByText("우리의 온도")).toBeInTheDocument();
    expect(vi.mocked(unlockMatchDeep)).toHaveBeenCalledWith({
      birthDate: "1992-03-10", birthTime: "", timeUnknown: true,
      mbti: "ISTP", bloodType: "O", mode: "lover",
    });
  });

  it("크레딧 0·비무제한 — 폼 대신 충전 링크", () => {
    render(<MatchDeepForm remaining={0} unlimited={false} />);
    expect(screen.getByRole("link", { name: /크레딧 채우기/ })).toHaveAttribute(
      "href", "/premium/credits",
    );
  });

  it("실패 — 부드러운 안내", async () => {
    vi.mocked(unlockMatchDeep).mockResolvedValue({ ok: false, reason: "error" });
    const { container } = render(<MatchDeepForm remaining={2} unlimited={false} />);
    fill(container);
    fireEvent.click(screen.getByRole("button", { name: /크레딧 1개로 열기/ }));
    expect(await screen.findByText(/지금은 풀이가 어려워요/)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: 실패 확인 후 구현**

Run: 테스트 → FAIL (모듈 없음)

`src/components/saju/MatchDeepForm.tsx`:

```tsx
"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import PickerInput from "@/components/ui/PickerInput";
import Choice from "@/components/ui/Choice";
import { unlockMatchDeep } from "@/lib/readings/actions";
import type { InterpretationSection } from "@/lib/interpret/types";

// 엔진 import 금지(번들 보호) — 축·혈액형·모드는 로컬 상수. 슬러그는 서버에서 검증·변환된다.
const AXES: [string, string][] = [["E", "I"], ["S", "N"], ["T", "F"], ["J", "P"]];
const BLOODS = ["A", "B", "O", "AB"] as const;
const MODES = [
  { slug: "lover", label: "연인" }, { slug: "friend", label: "친구" }, { slug: "coworker", label: "동료" },
] as const;

/** 궁합 심층 — 상대 전체 입력 → 크레딧 열기 → 결과 렌더(3단계 스펙 §5). */
export default function MatchDeepForm({
  remaining,
  unlimited,
}: {
  remaining: number;
  unlimited: boolean;
}) {
  const [birthDate, setBirthDate] = useState("");
  const [birthTime, setBirthTime] = useState("");
  const [timeUnknown, setTimeUnknown] = useState(false);
  const [axes, setAxes] = useState<(string | null)[]>([null, null, null, null]);
  const [blood, setBlood] = useState<string | null>(null);
  const [mode, setMode] = useState<string | null>(null);
  const [sections, setSections] = useState<InterpretationSection[] | null>(null);
  const [error, setError] = useState(false);
  const [pending, startTransition] = useTransition();

  if (sections) {
    return (
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
    );
  }

  if (!unlimited && remaining <= 0) {
    return (
      <div className="mt-5 rounded-card bg-warm-surface p-5 text-center">
        <p className="text-sm text-text-soft">
          궁합 심층은 크레딧 1개로 열 수 있어요. 지금은 남은 크레딧이 없네요.
        </p>
        <Link
          href="/premium/credits"
          className="press mt-4 block w-full rounded-card bg-accent-coral py-3.5 font-medium text-white"
        >
          크레딧 채우기
        </Link>
      </div>
    );
  }

  const mbti = axes.every(Boolean) ? axes.join("") : null;
  const canSubmit =
    /^\d{4}-\d{2}-\d{2}$/.test(birthDate) &&
    (timeUnknown || /^\d{2}:\d{2}$/.test(birthTime)) &&
    mbti !== null && blood !== null && mode !== null && !pending;

  const open = () => {
    setError(false);
    startTransition(async () => {
      const r = await unlockMatchDeep({
        birthDate, birthTime: timeUnknown ? "" : birthTime, timeUnknown,
        mbti, bloodType: blood, mode,
      });
      if (r.ok) setSections(r.sections);
      else setError(true);
    });
  };

  return (
    <div className="mt-5 rounded-card bg-warm-surface p-5">
      <label className="block text-sm text-text-soft">상대의 생년월일</label>
      <div className="mt-1">
        <PickerInput type="date" value={birthDate} onChange={setBirthDate} placeholder="생년월일을 선택해 주세요" bg="bg-warm-base" />
      </div>

      <label className="mt-4 block text-sm text-text-soft">상대의 태어난 시간</label>
      <div className="mt-1">
        <PickerInput type="time" value={birthTime} onChange={setBirthTime} placeholder="태어난 시각을 선택해 주세요" disabled={timeUnknown} bg="bg-warm-base" />
      </div>
      <div className="mt-2 grid grid-cols-1">
        <Choice small selected={timeUnknown} onClick={() => setTimeUnknown(!timeUnknown)} unselectedBg="bg-warm-base">
          시간을 몰라요
        </Choice>
      </div>

      <label className="mt-4 block text-sm text-text-soft">상대의 MBTI</label>
      <div className="mt-1 grid grid-cols-4 gap-2">
        {AXES.map(([a, b], i) => (
          <div key={a} className="grid gap-2">
            {[a, b].map((v) => (
              <Choice key={v} small selected={axes[i] === v} unselectedBg="bg-warm-base"
                onClick={() => setAxes(axes.map((x, j) => (j === i ? v : x)))}>
                {v}
              </Choice>
            ))}
          </div>
        ))}
      </div>

      <label className="mt-4 block text-sm text-text-soft">상대의 혈액형</label>
      <div className="mt-1 grid grid-cols-4 gap-2">
        {BLOODS.map((b) => (
          <Choice key={b} small selected={blood === b} onClick={() => setBlood(b)} unselectedBg="bg-warm-base">
            {b}
          </Choice>
        ))}
      </div>

      <label className="mt-4 block text-sm text-text-soft">우리는 어떤 사이인가요?</label>
      <div className="mt-1 grid grid-cols-3 gap-2">
        {MODES.map((m) => (
          <Choice key={m.slug} small selected={mode === m.slug} onClick={() => setMode(m.slug)} unselectedBg="bg-warm-base">
            {m.label}
          </Choice>
        ))}
      </div>

      <button
        type="button"
        disabled={!canSubmit}
        onClick={open}
        className="press mt-6 w-full rounded-card bg-accent-coral py-3.5 font-medium text-white disabled:opacity-40"
      >
        {pending ? "풀이를 준비하는 중…" : unlimited ? "지금 열어보기 ✨" : "크레딧 1개로 열기 ✨"}
      </button>
      {!unlimited && (
        <p className="mt-2 text-center text-xs text-text-soft">
          남은 크레딧 {remaining}개 · 같은 상대는 다시 볼 때 무료예요.
        </p>
      )}
      {error && (
        <p className="mt-2 text-center text-sm text-accent-coral">
          지금은 풀이가 어려워요. 잠시 뒤 다시 시도해 주시면 크레딧은 그대로예요.
        </p>
      )}
    </div>
  );
}
```

- [ ] **Step 3: 통과 확인 후 검증·커밋**

Run: 테스트 → PASS (4 tests)

```bash
npm run verify
git add src/components/saju/MatchDeepForm.tsx src/components/saju/MatchDeepForm.test.tsx
git commit -m "feat(saju): 궁합 심층 입력 폼 — 상대 전체 입력·열기/충전 분기·결과 렌더"
```

---

### Task 4: `/saju/match-deep` 페이지 + 연결 정리

**Files:**
- Create: `src/app/(tabs)/saju/match-deep/page.tsx`
- Modify: `src/app/(tabs)/match/page.tsx` (`<MatchForm …/>` 아래 업셀 링크 1줄)
- Modify: `src/lib/persona/products.ts` (match `href: "/match" → "/saju/match-deep"`)
- Modify: `src/lib/persona/products.test.ts`, `src/app/(tabs)/saju/page.test.tsx` (기대값)

**Interfaces:**
- Consumes: Task 1~3 전부, `matchDeepSectionTitles`, `ReadingPeek`, `PERSONAS`(홍연)
- Produces: `/saju/match-deep` 라우트

- [ ] **Step 1: 테스트 기대값 갱신(실패 유도)**

products.test: `match: "live:/match"` → `match: "live:/saju/match-deep"`.
saju/page.test: hrefs의 `"/match"` → `"/saju/match-deep"`.

Run → FAIL → `products.ts`의 match href 갱신 → PASS

- [ ] **Step 2: 페이지 구현**

`src/app/(tabs)/saju/match-deep/page.tsx`:

```tsx
import Link from "next/link";
import type { Metadata } from "next";
import { createServerSupabase } from "@/lib/supabase/server";
import { isPremium } from "@/lib/consult/quota";
import { matchDeepSectionTitles } from "@/lib/interpret/content/match-deep";
import { PERSONAS } from "@/lib/persona/personas";
import ReadingPeek from "@/components/saju/ReadingPeek";
import MatchDeepForm from "@/components/saju/MatchDeepForm";
import type { ProfileRow, ReadingRow } from "@/lib/db/types";

export const metadata: Metadata = {
  title: "궁합 심층 — 옴니마인드",
  description: "두 사람의 사주 전체가 만나는 이야기 — 상대 정보로 깊이 풀어드려요.",
};

export const dynamic = "force-dynamic";

/** 궁합 심층(3단계 스펙 §5) — 상대 입력형 크레딧 풀이. 지난 기록은 재열람 무료. */
export default async function MatchDeepPage() {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();

  const hongyeon = PERSONAS.hongyeon;
  const header = (
    <>
      <h1 className="font-[family-name:var(--font-serif-kr)] text-2xl text-primary-green">
        궁합 심층
      </h1>
      <p className="mt-1 text-sm text-text-soft">
        {hongyeon.name} · {hongyeon.greeting}
      </p>
    </>
  );

  if (!user) {
    return (
      <main className="fade-rise p-6">
        {header}
        <ReadingPeek titles={matchDeepSectionTitles("연인")} />
        <Link
          href="/login"
          className="press mt-4 block w-full rounded-card bg-accent-coral py-3.5 text-center font-medium text-white"
        >
          로그인하고 시작하기 ✨
        </Link>
      </main>
    );
  }

  const { data: profile } = await supabase
    .from("profiles").select("*").eq("user_id", user.id).maybeSingle<ProfileRow>();

  if (!profile) {
    return (
      <main className="fade-rise p-6">
        {header}
        <section className="mt-6 rounded-card border border-accent-coral/30 bg-warm-surface p-5">
          <p className="text-text-soft">
            궁합을 보려면 먼저 <span className="text-text-main">당신의 여덟 글자</span>가 필요해요.
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

  const premium = isPremium(profile.premium_until, new Date());
  const credits = profile.consult_credits ?? 0;

  // 지난 심층 궁합 — 재열람 무료(캐시 행 그대로)
  const { data: past } = await supabase
    .from("readings").select("*")
    .eq("user_id", user.id).eq("product", "match")
    .order("created_at", { ascending: false }).limit(10)
    .returns<ReadingRow[]>();

  return (
    <main className="fade-rise p-6">
      {header}
      <MatchDeepForm remaining={credits} unlimited={premium} />

      {(past ?? []).length > 0 && (
        <section className="mt-8">
          <h2 className="font-[family-name:var(--font-serif-kr)] text-lg text-primary-green">
            지난 궁합 기록
          </h2>
          <div className="mt-3 flex flex-col gap-3">
            {(past ?? []).map((r) => (
              <details key={r.id} className="rounded-card bg-warm-surface p-4">
                <summary className="cursor-pointer text-sm text-text-main">
                  {r.created_at.slice(0, 10)} · {r.sections[0]?.body.slice(0, 24)}…
                </summary>
                <div className="mt-3 space-y-3">
                  {r.sections.map((s, i) => (
                    <div key={`${i}-${s.title}`}>
                      <p className="text-sm font-medium text-primary-green">{s.title}</p>
                      <p className="mt-1 text-sm leading-relaxed text-text-main">{s.body}</p>
                    </div>
                  ))}
                </div>
              </details>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
```

- [ ] **Step 3: 무료 궁합 업셀 링크**

`src/app/(tabs)/match/page.tsx`의 `<MatchForm me={me} nickname={profile.nickname} />` 바로 아래에:

```tsx
      <Link
        href="/saju/match-deep"
        className="mt-6 block text-center text-sm text-text-soft underline"
      >
        두 사람의 사주 전체로 더 깊이 — 궁합 심층 보기
      </Link>
```

(`Link` import가 이미 있는지 확인 — 있다.)

- [ ] **Step 4: 검증·커밋**

Run: `npm run verify` → 통과. `npm run dev`: /saju/match-deep 비로그인 엿보기 → 로그인 폼 → 열기 → 결과, 재입력(같은 상대) → 무차감, /match 하단 업셀 링크.

```bash
git add -A
git commit -m "feat(saju): 궁합 심층 페이지 — 상대 입력·지난 기록·무료 궁합 업셀·카탈로그 연결"
```

---

### Task 5: 최종 검증 · 머지

- [ ] **Step 1:** `npm run verify` 전체 통과
- [ ] **Step 2:** 수동 스모크: ① 비로그인 엿보기(본문 없음) ② 크레딧 차감 1회·같은 상대 재열람 무차감·다른 상대/모드 새 차감 ③ LLM 실패 시 무차감 ④ 지난 기록 아코디언 ⑤ /match 업셀 ⑥ 기존 4종·총운 회귀 없음
- [ ] **Step 3:** 전체 브랜치 리뷰(머니 패스 재검 포함) → `omni-merge`로 main 머지·push·브랜치 정리

---

## Self-Review 기록

- **스펙 §5 커버리지:** 상대 전체 입력(Task 1·3 — computeDeepMatch의 완전 ctx 요구 반영) · 캐시 키에 상대·모드(Task 2) · 카탈로그 연결·1단계 임시 상태 해소(Task 4) · 무료 /match 유지+업셀(Task 4) · 차감 파이프라인 재사용(Task 2 cacheAndCharge).
- **타입 일관성:** `MatchDeepInput`(Task 1) ↔ unlockMatchDeep(Task 2) ↔ MatchDeepForm 전송 형태(Task 3 — 슬러그 모드·빈 birthTime) 일치. `matchDeepSectionTitles` ↔ assembleDeepMatch 실제 제목은 전 모드 대조 테스트로 고정(Task 2).
- **머니 패스:** 3a에서 리뷰로 굳힌 블록을 헬퍼로 추출해 공유 — 동작 변화 0을 기존 테스트+verify로 확인. partnerName은 "상대"(입력에 이름 없음 — YAGNI).
- **partner 입력의 gender 없음:** computeProfile에 gender 미전달 → daeun 없음 — 궁합 계산은 daeun을 쓰지 않으므로 무영향.
