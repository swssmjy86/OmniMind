# P2 온보딩 + 프로필 Implementation Plan (🚀 소프트 런칭)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
> 설계서(SSOT): `docs/superpowers/specs/2026-07-13-omnimind-design.md` · 로드맵: `2026-07-13-omnimind-roadmap.md` · 계산 엔진: `2026-07-14-p1-engine.md`(완료)

**Goal:** 로그인한 사용자가 **대화형 온보딩 4단계**(생년월일시→혈액형→MBTI→별자리 확인)를 거쳐, P1 엔진으로 계산된 데이터를 **템플릿만으로(LLM 없이)** 따뜻한 문장으로 풀어낸 **"온전한 나" 프로필**을 첫 공개받는다. 이 단계 배포부터 **실제 사용자가 유입**된다.

**Architecture:** P1 엔진(`computeProfile`)이 순수 계산을, **템플릿 문장 엔진**(`src/lib/interpret/`)이 계산 결과를 문장으로 조립한다. 온보딩은 클라이언트 다단계 폼, 제출은 **서버 액션**이 받아 `computeProfile()` → Supabase `profiles` 저장 → 프로필 해석문을 `interpretations`에 캐시. 프로필 화면은 서버 컴포넌트로 저장된 컨텍스트를 읽어 렌더한다.

```
[/onboarding] 4단계 폼 (client)
      │ submit (server action)
      ▼
computeProfile(input)  ── P1 엔진(순수)
      │
      ├─► profiles.upsert(profile_context jsonb)   ── Supabase
      └─► assembleProfile(ctx) ── 템플릿 엔진(0단계, 항상 동작)
              │ tone-guard 통과
              ▼
          interpretations(kind='profile', source='template')  ── 캐시
      │
      ▼
[/me] "온전한 나" 프로필 공개 (server component, 공개 연출)
```

**Tech Stack:** Next.js(App Router) 서버 액션·서버 컴포넌트, Supabase(PostgreSQL + RLS), `src/lib/engine`(P1), 신규 `src/lib/interpret`, Vitest, Playwright(E2E).

## Global Constraints

- **LLM 미사용.** P2는 템플릿 문장 엔진(3단 해석 중 0~2단계)만으로 완결. Gemini 연동은 P5.
- 모든 사용자 대면 문구는 설계서 **§5.4 문체 규칙** 준수 — 단정("~입니다")·명령("~하세요")·분석용어·공포·"회원님/사용자님" 금지. **닉네임으로 호명.** 이를 `tone-guard`가 자동 검사(Task 7)하고, 템플릿 콘텐츠(Task 5)는 전부 이 검사를 통과해야 한다.
- 컬러·서체는 P0 디자인 토큰만 사용(`bg-warm-base`, `text-primary-green`, `font-serif-kr` 등). 모바일 우선(max 480px).
- **개인정보 최소·보호:** 생년월일시는 프로필 계산·저장에만 사용. RLS로 본인 행만 접근. 비밀값(`.env.local`) 커밋 금지.
- 커밋 전 `npm run verify` 통과 필수. 계산 로직이 아닌 UI/콘텐츠는 TDD 강제 아님이나, **템플릿 엔진·톤 가드는 정답이 있으므로 TDD 적용**.
- 작업 환경: Windows / PowerShell.

### 설계 결정 (P2 범위 확정)

| 결정 | 내용 | 근거 |
|------|------|------|
| 템플릿 콘텐츠 저장 위치 | **TS 콘텐츠 모듈**(`src/lib/interpret/content/`) | 버전관리·테스트·타입안전. `templates` DB 테이블은 스키마만 두고 **P5 LLM 캐시/CMS용으로 예약** |
| 프로필 해석 캐시 | 최초 생성 시 `interpretations`에 저장 | 설계서 데이터 모델 준수 + "첫 공개" 텍스트 고정. 템플릿은 결정론적이라 재생성도 가능 |
| 제출 처리 | **서버 액션**(API 라우트 아님) | App Router 관용, 타입 공유 용이 |
| 닉네임 | 온보딩 0단계에서 입력받아 `profiles.nickname` 저장 | §5.4 "닉네임으로 부르기" |
| 재온보딩 | 프로필 있으면 `/me`로, 없으면 `/onboarding`로 유도 | 1인 1프로필(v1) |

