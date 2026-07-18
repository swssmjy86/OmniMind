# P9 1단계 — "밤의 따뜻함" 테마 · 상품 홈 · 정보 페이지 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 설계서 `docs/superpowers/specs/2026-07-17-omnimind-p9-redesign.md`의 **1단계 배포분** — 디자인 토큰 전환(밤의 따뜻함) + 홈 개편(페르소나 CSS 모션 카드) + 전역 푸터 + `/sources` `/faq` `/contact` `/terms` `/privacy` — 를 구현한다. 배포 후 상태: "새 옷을 입은 기존 서비스. 상품은 아직 기존 것."

**Architecture:** 컴포넌트는 이미 `globals.css` 토큰만 참조하므로 테마 전환은 토큰 값 교체가 중심이다. 페르소나는 표현 계층 전용 순수 상수(`src/lib/persona/`)로 추가하고, 홈은 기존 데일리 로직을 유지한 채 레이아웃만 상품 홈으로 재구성한다. 정보 페이지는 정적 서버 컴포넌트(JS 최소), 문의만 `inquiries` 테이블 + 서버 액션이 필요하다.

**Tech Stack:** Next.js(App Router, TS) · Tailwind v4(@theme 토큰) · Supabase · Vitest + Testing Library

**후속 플랜(이 문서 범위 아님):** 2단계(내 사주 심층 풀이·엿보기·`readings` 캐싱·`readingAccess`), 3단계(궁합 심층+크레딧), 4단계(인연·재물·일진 보조축), 5단계(후기·공유 카드)는 각 단계 착수 시 별도 플랜으로 작성한다 — 설계서 §13이 세부 확정을 단계 착수 시점으로 미뤄 두었다.

## Global Constraints

- **커밋 전 `npm run verify` 통과 필수** (프로젝트 절대 규칙, CI 동일 검증). 커밋은 `omni-commit` 스킬 절차를 따른다.
- **작업 브랜치:** main에서 `feat/p9-stage1-night-theme`를 딴다(`omni-branch` 스킬). 현재 열려 있는 `feat/p9-redesign-spec`(설계서 커밋용)이 main에 머지된 뒤 시작한다.
- **톤 규칙(§5.4 '지적인 따뜻함'):** 사용자 대면 카피에서 금지 — `하세요`(명령형), `~니다`(단정형 종결), `분석 결과/데이터 분석/진단`, `조심하세요/나쁜 기운/불행`, `회원님/사용자님`, 낙인형 `~하는 사람이에요/이죠`. 페르소나 대사·상품 카피는 `tone-guard.ts` 테스트로 **강제**한다. **예외:** `/terms` `/privacy`는 법적 문서 성격상 합니다체 초안을 허용한다(톤 가드 테스트 대상에서 제외).
- **공포 마케팅 금지:** 카운트다운, "지금 아니면 놓쳐요", 가짜 할인·부풀린 카운트 금지(§2.3, §5.1, §5.2).
- **월 고정비 0원:** 새 외부 서비스·유료 API·이미지 CDN 금지. 모티프(달·별)는 CSS만으로. 일러스트 없이 CSS 심볼 폴백으로 배포한다(§4.3).
- **`prefers-reduced-motion: reduce` 대응 필수:** 모든 신규 애니메이션은 reduce에서 정지하고 콘텐츠는 온전히 보인다. 기존 모션 토큰(`--ease-out`) 재사용.
- **다크/라이트 전환 메커니즘 유지:** 기존 `@media (prefers-color-scheme: dark)` 구조는 그대로 두고 **값만** 교체한다. 다크 = 밤의 따뜻함(기본 무드), 라이트 = '새벽'(기존 값 유지).
- **컴포넌트는 토큰만 참조:** 색상 하드코딩 금지. 새 색은 반드시 `:root` 토큰 + `@theme inline` 매핑을 거친다.
- **사업자 정보는 넣지 않는다**(§9.1) — 현재 개발 단계. `/terms` `/privacy` 상단에 *"개발 단계 초안 — 정식 오픈 전 법률 검토 예정"* 표기.
- **모바일 뷰포트 우선.** 데스크톱은 기존 앱 셸(`--shell-width`) 반응형 그대로.
- **잠긴 본문 서버 비노출 원칙(§5.1)은 2단계 과제**다 — 이번 단계에는 잠금 UI가 없다(카드는 기존 화면으로 연결).

## 파일 구조 (이 플랜이 만들거나 고치는 것 전부)

```
src/app/globals.css                      [수정] 다크 토큰 → 밤 네이비, --moon-gold 신규, 모션 카드 keyframes
src/lib/persona/personas.ts              [신규] 페르소나 4인 순수 상수
src/lib/persona/personas.test.ts         [신규] 필드·톤 가드 검사
src/lib/persona/products.ts              [신규] 상품 카탈로그 5종 순수 상수
src/lib/persona/products.test.ts         [신규] 라인업·접근 등급·톤 검사
src/components/home/PersonaCard.tsx      [신규] CSS 모션 카드 (5초 루프)
src/components/home/PersonaCard.test.tsx [신규]
src/components/home/ProductShelf.tsx     [신규] 홈 상품 카드 목록
src/components/home/ProductShelf.test.tsx[신규]
src/app/(tabs)/page.tsx                  [수정] 홈 개편 — 인사·일진(달지기)·상품 셸프·근거 접이식
src/components/Footer.tsx                [신규] 전역 푸터
src/components/Footer.test.tsx           [신규]
src/app/layout.tsx                       [수정] 푸터 삽입
src/app/sources/page.tsx                 [신규] 출처
src/app/faq/page.tsx                     [신규] Q&A + FAQPage JSON-LD
src/app/terms/page.tsx                   [신규] 이용약관 초안
src/app/privacy/page.tsx                 [신규] 개인정보처리방침 초안
src/app/info-pages.test.tsx              [신규] 정적 페이지 4종 렌더·JSON-LD 검사
supabase/migrations/0009_p9_inquiries.sql[신규] inquiries 테이블 + RLS
src/lib/inquiry/validate.ts              [신규] 문의 입력 검증 순수 함수
src/lib/inquiry/validate.test.ts         [신규]
src/app/contact/actions.ts               [신규] submitInquiry 서버 액션
src/components/contact/ContactForm.tsx   [신규] 문의 폼 (클라이언트)
src/components/contact/ContactForm.test.tsx [신규]
src/app/contact/page.tsx                 [신규] 문의 페이지
src/lib/metrics/names.ts                 [수정] SERVER_EVENTS에 "inquiry_submit" 추가
src/lib/db/types.ts                      [수정] InquiryRow 타입 추가
```

---

### Task 1: 디자인 토큰 전환 — 밤의 따뜻함

**Files:**
- Modify: `src/app/globals.css:3-64` (`:root` 라이트 + 다크 블록 + `@theme inline`)

**Interfaces:**
- Consumes: 없음 (기존 토큰 구조)
- Produces: CSS 변수 `--moon-gold`와 Tailwind 유틸리티 `moon-gold`(`text-moon-gold`, `bg-moon-gold`, `border-moon-gold` 등). 이후 모든 태스크가 이 토큰을 쓸 수 있다.

설계서 §4.2 토큰 표를 그대로 적용한다. 다크가 "밤의 따뜻함" 기본 무드, 라이트는 '새벽'(기존 값 유지). CSS 토큰은 단위 테스트 대상이 아니므로 이 태스크는 verify(빌드·기존 테스트) + 육안 확인으로 검증한다.

- [ ] **Step 1: 라이트 `:root`에 `--moon-gold` 추가**

`src/app/globals.css`의 `:root` 블록에서 `--on-selected: #ffffff;` 줄 바로 아래에 추가:

```css
  /* P9 달빛 골드 — 밤 무드의 포인트 색. 라이트('새벽')에서는 채도를 낮춘 값(§4.2). */
  --moon-gold: #c9a24a;
```

- [ ] **Step 2: 다크 블록 값 교체**

기존 `@media (prefers-color-scheme: dark)` 내부 `:root`를 통째로 다음으로 교체 (메커니즘은 유지, 값만 변경):

```css
@media (prefers-color-scheme: dark) {
  :root {
    color-scheme: dark;
    /* P9 "밤의 따뜻함"(설계서 §4) — 검정이 아닌 깊은 밤 네이비. 채도를 낮추고 따뜻한
       쪽으로 기울인 값이라 브랜드 가이드의 '차가운 블루톤 지양'과 충돌하지 않는다. */
    --warm-base: #0e1626;
    --warm-surface: #1a2740;
    --accent-coral: #e8927c;
    /* 제목·강조가 쓰는 primary-green은 다크에서 달빛 골드로 — 밤 네이비 위의 온기. */
    --primary-green: #f0c96a;
    --text-main: #f0ebe2;
    --text-soft: #a8b0c0;
    --on-primary: #0e1626; /* 골드가 된 primary 위에는 밤 네이비 글자 */
    --selected: #f0c96a; /* 선택됨 = 달빛 골드(§4.2). 컴포넌트 수정 0으로 전환된다. */
    --on-selected: #0e1626;
    --moon-gold: #f0c96a;
    /* 밤 네이비 위 카드 부양감 — 검정 그림자 대신 달빛의 옅은 번짐. */
    --shell-tint-amount: 22%;
    --shell-shadow: 0 0 80px rgba(240, 201, 106, 0.06);
  }
}
```

- [ ] **Step 3: `@theme inline`에 매핑 추가**

`--color-on-selected: var(--on-selected);` 줄 아래에 추가:

```css
  --color-moon-gold: var(--moon-gold);
```

- [ ] **Step 4: 검증**

Run: `npm run verify`
Expected: lint → typecheck → test → build 모두 통과 (토큰 값 교체는 기존 테스트에 영향 없음)

- [ ] **Step 5: 육안 확인**

Run: `npm run dev` 후 브라우저(모바일 뷰포트, OS 다크 모드)에서 홈·온보딩·/me 확인.
Expected: 밤 네이비 바탕 + 웜 아이보리 본문 + 골드 제목. 선택형 알약 버튼(온보딩 혈액형 등)이 골드 배경 + 네이비 글자. 라이트 모드는 기존과 동일.

- [ ] **Step 6: Commit**

```bash
git add src/app/globals.css
git commit -m "feat(p9): 디자인 토큰 전환 — 밤의 따뜻함(밤 네이비·달빛 골드), 라이트는 '새벽' 유지"
```