---

### Task 1: DB 스키마 (profiles·interpretations·templates) + RLS

**Files:**
- Create: `supabase/migrations/0001_p2_profiles.sql`
- Create: `src/lib/db/types.ts` (행 타입)

**Interfaces:**
- Produces: `profiles`(1인 1행), `interpretations`(해석 캐시), `templates`(예약) 테이블 + RLS 정책. 이후 서버 액션·프로필 화면이 이 스키마에 의존.

- [ ] **Step 1: 🖐️ 수동 — Supabase SQL 에디터에서 마이그레이션 실행 (사용자 작업)**

Supabase 대시보드 → SQL Editor → 아래 SQL 실행. (또는 Supabase CLI `supabase db push`)

```sql
-- supabase/migrations/0001_p2_profiles.sql

-- 프로필: 1인 1행. 계산 결과(profile_context)를 jsonb로 영구 저장.
create table public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  nickname text not null,
  birth_date date not null,
  birth_time time,                 -- 출생시간 미상이면 null
  time_unknown boolean not null default false,
  blood_type text not null check (blood_type in ('A','B','O','AB')),
  mbti text not null check (char_length(mbti) = 4),
  profile_context jsonb not null,  -- computeProfile() 산출 ProfileContext
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 해석 캐시: 프로필/데일리/조언. 같은 것을 두 번 생성하지 않음.
create table public.interpretations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('profile','daily','advice')),
  target_date date,                -- daily용. profile은 null
  body jsonb not null,             -- 섹션 배열 {title, body}[]
  source text not null check (source in ('template','llm')) default 'template',
  created_at timestamptz not null default now(),
  unique (user_id, kind, target_date)
);

-- 템플릿(예약): P2는 TS 콘텐츠 모듈 사용. P5 LLM 캐시/CMS용.
create table public.templates (
  id uuid primary key default gen_random_uuid(),
  category text not null,
  combo_key text not null,
  text text not null,
  unique (category, combo_key)
);

-- RLS: 본인 행만 접근
alter table public.profiles enable row level security;
alter table public.interpretations enable row level security;

create policy "own profile: select" on public.profiles
  for select using (auth.uid() = user_id);
create policy "own profile: upsert" on public.profiles
  for insert with check (auth.uid() = user_id);
create policy "own profile: update" on public.profiles
  for update using (auth.uid() = user_id);

create policy "own interp: select" on public.interpretations
  for select using (auth.uid() = user_id);
create policy "own interp: insert" on public.interpretations
  for insert with check (auth.uid() = user_id);
```

Expected: 3개 테이블 + RLS 정책 생성. `profiles`/`interpretations`는 본인만 접근.

- [ ] **Step 2: 행 타입 정의(수기, 최소)**

```ts
// src/lib/db/types.ts
import type { ProfileContext } from "@/lib/engine";

export interface ProfileRow {
  user_id: string;
  nickname: string;
  birth_date: string; // "YYYY-MM-DD"
  birth_time: string | null; // "HH:mm:ss"
  time_unknown: boolean;
  blood_type: "A" | "B" | "O" | "AB";
  mbti: string;
  profile_context: ProfileContext;
  created_at: string;
  updated_at: string;
}

export interface InterpretationSection { title: string; body: string; }
export interface InterpretationRow {
  id: string;
  user_id: string;
  kind: "profile" | "daily" | "advice";
  target_date: string | null;
  body: InterpretationSection[];
  source: "template" | "llm";
  created_at: string;
}
```

- [ ] **Step 3: Commit** — `git add supabase src/lib/db ; git commit -m "feat(db): profiles/interpretations/templates schema with RLS (P2-1)"`

---

### Task 2: 대화형 온보딩 UI (4단계 + 닉네임)

**Files:**
- Create: `src/app/onboarding/page.tsx` (서버: 인증·기존 프로필 가드)
- Create: `src/app/onboarding/OnboardingFlow.tsx` (client: 단계 상태)
- Create: `src/components/onboarding/*` (Step 컴포넌트들)
- Create: `src/lib/engine` 재사용: 별자리 미리보기용 `zodiacSign`

**Interfaces:**
- Produces: `/onboarding` — 한 화면에 하나씩, 따뜻한 문구. 마지막에 서버 액션 `createProfile`(Task 3) 호출. MBTI 모름 → 간이 안내/링크.

- [ ] **Step 1: 온보딩 서버 가드**

```tsx
// src/app/onboarding/page.tsx
import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase/server";
import OnboardingFlow from "./OnboardingFlow";

export default async function OnboardingPage() {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles").select("user_id").eq("user_id", user.id).maybeSingle();
  if (profile) redirect("/me"); // 이미 프로필 있음

  const defaultNickname = (user.user_metadata?.name as string) ?? "";
  return <OnboardingFlow defaultNickname={defaultNickname} />;
}
```

- [ ] **Step 2: 다단계 플로우 (닉네임 → 생년월일시 → 혈액형 → MBTI → 별자리 확인)**

설계서 카피 기준점(§5.5)을 그대로 사용. 진행 표시는 은은하게(점/바). 각 단계 컴포넌트는 값과 `onNext`를 받는 순수 프레젠테이션.

```tsx
// src/app/onboarding/OnboardingFlow.tsx
"use client";

import { useState } from "react";
import { createProfile } from "./actions";
import { zodiacSign } from "@/lib/engine/zodiac";
import type { BloodType, Mbti } from "@/lib/engine/types";

type Draft = {
  nickname: string;
  birthDate: string; birthTime: string; timeUnknown: boolean;
  bloodType: BloodType | null; mbti: Mbti | null;
};

export default function OnboardingFlow({ defaultNickname }: { defaultNickname: string }) {
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<Draft>({
    nickname: defaultNickname, birthDate: "", birthTime: "", timeUnknown: false,
    bloodType: null, mbti: null,
  });
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = (patch: Partial<Draft>) => setDraft((d) => ({ ...d, ...patch }));

  async function submit() {
    setPending(true); setError(null);
    const res = await createProfile({
      nickname: draft.nickname.trim(),
      birthDate: draft.birthDate,
      birthTime: draft.timeUnknown ? null : draft.birthTime,
      timeUnknown: draft.timeUnknown,
      bloodType: draft.bloodType!,
      mbti: draft.mbti!,
    });
    if (res?.error) { setError(res.error); setPending(false); }
    // 성공 시 서버 액션이 redirect("/me?reveal=1")
  }

  const zodiacPreview = draft.birthDate
    ? zodiacSign(Number(draft.birthDate.slice(5, 7)), Number(draft.birthDate.slice(8, 10)))
    : null;

  // step 0~4 렌더. 각 스텝 컴포넌트는 src/components/onboarding/ 에.
  // 0: 닉네임  "어떻게 불러드리면 좋을까요?"
  // 1: 생년월일시  "당신이 세상에 온 순간을 알려주세요…" + [시간 몰라요] 토글
  // 2: 혈액형  A/B/O/AB 카드 선택
  // 3: MBTI  16 그리드 + "잘 모르겠어요" → 안내
  // 4: 별자리 확인  zodiacPreview 노출 + "당신을 알아갈 준비가 됐어요" → submit
  return (
    <main className="mx-auto flex min-h-dvh max-w-[480px] flex-col p-6">
      {/* 진행 표시 + 현재 스텝 컴포넌트 + 다음/이전 버튼. error 표시. */}
      {/* pending 이면 "당신의 조각들을 잇는 중이에요…" (§5.5 로딩 카피) */}
    </main>
  );
}
```

- [ ] **Step 3: 스텝 컴포넌트 5종 작성 (문체 규칙 준수)**

`src/components/onboarding/`에 `NicknameStep`, `BirthStep`(date+time+미상 토글), `BloodStep`, `MbtiStep`, `ZodiacConfirmStep`. 모두 디자인 토큰·명조 제목·큰 라운드. 입력 검증(빈 값 방지)은 각 스텝의 "다음" 활성화 조건으로.