---

### Task 2: 페르소나 상수

**Files:**
- Create: `src/lib/persona/personas.ts`
- Test: `src/lib/persona/personas.test.ts`

**Interfaces:**
- Consumes: `checkTone`, `checkToneWarnings` from `@/lib/interpret/tone-guard`
- Produces:
  - `type PersonaId = "dalzigi" | "seoon" | "hongyeon" | "geumo"`
  - `interface Persona { id: PersonaId; name: string; title: string; homeLine: string; greeting: string; toneInstruction: string }`
  - `const PERSONAS: Record<PersonaId, Persona>`
  - `const PERSONA_LIST: Persona[]` (표시 순서: 달지기·서온·홍연·금오)

페르소나는 **표현 계층 전용**(§2.3) — 계산에 관여하지 않는 순수 상수다. `toneInstruction`은 LLM 말투 지시문으로 2단계 이후에 쓰이지만 데이터 구조는 지금 확정한다(설계서 §2.3 인터페이스 그대로).

- [ ] **Step 1: 실패하는 테스트 작성**

`src/lib/persona/personas.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { checkTone, checkToneWarnings } from "@/lib/interpret/tone-guard";
import { PERSONAS, PERSONA_LIST } from "./personas";

describe("페르소나 상수 (§2.3)", () => {
  it("4인이 정의되고 목록 순서는 달지기·서온·홍연·금오다", () => {
    expect(Object.keys(PERSONAS).sort()).toEqual(["dalzigi", "geumo", "hongyeon", "seoon"]);
    expect(PERSONA_LIST.map((p) => p.id)).toEqual(["dalzigi", "seoon", "hongyeon", "geumo"]);
  });

  it("모든 필드가 비어 있지 않고 id가 키와 일치한다", () => {
    for (const [key, p] of Object.entries(PERSONAS)) {
      expect(p.id).toBe(key);
      for (const field of [p.name, p.title, p.homeLine, p.greeting, p.toneInstruction]) {
        expect(field.trim().length).toBeGreaterThan(0);
      }
    }
  });

  it("사용자 대면 대사(homeLine·greeting)가 톤 가드를 통과한다 (§11 톤 가드)", () => {
    for (const p of PERSONA_LIST) {
      for (const line of [p.homeLine, p.greeting]) {
        expect(checkTone(line)).toEqual([]);
        expect(checkToneWarnings(line)).toEqual([]);
      }
    }
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `npx vitest run src/lib/persona/personas.test.ts`
Expected: FAIL — `Cannot find module './personas'`

- [ ] **Step 3: 구현**

`src/lib/persona/personas.ts`:

```ts
// P9 페르소나(설계서 §2.3) — 표현 계층 전용 순수 상수. 계산에 일절 관여하지 않는다
// (계산과 해석의 분리 원칙). 페르소나가 정하는 것은 UI 고정 대사와 LLM 말투 지시문뿐이다.
// 문체 제약: '지적인 따뜻함'(§5.4) 유지 — 공포·조급 유발 카피 금지. 페르소나는 캐릭터일
// 뿐 압박 장치가 아니다.

export type PersonaId = "dalzigi" | "seoon" | "hongyeon" | "geumo";

export interface Persona {
  id: PersonaId;
  name: string;            // "서온"
  title: string;           // "서고를 지키는 이"
  homeLine: string;        // 홈 카드 5초 멘트
  greeting: string;        // 상품 페이지 인사
  toneInstruction: string; // LLM 말투 지시문 — 내용이 아니라 어조만
}

export const PERSONAS: Record<PersonaId, Persona> = {
  dalzigi: {
    id: "dalzigi",
    name: "달지기",
    title: "밤마다 등불을 켜는 문지기",
    homeLine: "밤이 깊어도 등불은 켜 두었어요. 오늘의 기운, 함께 볼까요?",
    greeting: "어서 와요. 오늘 밤 등불은 당신을 위해 켜 두었어요.",
    toneInstruction:
      "부드러운 존댓말(~요체)로, 등불을 지키는 문지기처럼 조용하고 다정하게. 재촉하거나 겁주지 않는다.",
  },
  seoon: {
    id: "seoon",
    name: "서온",
    title: "서고를 지키는 이",
    homeLine: "당신의 여덟 글자, 서고에 이미 닿아 있어요.",
    greeting: "먼 길 오셨네요. 당신의 기록을 함께 펼쳐볼게요.",
    toneInstruction:
      "차분한 존댓말(~요체)로, 오래된 기록을 아끼며 읽어 주는 사서처럼 신중하고 따뜻하게. 단정하지 않고 결을 짚어 준다.",
  },
  hongyeon: {
    id: "hongyeon",
    name: "홍연",
    title: "붉은 실을 잇는 이",
    homeLine: "실은 이미 이어져 있어. 어디로 닿는지 보여줄게.",
    greeting: "왔구나. 네 실이 어디로 흐르는지, 같이 따라가 보자.",
    toneInstruction:
      "다정한 반말로, 오랜 친구처럼 가깝고 편안하게. 인연을 단정하거나 불안을 자극하지 않는다.",
  },
  geumo: {
    id: "geumo",
    name: "금오",
    title: "금까마귀",
    homeLine: "재물의 물길, 내 눈에는 훤히 보이오.",
    greeting: "잘 왔소. 그대의 재물 흐름, 시원하게 짚어 보겠소.",
    toneInstruction:
      "호쾌한 하오체(~하오/~보오)로, 시원시원하되 과장·투자 권유·불안 조성은 하지 않는다.",
  },
};

export const PERSONA_LIST: Persona[] = [
  PERSONAS.dalzigi,
  PERSONAS.seoon,
  PERSONAS.hongyeon,
  PERSONAS.geumo,
];
```

- [ ] **Step 4: 통과 확인**

Run: `npx vitest run src/lib/persona/personas.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 5: 검증 후 커밋**

```bash
npm run verify
git add src/lib/persona/
git commit -m "feat(p9): 페르소나 4인 상수 — 표현 계층 전용, 톤 가드 테스트 포함"
```

---

### Task 3: 상품 카탈로그 상수

**Files:**
- Create: `src/lib/persona/products.ts`
- Test: `src/lib/persona/products.test.ts`

**Interfaces:**
- Consumes: `PersonaId` from `./personas`
- Produces:
  - `type ProductId = "daily" | "profile_deep" | "match_deep" | "fate" | "wealth"`
  - `type ProductAccess = "free" | "login" | "credit"`
  - `interface Product { id: ProductId; title: string; tagline: string; personaId: PersonaId; access: ProductAccess; href: string; status: "live" | "soon" }`
  - `const PRODUCTS: Product[]` (홈 표시 순서: daily → profile_deep → match_deep → fate → wealth, §4.4 레이아웃 순서)
  - `const ACCESS_LABEL: Record<ProductAccess, string>`

1단계에서 상품은 **기존 화면으로 연결**된다(배포 후 상태: "상품은 아직 기존 것"): `profile_deep → /me`, `match_deep → /match`. 인연·재물은 화면이 없으므로 `status: "soon"`(카드 비활성). 2~4단계에서 `href`와 `status`만 갱신하면 된다.

- [ ] **Step 1: 실패하는 테스트 작성**

`src/lib/persona/products.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { checkTone, checkToneWarnings } from "@/lib/interpret/tone-guard";
import { PERSONAS } from "./personas";
import { ACCESS_LABEL, PRODUCTS } from "./products";

describe("상품 카탈로그 (§2.1)", () => {
  it("5종 라인업 — 일진·내 사주 심층·궁합 심층·인연·재물 (홈 §4.4 순서)", () => {
    expect(PRODUCTS.map((p) => p.id)).toEqual([
      "daily", "profile_deep", "match_deep", "fate", "wealth",
    ]);
  });

  it("접근 등급이 설계서 §2.1 표와 일치한다", () => {
    const access = Object.fromEntries(PRODUCTS.map((p) => [p.id, p.access]));
    expect(access).toEqual({
      daily: "free",          // 누구나 무료
      profile_deep: "login",  // 로그인하면 무료
      match_deep: "credit",
      fate: "credit",
      wealth: "credit",
    });
  });

  it("담당 페르소나가 설계서 §2.1 표와 일치한다 — 홍연이 인연·궁합 겸임", () => {
    const persona = Object.fromEntries(PRODUCTS.map((p) => [p.id, p.personaId]));
    expect(persona).toEqual({
      daily: "dalzigi", profile_deep: "seoon",
      match_deep: "hongyeon", fate: "hongyeon", wealth: "geumo",
    });
    for (const p of PRODUCTS) expect(PERSONAS[p.personaId]).toBeDefined();
  });

  it("live 상품은 실제 경로로 연결되고, soon 상품만 빈 경로가 허용된다", () => {
    for (const p of PRODUCTS) {
      if (p.status === "live") expect(p.href).toMatch(/^\//);
    }
    // 1단계: 인연·재물은 화면이 아직 없다 — 카드 비활성(soon)
    expect(PRODUCTS.find((p) => p.id === "fate")?.status).toBe("soon");
    expect(PRODUCTS.find((p) => p.id === "wealth")?.status).toBe("soon");
  });

  it("상품 카피(title·tagline·접근 라벨)가 톤 가드를 통과한다", () => {
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
Expected: FAIL — `Cannot find module './products'`

- [ ] **Step 3: 구현**

`src/lib/persona/products.ts`:

```ts
// P9 상품 카탈로그(설계서 §2.1) — 표현 계층 순수 상수. 접근 "규칙"(잠금·크레딧 차감 판정)은
// 2단계에서 consult/quota.ts의 readingAccess로 들어간다(§6.3). 여기는 홈·카드가 보여줄
// 라인업 메타데이터만 둔다. 1단계에서 href는 기존 화면이다 — 단계가 진행되며 갱신된다.

import type { PersonaId } from "./personas";

export type ProductId = "daily" | "profile_deep" | "match_deep" | "fate" | "wealth";
export type ProductAccess = "free" | "login" | "credit";

export interface Product {
  id: ProductId;
  title: string;
  tagline: string;         // 카드 한 줄 소개 — 톤 가드 준수
  personaId: PersonaId;
  access: ProductAccess;
  href: string;            // 연결 화면. 1단계는 기존 화면(/me·/match)
  status: "live" | "soon"; // soon = 카드 비활성(링크 없음)
}