- [ ] **Step 4: 렌더 확인** — `npm run dev` → `/onboarding` 4단계 이동, MBTI/혈액형 선택, 별자리 자동 표시. (로그인 필요)

- [ ] **Step 5: Commit** — `git commit -am "feat(onboarding): 4-step conversational onboarding UI (P2-2)"`

---

### Task 3: 온보딩 제출 → computeProfile() → 저장 (서버 액션)

**Files:**
- Create: `src/app/onboarding/actions.ts`

**Interfaces:**
- Consumes: P1 `computeProfile`, Task 4 `assembleProfile`, Task 7 `assertTone`
- Produces: `createProfile(input)` 서버 액션 — 검증 → 계산 → `profiles` upsert → 해석 조립·톤검사 → `interpretations` 캐시 → `redirect("/me?reveal=1")`

- [ ] **Step 1: 서버 액션**

```ts
// src/app/onboarding/actions.ts
"use server";

import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase/server";
import { computeProfile } from "@/lib/engine";
import { assembleProfile } from "@/lib/interpret/templates";
import { assertTone } from "@/lib/interpret/tone-guard";
import type { BloodType, Mbti } from "@/lib/engine/types";

interface CreateInput {
  nickname: string;
  birthDate: string; birthTime: string | null; timeUnknown: boolean;
  bloodType: BloodType; mbti: Mbti;
}

export async function createProfile(input: CreateInput): Promise<{ error: string } | void> {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "로그인이 필요해요." };
  if (!input.nickname) return { error: "불러드릴 이름을 알려주세요." };

  let context;
  try {
    context = computeProfile({
      birthDate: input.birthDate,
      birthTime: input.birthTime,
      timeUnknown: input.timeUnknown,
      bloodType: input.bloodType,
      mbti: input.mbti,
    });
  } catch (e) {
    return { error: "입력을 다시 확인해 주세요." };
  }

  const { error: upErr } = await supabase.from("profiles").upsert({
    user_id: user.id,
    nickname: input.nickname,
    birth_date: input.birthDate,
    birth_time: input.timeUnknown ? null : input.birthTime,
    time_unknown: input.timeUnknown,
    blood_type: input.bloodType,
    mbti: input.mbti,
    profile_context: context,
    updated_at: new Date().toISOString(),
  });
  if (upErr) return { error: "잠시 길을 잃었어요. 다시 시도해 주세요." };

  // 프로필 해석 조립 (템플릿, 0단계) + 톤 검사 + 캐시
  const sections = assembleProfile(context, input.nickname);
  assertTone(sections.map((s) => s.body).join("\n")); // 위반 시 throw → 개발 중 콘텐츠 교정
  await supabase.from("interpretations").upsert({
    user_id: user.id, kind: "profile", target_date: null,
    body: sections, source: "template",
  }, { onConflict: "user_id,kind,target_date" });

  redirect("/me?reveal=1");
}
```

- [ ] **Step 2: Commit** — `git commit -am "feat(onboarding): createProfile server action → compute + persist + cache (P2-3)"`

---

### Task 4: 템플릿 문장 엔진

**Files:**
- Create: `src/lib/interpret/types.ts`
- Create: `src/lib/interpret/templates.ts`
- Create: `src/lib/interpret/templates.test.ts`

**Interfaces:**
- Produces: `assembleProfile(ctx: ProfileContext, nickname: string): InterpretationSection[]` — 결정론적 문장 조립. 어떤 조합이 와도 누락·빈 문구 없이 5개 섹션을 반환. **항상 동작(0원).**

- [ ] **Step 1: 조립 엔진 (콘텐츠 모듈에서 조각을 뽑아 섹션 구성)**

```ts
// src/lib/interpret/templates.ts
import type { ProfileContext } from "@/lib/engine";
import type { InterpretationSection } from "@/lib/db/types";
import { DAY_MASTER_TEXT } from "./content/day-master";
import { ELEMENT_BALANCE_TEXT } from "./content/elements";
import { MBTI_AXIS_TEXT } from "./content/mbti";
import { BLOOD_TEXT } from "./content/blood";
import { ZODIAC_TEXT } from "./content/zodiac";

/** 프로필 5섹션: 인사 → 타고난 기질 → 마음의 균형 → 겉과 속 → 맺음 */
export function assembleProfile(ctx: ProfileContext, nickname: string): InterpretationSection[] {
  const dm = DAY_MASTER_TEXT[ctx.dayMaster.stem];       // 일간 기질
  const balance = ELEMENT_BALANCE_TEXT(ctx.elements);    // 오행 균형
  const mbti = MBTI_AXIS_TEXT(ctx.mbti);                 // 성향
  const blood = BLOOD_TEXT[ctx.blood.type];
  const zodiac = ZODIAC_TEXT[ctx.zodiac];

  return [
    { title: "당신을 만나서", body: `${nickname}님, ${zodiac.intro}` },
    { title: "타고난 결", body: dm.body },
    { title: "마음의 균형", body: balance },
    { title: "겉과 속", body: `${mbti} ${blood.body}` },
    { title: "그리고, 앞으로", body: `${nickname}님의 이야기는 이제 시작이에요. 오늘도 당신다운 하루가 되길 바라요.` },
  ];
}
```

- [ ] **Step 2: 테스트 — 모든 조합에서 5섹션·비지 않음·닉네임 삽입**

```ts
// src/lib/interpret/templates.test.ts
import { describe, expect, it } from "vitest";
import { computeProfile } from "@/lib/engine";
import { assembleProfile } from "./templates";
import { CASES } from "@/lib/engine/fixtures/manseryeok-cases";

describe("assembleProfile", () => {
  it.each(CASES.map((c) => c.input))("모든 코퍼스 입력에서 5섹션·비지않음", (input) => {
    const ctx = computeProfile(input);
    const sections = assembleProfile(ctx, "다인");
    expect(sections).toHaveLength(5);
    for (const s of sections) {
      expect(s.title.length).toBeGreaterThan(0);
      expect(s.body.trim().length).toBeGreaterThan(0);
    }
    expect(sections[0].body).toContain("다인");
  });
});
```

Run: `npm test -- templates`

- [ ] **Step 3: Commit** — `git commit -am "feat(interpret): deterministic profile template engine (P2-4)"`

---

### Task 5: 템플릿 콘텐츠 1차 작성

**Files:**
- Create: `src/lib/interpret/content/day-master.ts` (일간 10)
- Create: `src/lib/interpret/content/elements.ts` (오행 균형 로직+문구)
- Create: `src/lib/interpret/content/mbti.ts` (4축 조합 문구)
- Create: `src/lib/interpret/content/blood.ts` (혈액형 4)
- Create: `src/lib/interpret/content/zodiac.ts` (별자리 12)
- Create: `src/lib/interpret/content/content.test.ts` (톤·완전성)

**Interfaces:**
- Produces: 유형별 문구 데이터. **전부 §5.4 문체**(공감형·비단정·비명령). 누락 없이 전 조합 커버.

- [ ] **Step 1: 콘텐츠 데이터 작성 (예시 구조, 문체 규칙 준수)**

```ts
// src/lib/interpret/content/day-master.ts — 일간 10종(갑~계) 기질 문구
export const DAY_MASTER_TEXT: Record<string, { body: string }> = {
  갑: { body: "곧게 자라는 나무처럼, 당신 안에는 흔들려도 다시 위를 향하는 힘이 있어요." },
  을: { body: "바람에 맞춰 유연하게 휘는 풀처럼, 부드럽게 자기 길을 내는 사람이에요." },
  // 병·정·무·기·경·신·임·계 … 10종 전부
};
```

```ts
// src/lib/interpret/content/elements.ts — 오행 분포로 균형 문구 생성
import type { ProfileContext } from "@/lib/engine";
export function ELEMENT_BALANCE_TEXT(el: ProfileContext["elements"]): string {
  const strong = `${el.dominant}의 기운이 당신을 이끌어요`;
  const soft = el.lacking.length
    ? `가끔 ${el.lacking.join("·")}의 결이 그리울 땐, 그 부분을 천천히 채워가도 좋아요`
    : `다섯 기운이 고르게 어우러져 있어, 어느 자리에서도 당신다움을 지켜가요`;
  return `${strong}. ${soft}.`;
}
```