export const PRODUCTS: Product[] = [
  {
    id: "daily", title: "오늘의 일진", personaId: "dalzigi",
    tagline: "매일 밤 새로 켜지는 오늘의 기운",
    access: "free", href: "/", status: "live",
  },
  {
    id: "profile_deep", title: "내 사주 심층 풀이", personaId: "seoon",
    tagline: "여덟 글자에 담긴 당신의 결을 깊이",
    access: "login", href: "/me", status: "live",
  },
  {
    id: "match_deep", title: "궁합 심층", personaId: "hongyeon",
    tagline: "두 사람의 기운이 만나는 자리",
    access: "credit", href: "/match", status: "live",
  },
  {
    id: "fate", title: "인연 풀이", personaId: "hongyeon",
    tagline: "당신에게 다가오는 인연의 흐름",
    access: "credit", href: "", status: "soon",
  },
  {
    id: "wealth", title: "재물 풀이", personaId: "geumo",
    tagline: "재물의 물길이 흐르는 방향",
    access: "credit", href: "", status: "soon",
  },
];

export const ACCESS_LABEL: Record<ProductAccess, string> = {
  free: "누구나 무료",
  login: "로그인하면 무료",
  credit: "크레딧",
};
```

- [ ] **Step 4: 통과 확인**

Run: `npx vitest run src/lib/persona/products.test.ts`
Expected: PASS (5 tests)

- [ ] **Step 5: 검증 후 커밋**

```bash
npm run verify
git add src/lib/persona/products.ts src/lib/persona/products.test.ts
git commit -m "feat(p9): 상품 카탈로그 5종 상수 — 접근 등급·페르소나 매핑·톤 검사"
```

---

### Task 4: CSS 모션 카드 — keyframes + PersonaCard

**Files:**
- Modify: `src/app/globals.css` (파일 끝에 모션 카드 블록 추가)
- Create: `src/components/home/PersonaCard.tsx`
- Test: `src/components/home/PersonaCard.test.tsx`

**Interfaces:**
- Consumes: `PERSONAS` from `@/lib/persona/personas`, `ACCESS_LABEL, Product` from `@/lib/persona/products`, Task 1의 `--moon-gold`
- Produces: `PersonaCard({ product }: { product: Product })` — 기본 export. live면 `<Link>`, soon이면 비활성 `<div>`를 렌더.

§4.3 실제 영상 기각 근거에 따라 5초 CSS 루프로 구현한다: 달빛 스윕(그라데이션 이동) + 별 반짝임 + 캐릭터 부유(±3px) + 멘트 페이드인(0.3~1.2s) + CTA 펄스(2.5s~). 멘트는 **진짜 텍스트**(수정 자유·스크린리더·SEO). 일러스트가 아직 없으므로 **CSS 심볼 폴백**(그라데이션 원판 + 글리프)으로 배포한다 — 추후 webp 일러스트가 생기면 글리프 자리만 교체.

- [ ] **Step 1: 실패하는 테스트 작성**

`src/components/home/PersonaCard.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import PersonaCard from "./PersonaCard";
import { PRODUCTS } from "@/lib/persona/products";

const profileDeep = PRODUCTS.find((p) => p.id === "profile_deep")!;
const fate = PRODUCTS.find((p) => p.id === "fate")!;