`mbti.ts`(4축 → 성향 한 줄), `blood.ts`(4종), `zodiac.ts`(12종 `intro`)도 동일 톤으로 작성.

- [ ] **Step 2: 완전성·톤 테스트 — 모든 키가 존재하고 톤 통과**

```ts
// src/lib/interpret/content/content.test.ts
import { describe, expect, it } from "vitest";
import { DAY_MASTER_TEXT } from "./day-master";
import { ZODIAC_TEXT } from "./zodiac";
import { BLOOD_TEXT } from "./blood";
import { checkTone } from "../tone-guard";

describe("콘텐츠 완전성", () => {
  it("일간 10종 전부 존재", () => {
    for (const s of ["갑","을","병","정","무","기","경","신","임","계"])
      expect(DAY_MASTER_TEXT[s]?.body?.length).toBeGreaterThan(0);
  });
  it("별자리 12종 전부 존재", () => {
    for (const z of ["양자리","황소자리","쌍둥이자리","게자리","사자자리","처녀자리",
      "천칭자리","전갈자리","사수자리","염소자리","물병자리","물고기자리"])
      expect(ZODIAC_TEXT[z]?.intro?.length).toBeGreaterThan(0);
  });
  it("모든 콘텐츠가 톤 규칙을 통과", () => {
    const all = [
      ...Object.values(DAY_MASTER_TEXT).map((x) => x.body),
      ...Object.values(ZODIAC_TEXT).map((x) => x.intro),
      ...Object.values(BLOOD_TEXT).map((x) => x.body),
    ];
    for (const t of all) expect(checkTone(t)).toHaveLength(0);
  });
});
```

Run: `npm test -- content`

- [ ] **Step 3: Commit** — `git commit -am "content(interpret): first-pass profile templates, tone-compliant (P2-5)"`

---

### Task 6: "온전한 나" 프로필 화면 + 공개 연출

**Files:**
- Modify: `src/app/(tabs)/me/page.tsx` (전체 교체)
- Create: `src/components/profile/ProfileReveal.tsx` (client: 공개 연출)
- Create: `src/components/profile/PillarsCard.tsx`, `ElementBalance.tsx`

**Interfaces:**
- Consumes: `profiles`·`interpretations` 행
- Produces: 프로필 없으면 `/onboarding` 유도, 있으면 사주 4주·오행 균형·해석 섹션 렌더. `?reveal=1`이면 "잇는 중…" 연출 후 부드럽게 공개.

- [ ] **Step 1: /me 서버 컴포넌트 재작성**

```tsx
// src/app/(tabs)/me/page.tsx
import Link from "next/link";
import { createServerSupabase } from "@/lib/supabase/server";
import ProfileReveal from "@/components/profile/ProfileReveal";
import type { ProfileRow, InterpretationRow } from "@/lib/db/types";

export default async function MePage({
  searchParams,
}: { searchParams: Promise<{ reveal?: string }> }) {
  const { reveal } = await searchParams;
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return (
      <main className="p-6">
        <h1 className="font-[family-name:var(--font-serif-kr)] text-2xl text-primary-green">온전한 나</h1>
        <p className="mt-4 text-text-soft">아직 우리, 인사를 못 나눴네요.</p>
        <Link href="/login" className="mt-6 block w-full rounded-card bg-accent-coral py-3.5 text-center font-medium text-white">시작해볼까요?</Link>
      </main>
    );
  }

  const { data: profile } = await supabase
    .from("profiles").select("*").eq("user_id", user.id).maybeSingle<ProfileRow>();
  if (!profile) {
    return (
      <main className="p-6">
        <h1 className="font-[family-name:var(--font-serif-kr)] text-2xl text-primary-green">온전한 나</h1>
        <p className="mt-4 text-text-soft">당신의 조각들을 이어드릴 준비가 됐어요.</p>
        <Link href="/onboarding" className="mt-6 block w-full rounded-card bg-accent-coral py-3.5 text-center font-medium text-white">나를 알아가기 시작하기</Link>
      </main>
    );
  }

  const { data: interp } = await supabase
    .from("interpretations").select("*")
    .eq("user_id", user.id).eq("kind", "profile").maybeSingle<InterpretationRow>();

  return (
    <ProfileReveal
      profile={profile}
      sections={interp?.body ?? []}
      reveal={reveal === "1"}
    />
  );
}
```

- [ ] **Step 2: ProfileReveal 클라이언트 — 공개 연출 + 렌더**

`reveal`이면 §5.5 로딩 카피("당신의 조각들을 잇는 중이에요…")를 잠깐 보인 뒤 섹션을 순차 페이드인. 사주 4주는 `PillarsCard`(명조 간지), 오행은 `ElementBalance`(막대), 이어서 해석 섹션 카드. 하단에 "나의 조각 카드 공유"는 P4에서 채우므로 자리만.

- [ ] **Step 3: 확인** — 온보딩 완주 → `/me?reveal=1` 연출 → 재방문 시 즉시 프로필. 로그아웃 상태·프로필 없음 분기 확인.

- [ ] **Step 4: Commit** — `git commit -am "feat(profile): '온전한 나' profile screen with reveal (P2-6)"`

---

### Task 7: 톤 검증 자동 검사 (금지 표현 필터)

**Files:**
- Create: `src/lib/interpret/tone-guard.ts`
- Create: `src/lib/interpret/tone-guard.test.ts`

**Interfaces:**
- Produces: `checkTone(text): ToneViolation[]`, `assertTone(text)`(위반 시 throw). §5.4 금지 표현을 규칙으로. 템플릿 콘텐츠(Task 5)와 서버 액션(Task 3)이 사용. **P5 LLM 출력 검사에도 재사용.**

- [ ] **Step 1: 규칙 + 구현**

```ts
// src/lib/interpret/tone-guard.ts
export interface ToneViolation { rule: string; match: string; }

// §5.4 문체 규칙 위반 패턴 (지적인 따뜻함)
const RULES: { rule: string; re: RegExp }[] = [
  { rule: "명령형(~하세요)", re: /하세요/ },
  { rule: "단정(~입니다)", re: /입니다|습니다(?!\s*그려|까)/ },
  { rule: "분석용어", re: /분석\s*결과|데이터\s*분석|진단/ },
  { rule: "공포 마케팅", re: /조심하세요|나쁜\s*기운|불행|위험합니다/ },
  { rule: "형식 호칭", re: /회원님|사용자님/ },
];

export function checkTone(text: string): ToneViolation[] {
  const out: ToneViolation[] = [];
  for (const { rule, re } of RULES) {
    const m = re.exec(text);
    if (m) out.push({ rule, match: m[0] });
  }
  return out;
}

export function assertTone(text: string): void {
  const v = checkTone(text);
  if (v.length) throw new Error(`톤 위반: ${v.map((x) => `${x.rule}(${x.match})`).join(", ")}`);
}
```

- [ ] **Step 2: 테스트 — 위반 검출 + 정상 통과**

```ts
// src/lib/interpret/tone-guard.test.ts
import { describe, expect, it } from "vitest";
import { checkTone, assertTone } from "./tone-guard";

describe("tone-guard", () => {
  it("금지 표현을 검출한다", () => {
    expect(checkTone("지금 바로 명상을 하세요").some((v) => v.rule.includes("명령형"))).toBe(true);
    expect(checkTone("회원님의 분석 결과입니다").length).toBeGreaterThan(0);
    expect(checkTone("나쁜 기운이 있으니 조심하세요").length).toBeGreaterThan(0);
  });
  it("따뜻한 문체는 통과한다", () => {
    expect(checkTone("오늘은 마음을 천천히 다뤄주면 어떨까요?")).toHaveLength(0);
    expect(() => assertTone("당신다운 하루가 되길 바라요")).not.toThrow();
  });
});
```

Run: `npm test -- tone-guard`

- [ ] **Step 3: Commit** — `git commit -am "feat(interpret): tone-guard forbidden-expression filter (P2-7)"`