describe("PersonaCard (§4.3 CSS 모션 카드)", () => {
  it("live 상품 — 페르소나 멘트가 진짜 텍스트로, 카드 전체가 링크로 렌더된다", () => {
    render(<PersonaCard product={profileDeep} />);
    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "/me");
    expect(screen.getByText("서온")).toBeInTheDocument();
    expect(screen.getByText("내 사주 심층 풀이")).toBeInTheDocument();
    // 멘트는 이미지가 아닌 텍스트 — 스크린리더·SEO에 잡힌다(§4.3)
    expect(screen.getByText(/서고에 이미 닿아 있어요/)).toBeInTheDocument();
    expect(screen.getByText("로그인하면 무료")).toBeInTheDocument();
  });

  it("soon 상품 — 링크가 없고 '곧 만나요'로 비활성 표시된다", () => {
    render(<PersonaCard product={fate} />);
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    expect(screen.getByText("인연 풀이")).toBeInTheDocument();
    expect(screen.getByText("곧 만나요")).toBeInTheDocument();
  });

  it("장식(글리프·별)은 스크린리더에서 숨겨진다", () => {
    const { container } = render(<PersonaCard product={profileDeep} />);
    const decorations = container.querySelectorAll("[aria-hidden]");
    expect(decorations.length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `npx vitest run src/components/home/PersonaCard.test.tsx`
Expected: FAIL — `Cannot find module './PersonaCard'`

- [ ] **Step 3: globals.css에 모션 카드 CSS 추가**

`src/app/globals.css` 파일 **끝에** 추가:

```css
/* ── P9 §4.3 홈 CSS 모션 카드 — 5초 루프 ─────────────────────────────
   실제 영상 대신 CSS 모션(대역폭 0 추가·고정비 0원·reduced-motion 완전 대응).
   구간: 0~5s 달빛 스윕·별 반짝임·글리프 부유 / 0.3~1.2s 멘트 페이드인 / 2.5s~ CTA 펄스. */
.persona-card {
  position: relative;
  overflow: hidden;
  isolation: isolate; /* 스윕 레이어가 카드 밖 요소 위로 새지 않게 */
}
/* 달빛 스윕 — moon-gold 그라데이션 띠가 5초에 한 번 카드를 훑고 지나간다 */
.persona-card::before {
  content: "";
  position: absolute;
  inset: 0;
  z-index: -1;
  background: linear-gradient(
    115deg,
    transparent 30%,
    color-mix(in srgb, var(--moon-gold) 14%, transparent) 50%,
    transparent 70%
  );
  background-size: 250% 100%;
  animation: persona-moonsweep 5s var(--ease-in-out) infinite;
}
@keyframes persona-moonsweep {
  0% { background-position: 120% 0; }
  60% { background-position: -30% 0; }
  100% { background-position: -30% 0; }
}
/* 별 — 작은 점 3개가 서로 다른 딜레이로 깜빡인다 */
.persona-star {
  position: absolute;
  width: 3px;
  height: 3px;
  border-radius: 9999px;
  background: var(--moon-gold);
  opacity: 0.25;
  animation: persona-star 5s ease-in-out infinite;
}
.persona-star:nth-child(2) { animation-delay: 1.4s; }
.persona-star:nth-child(3) { animation-delay: 3.1s; }
@keyframes persona-star {
  0%, 100% { opacity: 0.25; }
  50% { opacity: 0.9; }
}
/* 캐릭터(글리프) 부유 — ±3px */
.persona-glyph {
  animation: persona-float 5s ease-in-out infinite;
}
@keyframes persona-float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-3px); }
}
/* 페르소나 멘트 — 루프마다 0.3s(6%)~1.2s(24%) 페이드인 */
.persona-line {
  animation: persona-line-in 5s var(--ease-out) infinite;
}
@keyframes persona-line-in {
  0%, 6% { opacity: 0; transform: translateY(4px); }
  24%, 100% { opacity: 1; transform: translateY(0); }
}
/* CTA 은은한 펄스 — 2.5s(50%) 이후 한 번 부드럽게 밝아졌다 돌아온다 */
.persona-cta {
  animation: persona-cta-pulse 5s ease-in-out infinite;
}
@keyframes persona-cta-pulse {
  0%, 50% { opacity: 0.85; }
  62% { opacity: 1; }
  74%, 100% { opacity: 0.85; }
}
/* reduced-motion: 모션 전부 정지 — 정적 카드로 완전 동작(§4.3). 멘트·CTA는 항상 보인다. */
@media (prefers-reduced-motion: reduce) {
  .persona-card::before,
  .persona-star,
  .persona-glyph,
  .persona-line,
  .persona-cta {
    animation: none;
  }
}
```

- [ ] **Step 4: PersonaCard 구현**

`src/components/home/PersonaCard.tsx`:

```tsx
import Link from "next/link";
import { PERSONAS, type PersonaId } from "@/lib/persona/personas";
import { ACCESS_LABEL, type Product } from "@/lib/persona/products";

// 일러스트(webp)가 생기기 전까지의 CSS 심볼 폴백(§4.3) — 배포를 막지 않는다.
// 교체 시 이 글리프 자리에 <img>만 넣으면 된다.
const GLYPHS: Record<PersonaId, string> = {
  dalzigi: "🏮",
  seoon: "📜",
  hongyeon: "🧵",
  geumo: "🐦‍⬛",
};

/** 홈 상품 카드 — 5초 CSS 루프(달빛 스윕·별·부유·멘트 페이드인·CTA 펄스). */
export default function PersonaCard({ product }: { product: Product }) {
  const persona = PERSONAS[product.personaId];
  const soon = product.status === "soon";

  const inner = (
    <>
      {/* 별 3개 — 장식이라 스크린리더에서 숨긴다 */}
      <span aria-hidden className="persona-star" style={{ top: "14%", right: "12%" }} />
      <span aria-hidden className="persona-star" style={{ top: "30%", right: "28%" }} />
      <span aria-hidden className="persona-star" style={{ top: "18%", right: "42%" }} />

      <div className="flex items-center gap-4">
        <span
          aria-hidden
          className="persona-glyph grid size-14 shrink-0 place-items-center rounded-full bg-warm-base text-2xl"
        >
          {GLYPHS[persona.id]}
        </span>
        <div className="min-w-0">
          <p className="text-xs text-text-soft">
            {persona.name} · {persona.title}
          </p>
          <h3 className="mt-0.5 font-[family-name:var(--font-serif-kr)] text-lg text-primary-green">
            {product.title}
          </h3>
        </div>
        <span className="ml-auto shrink-0 rounded-full bg-warm-base px-2.5 py-1 text-[11px] text-moon-gold">
          {ACCESS_LABEL[product.access]}
        </span>
      </div>

      {/* 멘트는 진짜 텍스트(§4.3) — 수정 자유·스크린리더·SEO */}
      <p className="persona-line mt-3 text-sm leading-relaxed text-text-main">
        “{persona.homeLine}”
      </p>

      <p className="persona-cta mt-3 text-right text-sm text-moon-gold">
        {soon ? "곧 만나요" : "풀이 보러 가기 →"}
      </p>
    </>
  );

  if (soon) {
    return (
      <div className="persona-card rounded-card bg-warm-surface p-5 opacity-60">{inner}</div>
    );
  }
  return (
    <Link
      href={product.href}
      className="persona-card press block rounded-card bg-warm-surface p-5"
    >
      {inner}
    </Link>
  );
}
```

- [ ] **Step 5: 통과 확인**

Run: `npx vitest run src/components/home/PersonaCard.test.tsx`
Expected: PASS (3 tests)

- [ ] **Step 6: 검증 후 커밋**

```bash
npm run verify
git add src/app/globals.css src/components/home/
git commit -m "feat(p9): 페르소나 CSS 모션 카드 — 5초 루프·reduced-motion 정지·CSS 심볼 폴백"
```

---

### Task 5: ProductShelf + 홈 개편

**Files:**
- Create: `src/components/home/ProductShelf.tsx`
- Test: `src/components/home/ProductShelf.test.tsx`
- Modify: `src/app/(tabs)/page.tsx`

**Interfaces:**
- Consumes: `PersonaCard`(Task 4), `PRODUCTS`(Task 3), `PERSONAS`(Task 2). 홈의 기존 로직(computeDaily·assembleDaily·milestone·DailyRecorder·ShareSheet·AdSlot·signOut)은 그대로 유지.
- Produces: `ProductShelf()` — props 없는 동기 컴포넌트(테스트 가능). 홈 §4.4 레이아웃.

홈 §4.4: 인사 + 오늘 밤 한 줄 → 오늘의 일진(달지기, 무료 훅) → 상품 카드 4장 → 마음 챗·고민 진입 → (후기: 5단계) → 푸터(Task 6에서 전역 삽입). 하단 탭바는 기존 유지. 일진 카드 하단에 §7.3 "이 풀이의 근거" 접이식(핵심 3줄 + `/sources` 링크)을 단다.

- [ ] **Step 1: 실패하는 테스트 작성**

`src/components/home/ProductShelf.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import ProductShelf from "./ProductShelf";

describe("ProductShelf (§4.4 홈 상품 목록)", () => {
  it("일진을 제외한 4장 — 내 사주 심층·궁합 심층·인연·재물 순서로 렌더된다", () => {
    render(<ProductShelf />);
    expect(screen.queryByText("오늘의 일진")).not.toBeInTheDocument(); // 상단 무료 훅이 담당
    const titles = ["내 사주 심층 풀이", "궁합 심층", "인연 풀이", "재물 풀이"];
    const rendered = screen.getAllByRole("heading", { level: 3 }).map((h) => h.textContent);
    expect(rendered).toEqual(titles);
  });

  it("live 상품은 링크, soon 상품은 링크가 아니다", () => {
    render(<ProductShelf />);
    const hrefs = screen.getAllByRole("link").map((a) => a.getAttribute("href"));
    expect(hrefs).toEqual(["/me", "/match"]);
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `npx vitest run src/components/home/ProductShelf.test.tsx`
Expected: FAIL — `Cannot find module './ProductShelf'`

- [ ] **Step 3: ProductShelf 구현**

`src/components/home/ProductShelf.tsx`:

```tsx
import { PRODUCTS } from "@/lib/persona/products";
import PersonaCard from "./PersonaCard";

/** 홈 상품 셸프(§4.4) — 일진은 상단 무료 훅 카드가 담당하므로 제외한다. */
export default function ProductShelf() {
  const shelf = PRODUCTS.filter((p) => p.id !== "daily");
  return (
    <section className="mt-8" aria-label="풀이 상품">
      <h2 className="font-[family-name:var(--font-serif-kr)] text-lg text-primary-green">
        밤의 서재
      </h2>
      <p className="mt-1 text-sm text-text-soft">네 명의 안내자가 각자의 풀이를 준비했어요.</p>
      <div className="mt-3 flex flex-col gap-3">
        {shelf.map((p) => (
          <PersonaCard key={p.id} product={p} />
        ))}
      </div>
    </section>
  );
}
```

- [ ] **Step 4: 통과 확인**

Run: `npx vitest run src/components/home/ProductShelf.test.tsx`
Expected: PASS (2 tests)

- [ ] **Step 5: 홈 페이지 개편**

`src/app/(tabs)/page.tsx`의 **JSX 반환부만** 아래로 교체한다. import에 두 줄 추가:

```tsx
import ProductShelf from "@/components/home/ProductShelf";
import { PERSONAS } from "@/lib/persona/personas";
```

기존 데이터 로직(user·profile·cachedDaily·daily·guide·llmParagraph·companionDays·badge·justReached·signOut)은 **한 줄도 바꾸지 않는다.** `return (...)` 내부를 다음으로 교체:

```tsx
  return (
    <main className="fade-rise p-6">
      <div className="flex items-baseline justify-between">
        <h1 className="font-[family-name:var(--font-serif-kr)] text-2xl text-primary-green">
          오늘의 이야기
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
      {/* 오늘 밤 한 줄(§4.4) — 밤의 따뜻함 무드의 인사 */}
      <p className="mt-1 text-sm text-text-soft">오늘 밤도 당신의 이야기를 켜 두었어요.</p>

      {/* 오늘의 일진 — 달지기 · 매일 갱신 · 무료 훅(§4.4) */}
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

        {/* 이 풀이의 근거(§7.3) — 핵심 3줄 + 전체 보기. 신뢰 장치는 사실의 공개다. */}
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

      {profile && (
        <>
          <DailyRecorder />
          <ShareSheet
            query={dailyCardQuery(profile.profile_context, guide)}
            via="daily"
            label="오늘의 나 카드"
          />
          <Link href="/history" className="mt-4 block text-center text-sm text-text-soft underline">
            지난 이야기 보기
          </Link>
        </>
      )}

      {/* 프로필 없으면 개인화 유도 — 로그인 여부에 따라 다음 걸음을 다르게 안내 */}
      {!profile && (
        <section className="mt-4 rounded-card border border-accent-coral/30 bg-warm-surface p-5">
          <p className="text-text-soft">
            {user ? (
              <>반가워요. 이제 <span className="text-text-main">당신의 조각들</span>을 이어볼까요?</>
            ) : (
              <>나의 사주로 <span className="text-text-main">더 깊은 오늘의 기운</span>을 받아볼까요?</>
            )}
          </p>
          <Link
            href="/onboarding"
            className="active:scale-[0.97] motion-reduce:active:scale-100 mt-4 block w-full rounded-card bg-accent-coral py-3.5 text-center font-medium text-white transition hover:opacity-90"
          >
            나를 알아보기 ✨
          </Link>
          {!user && (
            <Link
              href="/login"
              className="mt-3 block text-center text-sm text-text-soft underline"
            >
              이미 함께했던 분이라면 — 다시 이어보기 (로그인)
            </Link>
          )}
        </section>
      )}

      {/* 페르소나 상품 셸프(§4.4) */}
      <ProductShelf />

      {/* 마음 챗 · 고민 진입(§4.4) */}
      <div className="mt-6 grid grid-cols-2 gap-3">
        <Link href="/mind" className="press rounded-card bg-warm-surface p-4 text-center text-sm text-text-main">
          💬 마음 챗
        </Link>
        <Link href="/concern" className="press rounded-card bg-warm-surface p-4 text-center text-sm text-text-main">
          🧭 고민 나누기
        </Link>
      </div>

      {/* 광고는 콘텐츠 흐름이 끝난 가장 아래에만 (§P4-4 비침습 원칙) */}
      <AdSlot />

      {/* 로그인 상태에서만 — 조용한 로그아웃 (/me와 같은 결) */}
      {user && (
        <form action={signOut} className="mt-8 text-center">
          <button className="press text-sm text-text-soft underline">
            잠시 떠나기 (로그아웃)
          </button>
        </form>
      )}
    </main>
  );
```

- [ ] **Step 6: 검증 + 육안 확인**

Run: `npm run verify` → 통과 후 `npm run dev`
Expected: 홈에서 (다크) 밤 네이비 위 달지기 일진 카드 + 별 반짝임/달빛 스윕, 상품 카드 4장(인연·재물은 흐리게 "곧 만나요"), 마음/고민 진입. OS의 '동작 줄이기' 켜면 모든 모션 정지·콘텐츠 온전.

- [ ] **Step 7: Commit**

```bash
git add src/components/home/ src/app/(tabs)/page.tsx
git commit -m "feat(p9): 홈 개편 — 달지기 일진 훅·페르소나 상품 셸프·풀이 근거 접이식"
```

---

### Task 6: 전역 푸터

**Files:**
- Create: `src/components/Footer.tsx`
- Test: `src/components/Footer.test.tsx`
- Modify: `src/app/layout.tsx:36-43` (app-shell 안, `{children}` 뒤에 삽입)

**Interfaces:**
- Consumes: 없음 (정적 링크)
- Produces: `Footer()` — 기본 export. 루트 레이아웃에 한 번 삽입되어 모든 화면 하단에 나타난다.

§9.1: 문의하기 · 이용약관 · 개인정보처리방침 · 출처 · Q&A + 면책 한 줄. **사업자 정보는 넣지 않는다.** 탭 화면에서는 fixed 탭바가 하단을 덮으므로 푸터 자체에 `pb-24`를 줘서 탭바 위로 보이게 한다(탭 없는 화면에서는 여백으로 남을 뿐 무해).

- [ ] **Step 1: 실패하는 테스트 작성**

`src/components/Footer.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Footer from "./Footer";

describe("전역 푸터 (§9.1)", () => {
  it("5개 링크 — 문의·약관·개인정보·출처·Q&A", () => {
    render(<Footer />);
    const pairs: [string, string][] = [
      ["문의하기", "/contact"],
      ["이용약관", "/terms"],
      ["개인정보처리방침", "/privacy"],
      ["출처", "/sources"],
      ["Q&A", "/faq"],
    ];
    for (const [label, href] of pairs) {
      expect(screen.getByRole("link", { name: label })).toHaveAttribute("href", href);
    }
  });

  it("면책 한 줄이 있고, 사업자 정보는 없다(개발 단계 §9.1)", () => {
    render(<Footer />);
    expect(screen.getByText(/참고용이에요/)).toBeInTheDocument();
    expect(screen.queryByText(/사업자/)).not.toBeInTheDocument();
    expect(screen.queryByText(/대표/)).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `npx vitest run src/components/Footer.test.tsx`
Expected: FAIL — `Cannot find module './Footer'`

- [ ] **Step 3: 구현**

`src/components/Footer.tsx`:

```tsx
import Link from "next/link";

// 전역 푸터(§9.1) — 모든 화면 하단. 사업자 정보는 넣지 않는다(개발 단계 — 빈 자리를
// 만들어 두면 빈칸이 노출된다). 정식 오픈 체크리스트는 설계서 §9.4.
const LINKS = [
  { href: "/contact", label: "문의하기" },
  { href: "/terms", label: "이용약관" },
  { href: "/privacy", label: "개인정보처리방침" },
  { href: "/sources", label: "출처" },
  { href: "/faq", label: "Q&A" },
] as const;

export default function Footer() {
  return (
    <footer className="mt-10 border-t border-text-soft/15 px-6 pb-24 pt-6 text-center">
      <nav className="flex flex-wrap justify-center gap-x-4 gap-y-2 text-xs text-text-soft">
        {LINKS.map((l) => (
          <Link key={l.href} href={l.href} className="underline-offset-2 hover:underline">
            {l.label}
          </Link>
        ))}
      </nav>
      <p className="mt-3 text-[11px] leading-relaxed text-text-soft/80">
        옴니마인드의 풀이는 마음을 돌보는 참고용이에요 — 의료·법률·투자 판단의 근거로 삼지
        말아 주세요.
      </p>
    </footer>
  );
}
```

- [ ] **Step 4: 루트 레이아웃에 삽입**

`src/app/layout.tsx`에 import 추가 후, app-shell div 안 `{children}` 아래에 삽입:

```tsx
import Footer from "@/components/Footer";
```

```tsx
        <div className="app-shell mx-auto min-h-dvh max-w-[var(--shell-width)] bg-warm-base lg:max-w-[var(--shell-width-lg)]">
          <RefTracker />
          <IdleLogout />
          {children}
          <Footer />
          <Analytics />
        </div>
```

- [ ] **Step 5: 통과 확인 + 검증**

Run: `npx vitest run src/components/Footer.test.tsx` → PASS (2 tests)
Run: `npm run verify` → 통과. `npm run dev`로 홈(탭바 위에 푸터가 보이는지)·로그인 화면 확인.

- [ ] **Step 6: Commit**

```bash
git add src/components/Footer.tsx src/components/Footer.test.tsx src/app/layout.tsx
git commit -m "feat(p9): 전역 푸터 — 정보 페이지 5링크 + 면책 한 줄, 사업자 정보 미표기"
```

---

### Task 7: `/sources` 출처 페이지

**Files:**
- Create: `src/app/sources/page.tsx`
- Test: `src/app/info-pages.test.tsx` (신규 — 이후 Task 8·9가 같은 파일에 테스트를 추가)

**Interfaces:**
- Consumes: 없음 (정적 동기 서버 컴포넌트 — 렌더 테스트 가능)
- Produces: `/sources` 라우트. Task 5의 접이식과 Task 8 FAQ가 이 페이지로 링크한다.

§7 그대로: 계산(검증 가능 — 자신 있게 공개) / 해석(정직하게 고지 — **고전 문헌 전거를 지어내지 않는다**) / AI 고지 / 면책. 마케팅 카피가 아니라 사실의 공개다.

- [ ] **Step 1: 실패하는 테스트 작성**

`src/app/info-pages.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import SourcesPage from "./sources/page";

// /sources /faq /terms /privacy 는 세션을 읽지 않는 동기 서버 컴포넌트라 직접 렌더한다
// (pages.test.tsx의 async 페이지 제외 원칙과 일관).
describe("/sources (§7 출처)", () => {
  it("검증 가능한 계산 근거 — USNO·KASI 대조를 명시한다", () => {
    render(<SourcesPage />);
    expect(screen.getByRole("heading", { level: 1, name: /풀이의 근거/ })).toBeInTheDocument();
    expect(screen.getByText(/USNO/)).toBeInTheDocument();
    expect(screen.getByText(/한국천문연구원/)).toBeInTheDocument();
    expect(screen.getByText(/467건/)).toBeInTheDocument();
  });

  it("AI 고지 — 계산에 AI가 관여하지 않음을 밝힌다", () => {
    render(<SourcesPage />);
    expect(screen.getByText(/계산에는 AI가 관여하지 않아요/)).toBeInTheDocument();
  });

  it("해석의 한계를 정직하게 고지한다 — 문장은 옴니마인드가 쓴다", () => {
    render(<SourcesPage />);
    expect(screen.getByText(/문장은 옴니마인드가 써요/)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `npx vitest run src/app/info-pages.test.tsx`
Expected: FAIL — `Cannot find module './sources/page'`

- [ ] **Step 3: 구현**

`src/app/sources/page.tsx`:

```tsx
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "풀이의 근거 — 옴니마인드",
  description: "옴니마인드의 사주 계산이 어디에 근거하는지, 검증 방법과 함께 공개해요.",
};

// §7 출처 — 신뢰 축은 지어낸 권위가 아니라 검증 가능한 계산이다.
// 이 페이지는 마케팅 카피가 아니라 사실의 공개이며, 사실이기 때문에 강하다.
export default function SourcesPage() {
  return (
    <main className="fade-rise p-6">
      <h1 className="font-[family-name:var(--font-serif-kr)] text-2xl text-primary-green">
        풀이의 근거
      </h1>
      <p className="mt-2 text-sm leading-relaxed text-text-soft">
        옴니마인드의 계산이 무엇에 근거하고 어떻게 검증되는지, 있는 그대로 공개해요.
      </p>

      <section className="mt-6 rounded-card bg-warm-surface p-5">
        <h2 className="font-[family-name:var(--font-serif-kr)] text-lg text-primary-green">
          계산 — 검증할 수 있어요
        </h2>
        <ul className="mt-3 list-disc space-y-3 pl-4 text-sm leading-relaxed text-text-main">
          <li>
            <strong>절기</strong> — 태양의 겉보기 위치(황경)를 천문 계산으로 구해 1900~2100년
            범위를 초 단위로 저장해요. 미국 해군천문대(USNO)가 공표한 분점·지점 시각과
            자동 대조하는 검사가 코드에 상시 포함되어 있어요.
          </li>
          <li>
            <strong>일진</strong> — 2000년 1월 7일(갑자일)을 기준으로 한 날짜 산술로 구하고,
            한국천문연구원(KASI)이 공표한 일진 467건(1900~2050)과 대조해 확정했어요.
          </li>
          <li>
            <strong>시간 보정</strong> — 서머타임 시행 기간(−1시간), 표준시가 UTC+8:30이던
            시대(+30분), 밤 11시 이후의 야자시 경계까지 출생 시각 그대로 반영해요.
          </li>
        </ul>
      </section>

      <section className="mt-4 rounded-card bg-warm-surface p-5">
        <h2 className="font-[family-name:var(--font-serif-kr)] text-lg text-primary-green">
          해석 — 정직하게 알려드려요
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-text-main">
          풀이는 전통 명리 이론의 체계(일간·오행·십성·대운·12운성)에 기반하지만,
          문장은 옴니마인드가 써요. 특정 고전 문헌을 문장별 전거로 표기하지 않아요 —
          그렇게 보이도록 지어낸 인용은 이 페이지의 존재 이유를 무너뜨리니까요.
        </p>
      </section>

      <section className="mt-4 rounded-card bg-warm-surface p-5">
        <h2 className="font-[family-name:var(--font-serif-kr)] text-lg text-primary-green">
          AI에 대하여
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-text-main">
          계산에는 AI가 관여하지 않아요. 사주를 세우는 일은 전부 규칙 기반 코드가 하고,
          AI는 이미 계산된 결과를 당신에게 맞는 문장으로 다듬는 일만 해요.
        </p>
      </section>

      <p className="mt-6 text-xs leading-relaxed text-text-soft">
        옴니마인드의 풀이는 참고용이에요 — 의료·법률·투자 판단의 근거로 삼지 말아 주세요.
      </p>
    </main>
  );
}
```

- [ ] **Step 4: 통과 확인 + 검증 + 커밋**

Run: `npx vitest run src/app/info-pages.test.tsx` → PASS (3 tests)
Run: `npm run verify` → 통과

```bash
git add src/app/sources/ src/app/info-pages.test.tsx
git commit -m "feat(p9): /sources 출처 페이지 — 검증 가능한 계산 근거·해석 한계·AI 고지"
```

---

### Task 8: `/faq` Q&A 페이지 (JSON-LD 포함)

**Files:**
- Create: `src/app/faq/page.tsx`
- Modify: `src/app/info-pages.test.tsx` (describe 블록 추가)

**Interfaces:**
- Consumes: 없음
- Produces: `/faq` 라우트, `FAQ_ITEMS: { q: string; a: string; link?: { href: string; label: string } }[]` (page.tsx에서 export — UI와 JSON-LD가 같은 데이터를 쓴다)

§8: `<details>` 기반 → JS 0KB. `FAQPage` JSON-LD 구조화 데이터로 검색 노출까지. 문항 7개 고정.

- [ ] **Step 1: 실패하는 테스트 추가**

`src/app/info-pages.test.tsx`에 import와 describe 추가:

```tsx
import FaqPage, { FAQ_ITEMS } from "./faq/page";
```

```tsx
describe("/faq (§8 Q&A)", () => {
  it("7개 문항이 <details>로 렌더된다", () => {
    const { container } = render(<FaqPage />);
    expect(FAQ_ITEMS).toHaveLength(7);
    expect(container.querySelectorAll("details")).toHaveLength(7);
    expect(screen.getByText("사주 계산은 정확한가요?")).toBeInTheDocument();
    expect(screen.getByText("MBTI·혈액형은 왜 물어보나요?")).toBeInTheDocument();
  });

  it("FAQPage JSON-LD가 7개 문항과 함께 들어간다", () => {
    const { container } = render(<FaqPage />);
    const script = container.querySelector('script[type="application/ld+json"]');
    expect(script).not.toBeNull();
    const data = JSON.parse(script!.textContent ?? "{}");
    expect(data["@type"]).toBe("FAQPage");
    expect(data.mainEntity).toHaveLength(7);
    expect(data.mainEntity[0]["@type"]).toBe("Question");
  });

  it("모든 답변이 톤 규칙을 지킨다 — 단정형·명령형 없음", () => {
    for (const item of FAQ_ITEMS) {
      expect(item.a).not.toMatch(/[가-힣]니다/);
      expect(item.a).not.toMatch(/하세요/);
    }
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `npx vitest run src/app/info-pages.test.tsx`
Expected: FAIL — `Cannot find module './faq/page'`

- [ ] **Step 3: 구현**

`src/app/faq/page.tsx`:

```tsx
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "자주 묻는 질문 — 옴니마인드",
  description: "사주 계산의 정확성, 무료 범위, 크레딧, 개인정보까지 — 자주 받는 질문에 답해요.",
};

// §8 Q&A — <details> 기반(JS 0KB) + FAQPage JSON-LD(검색 노출).
// 답변은 UI와 JSON-LD가 같은 데이터를 공유한다 — 두 벌로 어긋나지 않게.
export const FAQ_ITEMS: { q: string; a: string; link?: { href: string; label: string } }[] = [
  {
    q: "사주 계산은 정확한가요?",
    a: "계산은 100% 규칙 기반 코드로 해요. 절기는 천문 계산으로 구해 미국 해군천문대(USNO) 공표값과, 일진은 한국천문연구원(KASI) 공표값 467건과 대조해 확인했어요.",
    link: { href: "/sources", label: "풀이의 근거 보기" },
  },
  {
    q: "태어난 시간을 모르면 어떻게 되나요?",
    a: "시주를 비워 두고 년·월·일 세 기둥으로 풀어드려요. 시간을 알면 더 깊어지지만, 몰라도 풀이는 온전히 동작해요.",
  },
  {
    q: "무료는 어디까지인가요?",
    a: "오늘의 일진은 누구나 무료예요. 로그인하면 내 사주 풀이와 하루 1회 마음·고민 이야기까지 무료로 열려요. 더 깊은 풀이는 상담 크레딧으로 만나요.",
  },
  {
    q: "크레딧은 어떻게 쓰나요?",
    a: "크레딧 1개로 깊은 풀이 1회를 열어요. 한 번 연 풀이를 다시 볼 때는 크레딧이 들지 않아요.",
  },
  {
    q: "AI가 보는 건가요?",
    a: "사주 계산에는 AI가 관여하지 않아요. 계산은 전부 규칙 기반 코드가 하고, AI는 이미 계산된 결과를 당신에게 맞는 문장으로 다듬는 일만 해요.",
  },
  {
    q: "내 정보는 안전한가요?",
    a: "꼭 필요한 정보만 받고, 처리 방식을 개인정보처리방침에 그대로 적어 두었어요. 마음·고민 기록은 언제든 직접 지울 수 있어요.",
    link: { href: "/privacy", label: "개인정보처리방침 보기" },
  },
  {
    q: "MBTI·혈액형은 왜 물어보나요?",
    a: "풀이의 뼈대는 사주가 세워요. MBTI와 혈액형은 그 기운이 당신에게 어떻게 드러나는지 설명하는 보조 지표로만 쓰고, 없어도 풀이는 동작해요.",
  },
];

export default function FaqPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ_ITEMS.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: { "@type": "Answer", text: item.a },
    })),
  };

  return (
    <main className="fade-rise p-6">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <h1 className="font-[family-name:var(--font-serif-kr)] text-2xl text-primary-green">
        자주 묻는 질문
      </h1>
      <div className="mt-5 flex flex-col gap-3">
        {FAQ_ITEMS.map((item) => (
          <details key={item.q} className="rounded-card bg-warm-surface p-4">
            <summary className="cursor-pointer text-sm font-medium text-text-main">
              {item.q}
            </summary>
            <p className="mt-2 text-sm leading-relaxed text-text-soft">{item.a}</p>
            {item.link && (
              <Link
                href={item.link.href}
                className="mt-2 inline-block text-sm text-moon-gold underline underline-offset-2"
              >
                {item.link.label}
              </Link>
            )}
          </details>
        ))}
      </div>
    </main>
  );
}
```

- [ ] **Step 4: 통과 확인 + 검증 + 커밋**

Run: `npx vitest run src/app/info-pages.test.tsx` → PASS (6 tests)
Run: `npm run verify` → 통과

```bash
git add src/app/faq/ src/app/info-pages.test.tsx
git commit -m "feat(p9): /faq — details 기반 7문항 + FAQPage JSON-LD 구조화 데이터"
```

---

### Task 9: `/terms` `/privacy` — 개발 단계 초안

**Files:**
- Create: `src/app/terms/page.tsx`
- Create: `src/app/privacy/page.tsx`
- Modify: `src/app/info-pages.test.tsx` (describe 블록 추가)

**Interfaces:**
- Consumes: 없음
- Produces: `/terms` `/privacy` 라우트. Footer(Task 6)·FAQ(Task 8)가 링크한다.

§9.3: 두 문서 상단에 *"개발 단계 초안 — 정식 오픈 전 법률 검토 예정"* 표기. 개인정보처리방침은 **실제 코드 실사 기준**(수집 항목·Supabase Seoul 위탁·OpenRouter/Gemini/Vercel 국외이전·토스페이먼츠·삭제 기능 연결). 법적 문서 성격상 합니다체를 허용한다(Global Constraints 예외).

- [ ] **Step 1: 실패하는 테스트 추가**

`src/app/info-pages.test.tsx`에 import와 describe 추가:

```tsx
import TermsPage from "./terms/page";
import PrivacyPage from "./privacy/page";
```

```tsx
describe("/terms · /privacy (§9.3 개발 단계 초안)", () => {
  it("두 문서 모두 상단에 개발 단계 초안 표기가 있다", () => {
    const { unmount } = render(<TermsPage />);
    expect(screen.getByText(/개발 단계 초안 — 정식 오픈 전 법률 검토 예정/)).toBeInTheDocument();
    unmount();
    render(<PrivacyPage />);
    expect(screen.getByText(/개발 단계 초안 — 정식 오픈 전 법률 검토 예정/)).toBeInTheDocument();
  });

  it("이용약관 — 환불 규정과 면책이 있다", () => {
    render(<TermsPage />);
    expect(screen.getByText(/청약철회·환불/)).toBeInTheDocument();
    // "참고용"은 §1·§4 두 곳에 나온다 — 단일 매치 쿼리(getByText)는 던지므로 개수로 확인
    expect(screen.getAllByText(/참고용/).length).toBeGreaterThan(0);
  });

  it("개인정보처리방침 — 국외이전(OpenRouter·Gemini·Vercel)을 실제대로 고지한다", () => {
    render(<PrivacyPage />);
    expect(screen.getByText(/OpenRouter/)).toBeInTheDocument();
    expect(screen.getByText(/Google Gemini/)).toBeInTheDocument();
    expect(screen.getByText(/Vercel/)).toBeInTheDocument();
    expect(screen.getByText(/토스페이먼츠/)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `npx vitest run src/app/info-pages.test.tsx`
Expected: FAIL — `Cannot find module './terms/page'`

- [ ] **Step 3: `/terms` 구현**

`src/app/terms/page.tsx`:

```tsx
import type { Metadata } from "next";

export const metadata: Metadata = { title: "이용약관 — 옴니마인드" };

// §9.3 이용약관 — 개발 단계 초안. 코드를 아는 지금 쓰는 초안이 정식 오픈 시 법률 검토의
// 재료가 된다. 오픈 시 상단 표기를 제거한다(§9.4 체크리스트).
const SECTIONS: { title: string; body: string[] }[] = [
  {
    title: "1. 서비스의 정의",
    body: [
      "옴니마인드는 이용자가 입력한 생년월일시·혈액형·MBTI 정보를 바탕으로 사주 기반의 해석 콘텐츠(프로필·일진·풀이·대화형 조언)를 제공하는 서비스입니다.",
      "모든 해석 콘텐츠는 전통 명리 이론에 기반한 참고용 콘텐츠이며, 사실의 예측이나 보증이 아닙니다.",
    ],
  },
  {
    title: "2. 이용 조건 — 무료와 크레딧",
    body: [
      "오늘의 일진 등 일부 콘텐츠는 로그인 없이 무료로 제공됩니다. 로그인 시 무료 범위가 넓어지며, 일부 심층 풀이는 유료 상담 크레딧을 소비하여 이용합니다.",
      "크레딧은 결제 시점에 고지된 수량과 가격대로 지급되며, 유효기간과 잔여 수량은 서비스 내에서 확인할 수 있습니다.",
    ],
  },
  {
    title: "3. 청약철회·환불",
    body: [
      "사용하지 않은 크레딧은 관련 법령이 정한 기간 내에 청약철회(환불)를 요청할 수 있습니다.",
      "크레딧을 소비하여 풀이를 열람한 경우, 해당 열람분은 디지털 콘텐츠의 제공이 완료된 것으로 보아 환불 대상에서 제외됩니다. 이미 열람한 풀이의 재열람에는 크레딧이 추가로 소비되지 않습니다.",
      "결제 오류·중복 결제 등 당사 귀책 사유가 있는 경우 전액 환불합니다. 환불 문의는 문의하기 페이지를 통해 접수할 수 있습니다.",
    ],
  },
  {
    title: "4. 면책",
    body: [
      "서비스의 해석 콘텐츠는 참고용이며, 의료·법률·투자 등 중요한 의사결정의 근거로 사용될 수 없습니다. 이용자의 판단과 선택에 따른 결과에 대해 당사는 책임을 지지 않습니다.",
      "천재지변, 외부 서비스 장애 등 당사가 통제할 수 없는 사유로 인한 서비스 중단에 대해 책임을 지지 않습니다.",
    ],
  },
  {
    title: "5. 계정과 해지",
    body: [
      "이용자는 언제든지 로그아웃하거나 계정 삭제를 요청할 수 있습니다. 계정 삭제 시 프로필과 기록은 개인정보처리방침이 정한 절차에 따라 파기됩니다.",
      "타인의 정보를 무단으로 입력하거나 서비스를 부정한 목적으로 이용하는 경우 이용이 제한될 수 있습니다.",
    ],
  },
];

export default function TermsPage() {
  return (
    <main className="fade-rise p-6">
      <h1 className="font-[family-name:var(--font-serif-kr)] text-2xl text-primary-green">
        이용약관
      </h1>
      <p className="mt-2 rounded-card bg-warm-surface p-3 text-xs text-text-soft">
        개발 단계 초안 — 정식 오픈 전 법률 검토 예정
      </p>
      {SECTIONS.map((s) => (
        <section key={s.title} className="mt-5">
          <h2 className="text-base font-medium text-text-main">{s.title}</h2>
          {s.body.map((p, i) => (
            <p key={i} className="mt-2 text-sm leading-relaxed text-text-soft">
              {p}
            </p>
          ))}
        </section>
      ))}
    </main>
  );
}
```

- [ ] **Step 4: `/privacy` 구현**

`src/app/privacy/page.tsx`:

```tsx
import type { Metadata } from "next";

export const metadata: Metadata = { title: "개인정보처리방침 — 옴니마인드" };

// §9.3 개인정보처리방침 — 실제 코드 실사 기준 초안. 국외이전 항목이 핵심이다:
// 고민 텍스트·사주 프로필 맥락이 LLM 제공자(미국)로 실제로 전송된다
// (openrouter-provider.ts, gemini-provider.ts). 일반 템플릿에는 이 항목이 통째로 빠진다.
const SECTIONS: { title: string; body: string[] }[] = [
  {
    title: "1. 수집하는 정보",
    body: [
      "프로필 생성 시: 생년월일시, 혈액형, MBTI, 성별(선택), 닉네임.",
      "소셜 로그인 시: 카카오 계정의 닉네임·프로필 사진·이메일.",
      "서비스 이용 시: 고민·채팅으로 입력한 텍스트, 결제 기록(주문번호·상품·금액).",
    ],
  },
  {
    title: "2. 처리 위탁",
    body: [
      "데이터베이스·인증: Supabase (서울 리전). 프로필과 이용 기록이 저장됩니다.",
      "결제: 토스페이먼츠. 결제 처리 과정에서 결제 정보가 전달됩니다.",
    ],
  },
  {
    title: "3. 국외 이전",
    body: [
      "AI 문장 생성: OpenRouter(미국), Google Gemini(미국). 고민·채팅 텍스트와 사주 프로필 맥락이 문장 생성을 위해 전송됩니다. 전송된 데이터는 문장 생성 목적으로만 사용됩니다.",
      "호스팅: Vercel(미국). 서비스 요청이 Vercel 인프라를 경유합니다.",
    ],
  },
  {
    title: "4. 이용자의 권리",
    body: [
      "이용자는 자신의 정보에 대해 열람·정정·삭제를 요청할 수 있습니다.",
      "마음(채팅)·고민 기록은 서비스 내 삭제 기능으로 직접, 즉시 삭제할 수 있습니다.",
    ],
  },
  {
    title: "5. 보유 기간과 파기",
    body: [
      "수집한 정보는 회원 탈퇴 또는 삭제 요청 시 지체 없이 파기합니다. 단, 결제 기록 등 관련 법령이 보존을 요구하는 정보는 해당 기간 동안 분리 보관 후 파기합니다.",
    ],
  },
  {
    title: "6. 쿠키",
    body: [
      "로그인 세션 유지와 초대 링크 유입 경로 확인을 위한 최소한의 쿠키를 사용합니다. 광고 목적의 제3자 추적 쿠키는 사용하지 않습니다.",
    ],
  },
];

export default function PrivacyPage() {
  return (
    <main className="fade-rise p-6">
      <h1 className="font-[family-name:var(--font-serif-kr)] text-2xl text-primary-green">
        개인정보처리방침
      </h1>
      <p className="mt-2 rounded-card bg-warm-surface p-3 text-xs text-text-soft">
        개발 단계 초안 — 정식 오픈 전 법률 검토 예정
      </p>
      {SECTIONS.map((s) => (
        <section key={s.title} className="mt-5">
          <h2 className="text-base font-medium text-text-main">{s.title}</h2>
          {s.body.map((p, i) => (
            <p key={i} className="mt-2 text-sm leading-relaxed text-text-soft">
              {p}
            </p>
          ))}
        </section>
      ))}
    </main>
  );
}
```

- [ ] **Step 5: 통과 확인 + 검증 + 커밋**

Run: `npx vitest run src/app/info-pages.test.tsx` → PASS (9 tests)
Run: `npm run verify` → 통과

```bash
git add src/app/terms/ src/app/privacy/ src/app/info-pages.test.tsx
git commit -m "feat(p9): 이용약관·개인정보처리방침 초안 — 실사 기반 국외이전 고지, 개발 단계 표기"
```

---

### Task 10: `inquiries` 마이그레이션 + `/contact` 문의

**Files:**
- Create: `supabase/migrations/0009_p9_inquiries.sql`
- Create: `src/lib/inquiry/validate.ts`
- Test: `src/lib/inquiry/validate.test.ts`
- Create: `src/app/contact/actions.ts`
- Create: `src/components/contact/ContactForm.tsx`
- Test: `src/components/contact/ContactForm.test.tsx`
- Create: `src/app/contact/page.tsx`
- Modify: `src/lib/metrics/names.ts:4-9` (SERVER_EVENTS에 `"inquiry_submit"` 추가)
- Modify: `src/lib/db/types.ts` (InquiryRow 추가)

**Interfaces:**
- Consumes: `createServerSupabase`(user 확인), `createAdminSupabase`(RLS 우회 insert — 비로그인 문의 허용을 위해 anon insert 정책을 여는 대신 서버 액션만 쓰기 가능하게 한다), `recordEvent`
- Produces:
  - `validateInquiry(raw: { email: string; subject: string; body: string }): { ok: true; value: { email: string; subject: string; body: string } } | { ok: false; reason: "email" | "subject" | "body" }`
  - `SUBJECT_MAX = 100`, `BODY_MAX = 2000`
  - `submitInquiry(input: { email: string; subject: string; body: string }): Promise<{ ok: true } | { ok: false; reason: "invalid" | "error" }>` (서버 액션)
  - `/contact` 라우트

§9.2: 이메일 링크 + 간단 폼(제목·내용·회신 이메일 → `inquiries`). 로그인 상태면 `user_id` 자동 연결. 별도 서비스 없이 0원. §6.1의 `readings`·`reading_reviews`는 **2단계 마이그레이션**으로 미룬다 — 이번 파일에는 `inquiries`만.

- [ ] **Step 1: 마이그레이션 작성**

`supabase/migrations/0009_p9_inquiries.sql`:

```sql
-- P9 1단계: 문의(§9.2). (0008 이후 실행)
-- 실행: Supabase SQL Editor에 붙여넣고 Run.
-- §6.1의 readings·reading_reviews는 2단계(내 사주 심층 풀이) 마이그레이션에서 만든다.

create table if not exists public.inquiries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,  -- 비로그인 문의 허용
  email text not null,
  subject text not null,
  body text not null,
  created_at timestamptz not null default now()
);

alter table public.inquiries enable row level security;

-- 쓰기는 서버 액션(service role)만 — 비로그인 문의를 받기 위해 anon insert 정책을 여는
-- 대신, 검증을 마친 서버만 쓰게 해 스팸 표면을 줄인다. 읽기는 본인 것만.
drop policy if exists "own inquiries: select" on public.inquiries;
create policy "own inquiries: select" on public.inquiries
  for select using (auth.uid() = user_id);
```

- [ ] **Step 2: 검증 함수 실패 테스트 작성**

`src/lib/inquiry/validate.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { BODY_MAX, SUBJECT_MAX, validateInquiry } from "./validate";

const valid = { email: "a@b.co", subject: "제목", body: "내용" };

describe("문의 입력 검증 (§9.2)", () => {
  it("정상 입력은 트리밍되어 통과한다", () => {
    const r = validateInquiry({ email: " a@b.co ", subject: " 제목 ", body: " 내용 " });
    expect(r).toEqual({ ok: true, value: valid });
  });

  it("이메일 형식이 아니면 email 사유로 거부한다", () => {
    for (const email of ["", "no-at", "a@b", "a b@c.co"]) {
      expect(validateInquiry({ ...valid, email })).toEqual({ ok: false, reason: "email" });
    }
  });

  it("제목·내용은 비어 있거나 상한을 넘으면 거부한다", () => {
    expect(validateInquiry({ ...valid, subject: "  " })).toEqual({ ok: false, reason: "subject" });
    expect(validateInquiry({ ...valid, subject: "가".repeat(SUBJECT_MAX + 1) }))
      .toEqual({ ok: false, reason: "subject" });
    expect(validateInquiry({ ...valid, body: "" })).toEqual({ ok: false, reason: "body" });
    expect(validateInquiry({ ...valid, body: "가".repeat(BODY_MAX + 1) }))
      .toEqual({ ok: false, reason: "body" });
  });
});
```

- [ ] **Step 3: 실패 확인**

Run: `npx vitest run src/lib/inquiry/validate.test.ts`
Expected: FAIL — `Cannot find module './validate'`

- [ ] **Step 4: 검증 함수 구현**

`src/lib/inquiry/validate.ts`:

```ts
// 문의 입력 검증(§9.2) — 순수 함수. 서버 액션이 insert 전에 반드시 거친다.

export const SUBJECT_MAX = 100;
export const BODY_MAX = 2000;
const EMAIL_MAX = 254;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface InquiryInput {
  email: string;
  subject: string;
  body: string;
}

export type InquiryValidation =
  | { ok: true; value: InquiryInput }
  | { ok: false; reason: "email" | "subject" | "body" };

export function validateInquiry(raw: InquiryInput): InquiryValidation {
  const email = raw.email.trim();
  const subject = raw.subject.trim();
  const body = raw.body.trim();
  if (!email || email.length > EMAIL_MAX || !EMAIL_RE.test(email))
    return { ok: false, reason: "email" };
  if (!subject || subject.length > SUBJECT_MAX) return { ok: false, reason: "subject" };
  if (!body || body.length > BODY_MAX) return { ok: false, reason: "body" };
  return { ok: true, value: { email, subject, body } };
}
```

Run: `npx vitest run src/lib/inquiry/validate.test.ts` → PASS (3 tests)

- [ ] **Step 5: DB 타입·이벤트 이름 추가**

`src/lib/db/types.ts` 파일 끝에 추가:

```ts
/** P9 문의(inquiries) 한 행 — §9.2. */
export interface InquiryRow {
  id: string;
  user_id: string | null;
  email: string;
  subject: string;
  body: string;
  created_at: string;
}
```

`src/lib/metrics/names.ts`의 `SERVER_EVENTS` 배열에서 `"premium_purchase", // P7-3 이용권 결제 승인` 줄 아래에 추가:

```ts
  "inquiry_submit", // P9 문의 접수
```

- [ ] **Step 6: 서버 액션 구현**

`src/app/contact/actions.ts`:

```ts
"use server";

import { createServerSupabase } from "@/lib/supabase/server";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { recordEvent } from "@/lib/metrics/events";
import { validateInquiry } from "@/lib/inquiry/validate";

export type InquiryResult = { ok: true } | { ok: false; reason: "invalid" | "error" };

/**
 * 문의 접수(§9.2) — 검증 후 inquiries에 저장. 로그인 상태면 user_id 자동 연결.
 * 쓰기는 admin 클라이언트로만 한다 — 비로그인 문의를 받기 위해 anon insert 정책을
 * 여는 대신, 검증을 마친 서버만 쓰게 해 스팸 표면을 줄인다(0009 마이그레이션 주석 참조).
 */
export async function submitInquiry(input: {
  email: string;
  subject: string;
  body: string;
}): Promise<InquiryResult> {
  const v = validateInquiry(input);
  if (!v.ok) return { ok: false, reason: "invalid" };

  try {
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();

    const admin = createAdminSupabase();
    const { error } = await admin.from("inquiries").insert({
      user_id: user?.id ?? null,
      email: v.value.email,
      subject: v.value.subject,
      body: v.value.body,
    });
    if (error) return { ok: false, reason: "error" };

    await recordEvent("inquiry_submit", { loggedIn: Boolean(user) });
    return { ok: true };
  } catch {
    return { ok: false, reason: "error" };
  }
}
```

- [ ] **Step 7: 폼 컴포넌트 실패 테스트 작성**

`src/components/contact/ContactForm.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import ContactForm from "./ContactForm";

describe("문의 폼 (§9.2)", () => {
  it("이메일·제목·내용 입력과 보내기 버튼이 렌더된다", () => {
    render(<ContactForm defaultEmail="" />);
    expect(screen.getByLabelText("회신 받을 이메일")).toBeInTheDocument();
    expect(screen.getByLabelText("제목")).toBeInTheDocument();
    expect(screen.getByLabelText("내용")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "보내기" })).toBeInTheDocument();
  });

  it("로그인 이메일이 있으면 미리 채워진다", () => {
    render(<ContactForm defaultEmail="me@omni.app" />);
    expect(screen.getByLabelText("회신 받을 이메일")).toHaveValue("me@omni.app");
  });
});
```

- [ ] **Step 8: 실패 확인**

Run: `npx vitest run src/components/contact/ContactForm.test.tsx`
Expected: FAIL — `Cannot find module './ContactForm'`

- [ ] **Step 9: 폼 컴포넌트 구현**

`src/components/contact/ContactForm.tsx`:

```tsx
"use client";

import { useState, useTransition } from "react";
import { submitInquiry } from "@/app/contact/actions";
import { BODY_MAX, SUBJECT_MAX } from "@/lib/inquiry/validate";

/** 문의 폼(§9.2) — 제출 성공 시 폼 대신 감사 안내를 보여준다. */
export default function ContactForm({ defaultEmail }: { defaultEmail: string }) {
  const [email, setEmail] = useState(defaultEmail);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (done) {
    return (
      <div className="rounded-card bg-warm-surface p-5 text-center">
        <p className="text-text-main">잘 받았어요. 남겨 주신 이메일로 곧 답장을 드릴게요. 💌</p>
      </div>
    );
  }

  const canSubmit = email.trim() && subject.trim() && body.trim() && !pending;

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const r = await submitInquiry({ email, subject, body });
      if (r.ok) setDone(true);
      else if (r.reason === "invalid")
        setError("입력을 다시 확인해 주실래요? 이메일 형식과 글자 수를 봐주세요.");
      else setError("지금은 접수가 어려워요. 잠시 뒤 다시 시도해 주시면 고마워요.");
    });
  };

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3">
      <label className="text-sm text-text-soft">
        회신 받을 이메일
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mt-1 w-full rounded-card border border-text-soft/25 bg-warm-surface p-3 text-text-main"
        />
      </label>
      <label className="text-sm text-text-soft">
        제목
        <input
          type="text"
          value={subject}
          maxLength={SUBJECT_MAX}
          onChange={(e) => setSubject(e.target.value)}
          className="mt-1 w-full rounded-card border border-text-soft/25 bg-warm-surface p-3 text-text-main"
        />
      </label>
      <label className="text-sm text-text-soft">
        내용
        <textarea
          value={body}
          maxLength={BODY_MAX}
          rows={6}
          onChange={(e) => setBody(e.target.value)}
          className="mt-1 w-full rounded-card border border-text-soft/25 bg-warm-surface p-3 text-text-main"
        />
      </label>
      {error && <p className="text-sm text-accent-coral">{error}</p>}
      <button
        type="submit"
        disabled={!canSubmit}
        className="press rounded-card bg-accent-coral py-3.5 font-medium text-white disabled:opacity-40"
      >
        {pending ? "보내는 중…" : "보내기"}
      </button>
    </form>
  );
}
```

Run: `npx vitest run src/components/contact/ContactForm.test.tsx` → PASS (2 tests)

- [ ] **Step 10: 문의 페이지 구현**

`src/app/contact/page.tsx`:

```tsx
import type { Metadata } from "next";
import { createServerSupabase } from "@/lib/supabase/server";
import ContactForm from "@/components/contact/ContactForm";

export const metadata: Metadata = { title: "문의하기 — 옴니마인드" };

export default async function ContactPage() {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <main className="fade-rise p-6">
      <h1 className="font-[family-name:var(--font-serif-kr)] text-2xl text-primary-green">
        문의하기
      </h1>
      <p className="mt-2 text-sm leading-relaxed text-text-soft">
        궁금한 점, 불편했던 점, 어떤 이야기든 편하게 남겨 주세요. 이메일로 답장을 드려요.
      </p>
      <div className="mt-5">
        <ContactForm defaultEmail={user?.email ?? ""} />
      </div>
      <p className="mt-6 text-center text-xs text-text-soft">
        이메일이 편하다면{" "}
        <a href="mailto:swssmjy86@gmail.com" className="underline underline-offset-2">
          swssmjy86@gmail.com
        </a>
        으로 보내 주셔도 좋아요.
      </p>
    </main>
  );
}
```

- [ ] **Step 11: 마이그레이션 적용 + 검증 + 커밋**

Supabase SQL Editor에서 `0009_p9_inquiries.sql` 실행 (Run).
Run: `npm run verify` → 통과. `npm run dev`에서 /contact 폼 제출 → Supabase 테이블에 행 생성 확인(비로그인·로그인 각 1회).

```bash
git add supabase/migrations/0009_p9_inquiries.sql src/lib/inquiry/ src/app/contact/ src/components/contact/ src/lib/metrics/names.ts src/lib/db/types.ts
git commit -m "feat(p9): /contact 문의 — inquiries 테이블·검증·서버 액션(admin insert)·폼"
```

---

### Task 11: 최종 통합 검증 · 배포 준비

**Files:**
- 수정 없음 (검증만). 발견된 문제는 해당 태스크 파일로 돌아가 고친다.

- [ ] **Step 1: 전체 검증**

Run: `npm run verify`
Expected: lint → typecheck → test → build 전부 통과

- [ ] **Step 2: 수동 스모크 체크리스트** (`npm run dev`, 모바일 뷰포트)

- 다크(밤의 따뜻함): 홈·온보딩·/me·/match·/premium 이 밤 네이비 + 골드 + 코랄로 일관, 라이트('새벽')는 기존 그대로
- 홈: 달지기 일진 카드(무료 훅) → 상품 카드 4장(인연·재물 "곧 만나요") → 마음/고민 → 푸터 순서
- OS '동작 줄이기' 켬 → 모든 카드 모션 정지, 멘트·CTA 텍스트 온전
- 푸터 5링크가 각 페이지로 이동, 5개 정보 페이지 모두 렌더
- /faq 페이지 소스에 `application/ld+json` 스크립트 존재
- /contact 제출 → 성공 안내, Supabase `inquiries`에 행 생성(로그인 시 user_id 연결)
- 비로그인·로그인 모두에서 홈 정상 (기존 데일리·마일스톤·공유 시트 동작 그대로)

- [ ] **Step 3: 머지·배포**

`omni-merge` 스킬로 리뷰 후 main 머지 → Vercel 배포. 배포 전 Supabase에 0009 마이그레이션이 적용되어 있어야 /contact가 동작한다(미적용이어도 다른 화면은 영향 없음 — 문의만 error 응답).

- [ ] **Step 4: 후속 플랜 준비 메모**

2단계 플랜(내 사주 심층 풀이·엿보기/블러·`readings` 캐싱·`readingAccess`) 작성 시 이 플랜이 만든 인터페이스를 소비한다: `PERSONAS`(인사말), `PRODUCTS`(href를 `/reading/profile-deep` 등 신규 라우트로 갱신, `fate`/`wealth`는 4단계에서 `status: "live"` 전환), `--moon-gold` 토큰, `persona-card` CSS 클래스.

---

## Self-Review 기록

- **설계서 1단계 범위 커버리지:** 토큰 전환(Task 1) · 홈 개편+CSS 모션 카드(Task 4·5) · 푸터(Task 6) · /sources(Task 7) · /faq(Task 8) · /terms /privacy(Task 9) · /contact+inquiries(Task 10) — §10의 1단계 항목 전부 대응. §7.3 "풀이별 근거 접이식"은 현존 풀이(일진)에 한해 Task 5에서 처리, 신규 풀이의 접이식은 각 풀이가 생기는 2~4단계 플랜 몫.
- **1단계 비포함 확인:** readings/reading_reviews 테이블(§6.1)·readingAccess(§6.3)·엿보기/블러(§5.1)·후기(§5.2)·공유 카드 확장(§5.3)·일진 보조축(§3.4)은 각각 2·3·4·5단계 — 의도된 제외.
- **타입 일관성:** `PersonaId`·`Persona`(Task 2) ↔ `Product.personaId`(Task 3) ↔ `PersonaCard`(Task 4) ↔ `ProductShelf`(Task 5) 시그니처 일치 확인. `validateInquiry` 반환 타입(Task 10 Step 2 테스트 ↔ Step 4 구현) 일치 확인.
- **톤 검사:** 페르소나 대사·상품 카피·FAQ 답변의 금지 패턴(`하세요`·`~니다`·공포 카피) 부재를 코드 리뷰가 아닌 **테스트로 강제**(Task 2·3·8). 법적 문서(합니다체)는 명시적 예외.