> ⚠️ 규칙 정규식은 1차안이다. 한국어 종결어미가 다양하므로, Task 5 콘텐츠를 작성하며 **오탐(정상 문구를 위반 처리)** 이 나오면 규칙을 정교화하고 테스트로 고정한다. 콘텐츠와 가드는 함께 수렴시킨다.

---

### Task 8: E2E 테스트 (온보딩 → 프로필 공개)

**Files:**
- Create: `playwright.config.ts`, `e2e/onboarding.spec.ts`
- Modify: `package.json`(scripts), `.github/workflows/ci.yml`(E2E job)

**Interfaces:**
- Produces: `npm run e2e` — 온보딩 4단계 → 프로필 공개 흐름 자동 검증.

- [ ] **Step 1: Playwright 설치·설정**

```powershell
npm install -D @playwright/test ; npx playwright install --with-deps chromium
```

```ts
// playwright.config.ts
import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./e2e",
  webServer: { command: "npm run dev", url: "http://localhost:3000", reuseExistingServer: !process.env.CI },
  use: { baseURL: "http://localhost:3000" },
});
```

- [ ] **Step 2: 🖐️ 인증 우회 전략 확정 (OAuth는 E2E에서 직접 불가)**

택1: ① Supabase 테스트 유저 + `signInWithPassword`용 이메일 계정을 E2E 전용으로 만들고 세션 쿠키 주입, ② 개발 환경 한정 "테스트 로그인" 서버 액션(`NODE_ENV!=='production'`에서만) 추가. **②를 권장**(외부 OAuth 의존 제거). 프로덕션에는 절대 노출 금지.

- [ ] **Step 3: E2E 시나리오**

```ts
// e2e/onboarding.spec.ts
import { test, expect } from "@playwright/test";

test("온보딩 → 프로필 공개", async ({ page }) => {
  await page.goto("/test-login"); // 개발 전용 로그인 (Step 2-②)
  await page.goto("/onboarding");

  await page.getByLabel(/이름|닉네임/).fill("다인");
  await page.getByRole("button", { name: /다음/ }).click();
  await page.getByLabel(/생년월일/).fill("1995-08-20");
  await page.getByLabel(/시간/).fill("14:30");
  await page.getByRole("button", { name: /다음/ }).click();
  await page.getByRole("button", { name: "A" }).click();
  await page.getByRole("button", { name: "ENFP" }).click();
  await page.getByRole("button", { name: /시작하기|알아갈/ }).click();

  await expect(page).toHaveURL(/\/me/);
  await expect(page.getByText("다인")).toBeVisible();
  await expect(page.getByText(/타고난 결/)).toBeVisible();
});
```

- [ ] **Step 4: CI에 E2E 잡 추가** — `.github/workflows/ci.yml`에 Playwright 잡(테스트 Supabase 프로젝트 env 사용). 실패 시 트레이스 업로드.

- [ ] **Step 5: Commit** — `git commit -am "test(e2e): onboarding→profile reveal flow (Playwright) (P2-8)"`

---

## P2 완료 기준 (로드맵 §P2)

- [ ] 신규 가입자가 **3분 내** 프로필을 받아본다 (온보딩 4단계 → 공개)
- [ ] **템플릿만으로(LLM 없이)** 디테일한 해석이 나온다 (5섹션, 조합별 문구)
- [ ] 모든 사용자 대면 문구가 **톤 가드 통과**
- [ ] E2E(온보딩→공개) 통과, `npm run verify` 전 구간 통과
- [ ] Vercel 배포 → 실제 기기에서 온보딩 완주 확인 → **🚀 소프트 런칭**

## 착수 전 확정할 것

1. **Supabase 마이그레이션 실행** — Task 1 SQL을 대시보드/CLI로 적용(사용자 작업).
2. **MBTI 모름 UX** — 간이 4문항 미니 판별 vs. 외부 검사 링크. (권장: 링크 + "대략 알아요" 수동선택)
3. **E2E 인증 우회** — 개발 전용 테스트 로그인(권장) vs. 테스트 유저 세션 주입.
4. **프로필 재설정 허용 여부** — v1은 1인 1프로필. 수정 UI는 P2 범위 밖(후속).
