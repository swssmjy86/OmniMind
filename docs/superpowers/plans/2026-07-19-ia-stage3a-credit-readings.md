# IA 3a — 크레딧 풀이 4종(직업·연애·재물·결혼) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 스펙 `docs/superpowers/specs/2026-07-19-ia-stage3-credit-readings.md`의 3a — 크레딧 차감 파이프라인(`unlockReading`), 자기 프로필 4종 풀이 조립, `/saju/[product]` 화면, 구버전 프로필 재계산 트리거.

**Architecture:** 2단계에서 검증된 파이프라인(readingAccess·readings 캐시·해시) 위에 차감 실행과 유료 LLM만 얹는다. 조립은 `dominantCategory` 5갈래 × 상품별 텍스트 표(팔자 주축) + 기존 오행·대운 재사용 + MBTI/혈액형 보조 수식(`synthesisText` 패턴). 차감은 생성 성공 후·재열람 무차감·LLM 실패 시 무차감(P9 §12).

**Tech Stack:** Next.js 16 · Supabase RPC(`consume_consult_credit`) · OpenRouter premium · Vitest

## Global Constraints

- **커밋 전 `npm run verify` 통과 필수.** 브랜치 `feat/ia-stage3a-credit-readings`(생성됨).
- **차감 규칙(P9 §6.2·§12):** 캐시 히트=차감 없음 / 차감은 LLM 포함 생성 **성공 후** / 유료 LLM 실패=차감·캐시 없이 템플릿본 반환(실패를 보이지 않는다) / 레거시 프리미엄=무제한·무차감.
- **해석 축 위계(§3):** 섹션 ①핵심 결·②오행·③운의 계절=팔자 주축, ④보조축(MBTI·혈액형)은 마지막·수식만. 보조지표 단독 결론 금지.
- **잠긴 본문 서버 비노출(P9 §5.1):** 미열람 화면에는 섹션 제목·자리표시자만.
- **톤 규칙(§5.4):** `하세요`/`[가-힣]니다`/`조심하세요|나쁜 기운|불행`/`회원님|사용자님`/`사람이(에요|죠|야)` 금지 — 전 카피 tone-guard 테스트.
- **재계산 트리거(스펙 §2):** 유료 풀이·총운은 `ensureCurrentProfile` 경유 — 구버전 계산값 위에 팔지 않는다.
- 캐시 키는 2단계와 동일(`readingInputHash(ctx, 대운간지)`) — product 열로 구분. LLM 문단은 캐시에 포함(재열람 무료·재호출 없음).
- 컴포넌트는 토큰만 참조, `teaser-bar` 패턴 재사용. 서버 액션 결과는 항상 typed union, throw 금지.

## 파일 구조

```
src/lib/interpret/content/chongun.ts                 [수정] daeunSeasonBody export 리팩터(동작 불변)
src/lib/readings/ensure-profile.ts / .test.ts         [신규] engineInputFromProfile(순수)·ensureCurrentProfile
src/lib/interpret/content/credit-readings.ts / .test.ts [신규] 4종 조립 + 카피 표
src/lib/readings/actions.ts                           [신규] unlockReading 서버 액션(차감·유료 LLM)
src/lib/metrics/names.ts                              [수정] SERVER_EVENTS "reading_unlock"
src/components/saju/ReadingPeek.tsx / .test.tsx        [신규] 잠금 화면 공용(제목만·본문 비노출)
src/components/saju/UnlockReading.tsx / .test.tsx      [신규] 열기 버튼·결과 렌더(클라이언트)
src/app/(tabs)/saju/[product]/page.tsx                 [신규] 4종 동적 페이지
src/app/(tabs)/saju/chongun/page.tsx                   [수정] ensureCurrentProfile 적용
src/lib/persona/products.ts / .test.ts                 [수정] 4종 live·href
src/app/(tabs)/saju/page.test.tsx                      [수정] live 링크 6개
src/components/home/PersonaCard.test.tsx               [수정] soon 픽스처를 리터럴로
```

---

### Task 1: 재사용 리팩터 + 재계산 트리거

**Files:**
- Modify: `src/lib/interpret/content/chongun.ts` (내부 함수 일부를 export로 — 동작 불변)
- Create: `src/lib/readings/ensure-profile.ts` / Test: `src/lib/readings/ensure-profile.test.ts`

**Interfaces:**
- Consumes: `computeProfile`, `PROFILE_CONTEXT_VERSION`(`@/lib/engine/index`), `ProfileRow`
- Produces:
  - `daeunSeasonBody(ctx: ProfileContext, age: number | null): string` — chongun.ts에서 export (기존 `seasonSection`이 이 함수를 쓰도록 리팩터, 기존 테스트 전부 그대로 통과)
  - `engineInputFromProfile(row: ProfileRow): EngineInput` (순수)
  - `ensureCurrentProfile(supabase: SupabaseLike, row: ProfileRow): Promise<ProfileContext>` — version이 현재 이상이면 그대로, 낮으면 재계산·행 갱신(best-effort)·반환

- [ ] **Step 1: chongun 리팩터 — body 추출**

`src/lib/interpret/content/chongun.ts`에서 `seasonSection`의 세 분기 문자열을 함수로 추출해 export:

```ts
/** 운의 계절 본문 — 총운·크레딧 풀이가 함께 쓴다(3a). 세 분기: 진행 중/첫 대운 이전/성별 미상. */
export function daeunSeasonBody(ctx: ProfileContext, age: number | null): string {
  if (!ctx.daeun) {
    return "성별을 알려주시면 10년 단위 운의 흐름(대운)까지 읽어드려요. 온보딩에서 이야기를 다시 이어볼 수 있어요.";
  }
  const season = age !== null ? currentDaeun(ctx.daeun, age) : null;
  if (!season) {
    return `당신의 첫 대운은 ${ctx.daeun.startAge}세에 시작돼요. 아직은 타고난 결이 자라나는 계절이에요.`;
  }
  return `지금 당신은 ${season.ganzhi} 대운을 지나고 있어요 — ${season.fromAge}세부터 ${season.toAge}세까지, 10년의 큰 계절이에요. ${daeunSeasonText(season.ganzhi)}`;
}
```

`seasonSection`은 `{ title: SEASON_TITLE, body: daeunSeasonBody(ctx, age) }` 한 줄로 축소.
문자열은 글자 하나 바꾸지 않는다 — 기존 `chongun.test.ts`가 그대로 통과해야 한다.

Run: `npx vitest run src/lib/interpret/content/chongun.test.ts` → PASS (4 tests, 무수정)

- [ ] **Step 2: ensure-profile 실패 테스트**

`src/lib/readings/ensure-profile.test.ts`:

```ts
import { describe, expect, it, vi } from "vitest";
import { PROFILE_CONTEXT_VERSION, computeProfile } from "@/lib/engine/index";
import type { ProfileRow } from "@/lib/db/types";
import { engineInputFromProfile, ensureCurrentProfile } from "./ensure-profile";

const baseRow = {
  user_id: "u1", nickname: "새벽",
  birth_date: "1990-06-15", birth_time: "07:30:00", time_unknown: false,
  blood_type: "A", mbti: "ENFJ", gender: "male",
  created_at: "", updated_at: "",
} as unknown as ProfileRow;

describe("engineInputFromProfile (스펙 §2 — 순수 변환)", () => {
  it("HH:mm:ss → HH:MM, 필드 매핑", () => {
    expect(engineInputFromProfile(baseRow)).toEqual({
      birthDate: "1990-06-15", birthTime: "07:30", timeUnknown: false,
      bloodType: "A", mbti: "ENFJ", gender: "male",
    });
  });

  it("시간 미상·성별 없음 처리", () => {
    const row = { ...baseRow, birth_time: null, time_unknown: true, gender: null } as ProfileRow;
    const input = engineInputFromProfile(row);
    expect(input.timeUnknown).toBe(true);
    expect(input.birthTime).toBeNull();
    expect(input.gender).toBeUndefined();
  });
});

describe("ensureCurrentProfile (스펙 §2 — 재계산 트리거)", () => {
  const freshCtx = computeProfile(engineInputFromProfile(baseRow));

  const supabaseMock = () => {
    const eq = vi.fn().mockResolvedValue({ error: null });
    const update = vi.fn(() => ({ eq }));
    const from = vi.fn(() => ({ update }));
    return { client: { from } as never, from, update, eq };
  };

  it("현재 버전이면 재계산·갱신 없이 그대로 반환한다", async () => {
    const m = supabaseMock();
    const row = { ...baseRow, profile_context: freshCtx } as ProfileRow;
    const out = await ensureCurrentProfile(m.client, row);
    expect(out).toBe(freshCtx);
    expect(m.from).not.toHaveBeenCalled();
  });

  it("구버전이면 재계산해 최신 버전으로 갱신·반환한다", async () => {
    const m = supabaseMock();
    const stale = { ...freshCtx, version: PROFILE_CONTEXT_VERSION - 1 };
    const row = { ...baseRow, profile_context: stale } as ProfileRow;
    const out = await ensureCurrentProfile(m.client, row);
    expect(out.version).toBe(PROFILE_CONTEXT_VERSION);
    expect(m.from).toHaveBeenCalledWith("profiles");
    expect(m.eq).toHaveBeenCalledWith("user_id", "u1");
  });

  it("행 갱신 실패는 무시하고 재계산본을 반환한다(best-effort)", async () => {
    const eq = vi.fn().mockRejectedValue(new Error("db down"));
    const client = { from: () => ({ update: () => ({ eq }) }) } as never;
    const stale = { ...freshCtx, version: PROFILE_CONTEXT_VERSION - 1 };
    const out = await ensureCurrentProfile(client, { ...baseRow, profile_context: stale } as ProfileRow);
    expect(out.version).toBe(PROFILE_CONTEXT_VERSION);
  });
});
```

- [ ] **Step 3: 실패 확인 후 구현**

Run: `npx vitest run src/lib/readings/ensure-profile.test.ts` → FAIL (모듈 없음)

`src/lib/readings/ensure-profile.ts`:

```ts
// 구버전 프로필 재계산 트리거(3단계 스펙 §2, 사용자 확정) — 저장된 profile_context.version이
// 현재 엔진보다 낮으면 지금 엔진과 다른 값이므로(CLAUDE.md), 유료 풀이를 그 위에 만들지
// 않는다. 원본 입력(생년월일시 등)은 profiles 행에 있으므로 재계산 가능하다.
import { computeProfile, PROFILE_CONTEXT_VERSION, type ProfileContext } from "@/lib/engine/index";
import type { EngineInput } from "@/lib/engine/types";
import type { ProfileRow } from "@/lib/db/types";

/** profiles 행 → 엔진 입력(순수). birth_time은 "HH:mm:ss"로 저장되어 있어 "HH:MM"로 자른다. */
export function engineInputFromProfile(row: ProfileRow): EngineInput {
  return {
    birthDate: row.birth_date,
    birthTime: row.time_unknown ? null : (row.birth_time ? row.birth_time.slice(0, 5) : null),
    timeUnknown: row.time_unknown,
    bloodType: row.blood_type,
    mbti: row.mbti as EngineInput["mbti"],
    gender:
      row.gender === "male" || row.gender === "female" ? row.gender : undefined,
  };
}

/** update 체인만 쓰는 최소 클라이언트 형태 — 테스트에서 목이 쉽다. */
interface SupabaseLike {
  from(table: string): {
    update(values: Record<string, unknown>): { eq(col: string, v: string): PromiseLike<unknown> };
  };
}

/**
 * 최신 버전이면 그대로, 구버전이면 재계산해 profiles를 갱신(best-effort)하고 최신 ctx를
 * 반환한다. 갱신 실패는 무시 — 화면은 재계산본으로 항상 최신을 쓴다(P9 §12 서비스 우선).
 */
export async function ensureCurrentProfile(
  supabase: SupabaseLike,
  row: ProfileRow,
): Promise<ProfileContext> {
  if (row.profile_context.version >= PROFILE_CONTEXT_VERSION) return row.profile_context;
  const ctx = computeProfile(engineInputFromProfile(row));
  try {
    await supabase.from("profiles").update({ profile_context: ctx }).eq("user_id", row.user_id);
  } catch {
    // 갱신 실패해도 반환값은 최신 — 다음 방문에 다시 시도된다
  }
  return ctx;
}
```

(참고: `EngineInput`의 `birthTime`이 `string | null`이 아니라 다른 형태면 — `src/lib/engine/types.ts` 확인 — 타입에 맞게 조정하되 "시간 미상이면 시간 없이"라는 의미는 유지한다. `gender` 필드도 실제 타입(`Gender`)에 맞춘다.)

- [ ] **Step 4: 통과 확인 후 검증·커밋**

Run: `npx vitest run src/lib/readings/ensure-profile.test.ts src/lib/interpret/content/chongun.test.ts` → PASS

```bash
npm run verify
git add src/lib/interpret/content/chongun.ts src/lib/readings/
git commit -m "feat(readings): 구버전 프로필 재계산 트리거 + 대운 본문 재사용 리팩터"
```

---

### Task 2: 4종 풀이 조립 (`credit-readings.ts`)

**Files:**
- Create: `src/lib/interpret/content/credit-readings.ts` / Test: `src/lib/interpret/content/credit-readings.test.ts`

**Interfaces:**
- Consumes: `dominantCategory`(`./ten-gods`), `ELEMENT_BALANCE_TEXT`(`./elements`), `daeunSeasonBody`(`./chongun`), `ProfileContext`, `InterpretationSection`
- Produces:
  - `type CreditReadingProduct = "career" | "love" | "wealth" | "marriage"`
  - `const CREDIT_READING_PRODUCTS: CreditReadingProduct[]`
  - `isCreditReadingProduct(v: string): v is CreditReadingProduct`
  - `readingSectionTitles(product): string[]` — 엿보기가 쓰는 제목 목록(①~④ + "당신만을 위한 이야기")
  - `assembleCreditReading(product, ctx, nickname, age): InterpretationSection[]` — ①~④ 4섹션
  - `const LLM_SECTION_TITLE = "당신만을 위한 이야기"`
  - `creditReadingPrompt(product, ctx, sections): string` — 유료 LLM 요청문

- [ ] **Step 1: 실패하는 테스트 작성**

`src/lib/interpret/content/credit-readings.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { computeProfile } from "@/lib/engine";
import { checkTone, checkToneWarnings } from "../tone-guard";
import {
  CREDIT_READING_PRODUCTS, LLM_SECTION_TITLE, assembleCreditReading,
  creditReadingPrompt, isCreditReadingProduct, readingSectionTitles,
} from "./credit-readings";

const ctx = computeProfile({
  birthDate: "1990-06-15", birthTime: "07:30", timeUnknown: false,
  bloodType: "A", mbti: "ENFJ", gender: "male",
});

describe("크레딧 풀이 조립 4종 (3단계 스펙 §3)", () => {
  it("상품 4종·가드", () => {
    expect(CREDIT_READING_PRODUCTS).toEqual(["career", "love", "wealth", "marriage"]);
    expect(isCreditReadingProduct("career")).toBe(true);
    expect(isCreditReadingProduct("chongun")).toBe(false);
  });

  it("모든 상품: 섹션 4개 — ①핵심 결 ②오행 ③운의 계절 ④보조축(마지막) — 위계 §3", () => {
    for (const p of CREDIT_READING_PRODUCTS) {
      const out = assembleCreditReading(p, ctx, "새벽", 36);
      expect(out).toHaveLength(4);
      expect(out[1].title).toBe("오행이 건네는 조언");
      expect(out[2].title).toBe("운의 계절");
      expect(out[3].title).toBe("당신에게 드러나는 방식"); // 보조축은 항상 마지막
      expect(out[2].body).toContain("대운");
      // 엿보기 제목 = 실제 섹션 제목 + LLM 제목
      expect(readingSectionTitles(p)).toEqual([...out.map((s) => s.title), LLM_SECTION_TITLE]);
    }
  });

  it("보조축 섹션은 MBTI 축과 혈액형을 수식으로만 담는다(단독 결론 금지 — 사주 결을 받는 문장)", () => {
    for (const p of CREDIT_READING_PRODUCTS) {
      const aux = assembleCreditReading(p, ctx, "새벽", 36)[3].body;
      expect(aux).toMatch(/^이 |^이 결|^이 마음|^이 감각/); // 앞 섹션(팔자)의 결을 받아 수식
      expect(aux).toContain("A형");
    }
  });

  it("전 카피 톤 가드 — 4상품 × 5갈래(dominant 조작 불가하므로 표를 직접 검사)", async () => {
    const mod = await import("./credit-readings");
    // 내부 표를 export하지 않으므로, 조립 결과와 프롬프트로 검사 가능한 것 + 표 전수는
    // __TEXT_FOR_TEST export로 노출한다(테스트 전용 — 런타임 사용 금지 주석).
    const { __TEXT_FOR_TEST } = mod;
    for (const t of __TEXT_FOR_TEST) {
      expect(checkTone(t)).toEqual([]);
      expect(checkToneWarnings(t)).toEqual([]);
    }
  });

  it("LLM 프롬프트는 상품·섹션 본문을 담고 새 결론을 금지한다", () => {
    const sections = assembleCreditReading("career", ctx, "새벽", 36);
    const prompt = creditReadingPrompt("career", ctx, sections);
    expect(prompt).toContain("직업");
    expect(prompt).toContain(sections[0].body.slice(0, 20));
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `npx vitest run src/lib/interpret/content/credit-readings.test.ts`
Expected: FAIL — `Cannot find module './credit-readings'`

- [ ] **Step 3: 구현**

`src/lib/interpret/content/credit-readings.ts`:

```ts
// 크레딧 풀이 4종 조립(3단계 스펙 §3) — 순수 템플릿, LLM 문단은 액션이 성공 시에만 덧붙인다.
// 구조(해석 축 위계 §3): ①상품별 핵심 결(십성 5갈래 — 팔자 주축) ②오행 ③운의 계절(대운)
// ④보조축(MBTI E/I 수식 + 혈액형 마무리 — 결론을 만들지 않고 앞의 결을 받아 수식만 한다).
import type { ProfileContext } from "@/lib/engine/index";
import type { InterpretationSection } from "../types";
import { dominantCategory, type TenGodCategory } from "./ten-gods";
import { ELEMENT_BALANCE_TEXT } from "./elements";
import { daeunSeasonBody } from "./chongun";

export type CreditReadingProduct = "career" | "love" | "wealth" | "marriage";
export const CREDIT_READING_PRODUCTS: CreditReadingProduct[] = [
  "career", "love", "wealth", "marriage",
];
export const isCreditReadingProduct = (v: string): v is CreditReadingProduct =>
  (CREDIT_READING_PRODUCTS as string[]).includes(v);

export const LLM_SECTION_TITLE = "당신만을 위한 이야기";

const KEY_TITLE: Record<CreditReadingProduct, string> = {
  career: "일의 결", love: "마음의 결", wealth: "재물의 결", marriage: "함께의 결",
};

const PRODUCT_LABEL: Record<CreditReadingProduct, string> = {
  career: "직업", love: "연애", wealth: "재물", marriage: "결혼",
};

// ① 핵심 결 — 십성 5갈래 × 상품별. 전부 팔자가 주어(§3.2).
const KEY_TEXT: Record<CreditReadingProduct, Record<TenGodCategory, string>> = {
  career: {
    비겁: "일에서 당신은 스스로 판을 이끄는 쪽이 어울려요. 지시받기보다 재량이 주어질 때 힘이 나고, 독립적인 역할에서 결이 살아나죠. 협업에서는 방향을 정하는 자리를 맡아보아요.",
    식상: "당신의 일은 표현과 창작에서 빛나요. 만들고, 쓰고, 보여주는 자리 — 결과물이 눈에 보이는 일에서 유난히 오래 힘이 이어져요.",
    재성: "당신은 성과가 손에 잡히는 일에서 힘이 나요. 숫자·거래·운영처럼 실리를 다루는 자리에서 감각이 살아나고, 기회를 알아보는 눈이 커리어의 무기가 되죠.",
    관성: "당신에게는 맡은 자리를 지켜내는 힘이 커리어의 중심이에요. 체계 안에서 신뢰를 쌓아 올라가는 길 — 책임이 주어질수록 오히려 안정감을 느끼는 결이에요.",
    인성: "당신의 일은 배우고 정리해 전하는 데서 깊어져요. 연구·기획·가르침처럼 앎을 다루는 자리에서 남다른 꾸준함이 드러나죠.",
  },
  love: {
    비겁: "마음을 줄 때도 당신은 대등한 관계를 원해요. 기대기보다 나란히 걷는 사이 — 서로의 영역을 존중해주는 상대와 만날 때 마음이 오래가요.",
    식상: "당신은 마음을 표현으로 건네는 쪽이에요. 말과 몸짓, 작은 선물로 애정이 흐르죠. 표현을 받아주고 되돌려주는 상대에게 마음이 깊어져요.",
    재성: "당신의 애정은 구체적이에요. 마음만큼 행동으로 챙기고, 함께하는 시간을 현실로 만들어가죠. 막연한 약속보다 손에 잡히는 다정함에 끌리는 결이에요.",
    관성: "당신은 관계에 진심과 책임을 다하는 쪽이에요. 가볍게 시작하기보다 믿음이 쌓인 뒤에 깊어지는 결 — 그만큼 한번 이어진 마음은 쉽게 흔들리지 않죠.",
    인성: "당신은 마음을 천천히 받아들이며 깊어지는 쪽이에요. 대화가 통하고 생각의 결이 맞는 상대에게 끌리고, 이해받는다는 느낌에서 사랑을 확인하죠.",
  },
  wealth: {
    비겁: "당신의 재물은 스스로 벌어 스스로 지키는 결이에요. 동업보다 내 몫이 분명한 구조가 마음 편하고, 나눠 쓰는 지출에는 기준을 세워두면 좋아요.",
    식상: "당신의 재물은 재주에서 나와요. 만들어내는 것, 표현하는 것이 수입의 통로가 되는 결 — 재능에 들이는 지출이 곧 저축이 되죠.",
    재성: "당신은 돈의 흐름을 읽는 감각을 타고났어요. 벌 곳과 쓸 곳을 알아보는 눈이 밝아, 관리의 습관만 더해지면 재물이 꾸준히 쌓이는 결이에요.",
    관성: "당신의 재물은 신용에서 자라요. 꾸준한 자리, 안정된 흐름에서 모이는 결 — 급한 수익보다 오래가는 구조가 어울려요.",
    인성: "당신의 재물은 앎이 앞서고 돈이 따라오는 결이에요. 배움과 자격에 들인 시간이 뒤에 큰 흐름으로 돌아오죠. 서두르지 않는 마음이 곧 재테크예요.",
  },
  marriage: {
    비겁: "결혼에서 당신은 각자의 영역이 살아있는 동반자를 원해요. 서로의 삶을 존중하는 두 사람이 나란히 걷는 그림 — 하나로 녹아들기보다 나란히 서는 데서 안정을 찾는 결이에요.",
    식상: "당신의 가정은 표현이 흐르는 곳일 때 따뜻해요. 말하고 웃고 함께 만드는 일상 — 침묵이 길어지는 관계보다 소소한 수다가 이어지는 집이 어울려요.",
    재성: "당신은 가정을 현실로 단단히 꾸리는 쪽이에요. 함께의 삶을 구체적으로 설계하고 챙기는 결 — 생활의 합이 맞는 상대와 오래 편안해요.",
    관성: "당신에게 결혼은 약속의 무게를 함께 지는 일이에요. 신의로 쌓아가는 관계에서 깊은 안정을 느끼는 결 — 서두르지 않고 확신 위에 시작하는 편이 어울려요.",
    인성: "당신의 가정은 서로를 이해하는 대화 위에 서요. 말없이도 통하는 순간을 소중히 여기고, 배우자에게서 배우고 기대는 데서 편안함을 찾는 결이에요.",
  },
};

// ③ 운의 계절 도입 한 줄(상품 맥락) — 대운 본문(daeunSeasonBody) 앞에 붙는다.
const FLOW_INTRO: Record<CreditReadingProduct, string> = {
  career: "일의 흐름도 계절을 타요.",
  love: "인연의 때도 계절처럼 흘러요.",
  wealth: "재물의 물길도 계절을 타요.",
  marriage: "함께의 때도 계절처럼 와요.",
};

// ④ 보조축 — MBTI E/I 수식(상품별). 전부 "이 …" 로 시작해 앞 섹션(팔자)의 결을 받는다.
const AUX_TEXT: Record<CreditReadingProduct, Record<"E" | "I", string>> = {
  career: {
    E: "이 결이 E의 기운을 타면 사람들 앞에서 성과가 드러나는 자리에서 더 크게 자라요.",
    I: "이 결이 I의 기운과 만나면 혼자 몰입하는 시간에서 성과가 깊어져요 — 조용한 집중을 지켜주는 환경을 골라보아요.",
  },
  love: {
    E: "이 마음이 E의 결을 타면 표현이 앞서 나가요 — 속도를 상대에게 맞춰주면 더 오래 흘러요.",
    I: "이 마음이 I의 결 안에 있으면 겉으로 잔잔해 보여요 — 이따금 마음을 소리 내어 건네면 관계가 한결 가까워져요.",
  },
  wealth: {
    E: "이 감각이 E의 추진력과 만나면 벌리는 힘이 커져요 — 매듭짓는 손만 더해주면 돼요.",
    I: "이 감각이 I의 신중함과 만나면 새는 돈이 적어요 — 기회 앞에서 반 박자만 빨라져도 충분해요.",
  },
  marriage: {
    E: "이 결이 E의 기운과 만나면 사람들로 북적이는 따뜻한 집의 그림이에요 — 둘만의 시간도 함께 챙겨보아요.",
    I: "이 결이 I의 기운과 만나면 조용하고 아늑한 가정의 그림이에요 — 서로의 혼자 시간을 존중하는 약속이 힘이 돼요.",
  },
};

// ④ 마무리 절 — 혈액형(공용 4종). 보조축 안에서 한 문장 수식으로만 쓰인다.
const BLOOD_CLOSE: Record<"A" | "B" | "O" | "AB", string> = {
  A: "A형 특유의 섬세함이 그 위에 정성을 한 겹 더해줘요.",
  B: "B형의 자유로운 결이 그 위에 생기를 불어넣어요.",
  O: "O형의 뚝심이 그 흐름을 끝까지 밀어줘요.",
  AB: "AB형의 균형 감각이 그 결을 차분히 다듬어줘요.",
};

/** 엿보기·화면이 쓰는 섹션 제목 목록(잠김 상태에서도 제목은 공개 — P9 §5.1). */
export function readingSectionTitles(product: CreditReadingProduct): string[] {
  return [KEY_TITLE[product], "오행이 건네는 조언", "운의 계절", "당신에게 드러나는 방식", LLM_SECTION_TITLE];
}

/** 4종 공통 조립 — ①~④. LLM 문단(⑤)은 액션이 성공 시에만 덧붙인다. */
export function assembleCreditReading(
  product: CreditReadingProduct,
  ctx: ProfileContext,
  nickname: string,
  age: number | null,
): InterpretationSection[] {
  const cat = dominantCategory(ctx.tenGods);
  return [
    { title: KEY_TITLE[product], body: `${nickname}님, ${KEY_TEXT[product][cat]}` },
    { title: "오행이 건네는 조언", body: ELEMENT_BALANCE_TEXT(ctx.elements) },
    { title: "운의 계절", body: `${FLOW_INTRO[product]} ${daeunSeasonBody(ctx, age)}` },
    {
      title: "당신에게 드러나는 방식",
      body: `${AUX_TEXT[product][ctx.mbti.axes.EI]} ${BLOOD_CLOSE[ctx.blood.type]}`,
    },
  ];
}

/** 유료 LLM 개인화 요청문 — 템플릿 결론 위에서 다듬기만, 새 단정 금지(§5.4). */
export function creditReadingPrompt(
  product: CreditReadingProduct,
  ctx: ProfileContext,
  sections: InterpretationSection[],
): string {
  return [
    `[${PRODUCT_LABEL[product]} 풀이 · 유료 개인화]`,
    ...sections.map((s) => `${s.title}: ${s.body}`),
    `위 ${PRODUCT_LABEL[product]} 풀이의 결 위에서, 이 사람에게 지금 가장 와닿을 구체적인 조언을`,
    "3~4문장으로 들려줘요. 위 문장을 반복하지 말고, 새로운 단정을 만들지 말고, 결을 이어서 다듬어줘요.",
  ].join("\n");
}

/** 테스트 전용 — 전 카피 톤 검사용 평면 목록. 런타임 사용 금지. */
export const __TEXT_FOR_TEST: string[] = [
  ...Object.values(KEY_TEXT).flatMap((m) => Object.values(m)),
  ...Object.values(AUX_TEXT).flatMap((m) => Object.values(m)),
  ...Object.values(BLOOD_CLOSE),
  ...Object.values(FLOW_INTRO),
  ...Object.values(KEY_TITLE),
];
```

- [ ] **Step 4: 통과 확인 후 검증·커밋**

Run: `npx vitest run src/lib/interpret/content/credit-readings.test.ts` → PASS (5 tests)

```bash
npm run verify
git add src/lib/interpret/content/credit-readings.ts src/lib/interpret/content/credit-readings.test.ts
git commit -m "feat(interpret): 크레딧 풀이 4종 조립 — 십성 5갈래×상품 카피·위계·톤 가드"
```

---

### Task 3: `unlockReading` 서버 액션

**Files:**
- Create: `src/lib/readings/actions.ts`
- Modify: `src/lib/metrics/names.ts` (SERVER_EVENTS에 `"reading_unlock"` 추가 — `"inquiry_submit"` 줄 아래)

**Interfaces:**
- Consumes: `readingAccess`·`UNLIMITED`(quota), `readingInputHash`, `ensureCurrentProfile`, `assembleCreditReading`·`creditReadingPrompt`·`LLM_SECTION_TITLE`·`isCreditReadingProduct`, `respond`(`@/lib/interpret/interpret`), `OpenRouterProvider`, `consume_consult_credit` RPC, `recordEvent`, `currentDaeun`·`toKstParts`
- Produces:
  - `type UnlockResult = { ok: true; sections: InterpretationSection[]; usedCredit: boolean; remaining: number } | { ok: false; reason: "auth" | "no-profile" | "locked" | "error" }`
  - `unlockReading(productRaw: string): Promise<UnlockResult>` — 서버 액션

서버 액션은 단위 테스트 없음(기존 concern/chat 액션과 동일 원칙 — 판정 로직은 `readingAccess`·조립·해시가 이미 테스트됨). 차감·무차감 시나리오는 Task 6 스모크 체크리스트.

- [ ] **Step 1: 구현**

`src/lib/readings/actions.ts`:

```ts
"use server";

import { createServerSupabase } from "@/lib/supabase/server";
import { readingAccess, UNLIMITED, isPremium } from "@/lib/consult/quota";
import { readingInputHash } from "./hash";
import { ensureCurrentProfile } from "./ensure-profile";
import {
  LLM_SECTION_TITLE, assembleCreditReading, creditReadingPrompt, isCreditReadingProduct,
} from "@/lib/interpret/content/credit-readings";
import { respond } from "@/lib/interpret/interpret";
import { OpenRouterProvider } from "@/lib/interpret/openrouter-provider";
import { recordEvent } from "@/lib/metrics/events";
import { currentDaeun } from "@/lib/engine/daeun";
import { toKstParts } from "@/lib/engine/kst";
import { PROFILE_CONTEXT_VERSION } from "@/lib/engine/index";
import type { ProfileRow, ReadingRow } from "@/lib/db/types";
import type { InterpretationSection } from "@/lib/interpret/types";

export type UnlockResult =
  | { ok: true; sections: InterpretationSection[]; usedCredit: boolean; remaining: number }
  | { ok: false; reason: "auth" | "no-profile" | "locked" | "error" };

/**
 * 크레딧 풀이 열람(3단계 스펙 §1) — 캐시 히트=무차감, 차감은 유료 LLM 포함 생성 성공 후,
 * LLM 실패=차감·캐시 없이 템플릿본 반환(P9 §12). 레거시 프리미엄=무제한·무차감.
 */
export async function unlockReading(productRaw: string): Promise<UnlockResult> {
  if (!isCreditReadingProduct(productRaw)) return { ok: false, reason: "error" };
  const product = productRaw;

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
    const access = readingAccess(product, {
      loggedIn: true, credits, premiumUntil: profile.premium_until, now,
    });
    if (!access.allowed) return { ok: false, reason: "locked" };

    // 구버전 프로필 위에 팔지 않는다(스펙 §2)
    const ctx = await ensureCurrentProfile(supabase, profile);

    const t = toKstParts(now);
    const age = Math.max(0, t.y - Number(profile.birth_date.slice(0, 4)));
    const season = ctx.daeun ? currentDaeun(ctx.daeun, age) : null;
    const hash = readingInputHash(ctx, season?.ganzhi ?? "none");

    const remainingNow = premium ? UNLIMITED : credits;

    // 재열람 무료(P9 §6.2) — 캐시 히트는 차감 없이 그대로
    const { data: cached } = await supabase
      .from("readings").select("*")
      .eq("user_id", user.id).eq("product", product).eq("input_hash", hash)
      .gte("context_version", PROFILE_CONTEXT_VERSION)
      .maybeSingle<ReadingRow>();
    if (cached) {
      return { ok: true, sections: cached.sections, usedCredit: false, remaining: remainingNow };
    }

    const sections = assembleCreditReading(product, ctx, profile.nickname, age);

    // 유료 LLM 개인화 — 실패하면 아래 폴백으로
    const r = await respond(
      {
        profile: ctx, nickname: profile.nickname, history: [],
        message: creditReadingPrompt(product, ctx, sections),
      },
      { template: { chat: async () => "" }, llm: new OpenRouterProvider({ premium: true }) },
    );

    if (r.source === "llm" && r.text) {
      const full = [...sections, { title: LLM_SECTION_TITLE, body: r.text }];
      await supabase.from("readings").insert({
        user_id: user.id, product, input_hash: hash,
        context_version: PROFILE_CONTEXT_VERSION, sections: full,
      });
      let remaining = remainingNow;
      if (access.consumesCredit) {
        const { data: after } = await supabase.rpc("consume_consult_credit");
        if (typeof after === "number") remaining = after;
      }
      await recordEvent("reading_unlock", { product, source: "llm" });
      return { ok: true, sections: full, usedCredit: access.consumesCredit, remaining };
    }

    // 유료 LLM 실패 — 차감·캐시 없이 템플릿본(P9 §12). 다음 시도에서 재생성된다.
    await recordEvent("reading_unlock", { product, source: "template" });
    return { ok: true, sections, usedCredit: false, remaining: remainingNow };
  } catch {
    return { ok: false, reason: "error" };
  }
}
```

(참고: `respond`의 정확한 입력·옵션 형태는 `src/lib/concern/actions.ts:73-84`의 기존 사용례를 그대로 따른다 — 다르면 액션 쪽을 그 사용례에 맞추고 보고한다.)

`src/lib/metrics/names.ts` SERVER_EVENTS에 추가:

```ts
  "reading_unlock", // 3단계 크레딧 풀이 열람(생성)
```

- [ ] **Step 2: 검증·커밋**

Run: `npm run verify` → 통과

```bash
git add src/lib/readings/actions.ts src/lib/metrics/names.ts
git commit -m "feat(readings): unlockReading — 캐시 무차감·성공 후 차감·LLM 실패 시 무차감(P9 §12)"
```

---

### Task 4: 잠금 화면 컴포넌트 (`ReadingPeek` · `UnlockReading`)

**Files:**
- Create: `src/components/saju/ReadingPeek.tsx` / Test: `src/components/saju/ReadingPeek.test.tsx`
- Create: `src/components/saju/UnlockReading.tsx` / Test: `src/components/saju/UnlockReading.test.tsx`

**Interfaces:**
- Consumes: `readingSectionTitles`·`isCreditReadingProduct`류는 페이지가 조합 — 컴포넌트는 순수 props
- Produces:
  - `ReadingPeek({ titles }: { titles: string[] })` — 제목 목록만 잠금 카드로(본문 비노출)
  - `UnlockReading({ product, remaining, unlimited }: { product: string; remaining: number; unlimited: boolean })` — 클라이언트. 열기 버튼 → `unlockReading` 액션 → 결과 섹션 렌더. `remaining === 0 && !unlimited`이면 버튼 대신 충전 링크(`/premium/credits`).

- [ ] **Step 1: 실패하는 테스트 작성**

`src/components/saju/ReadingPeek.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import ReadingPeek from "./ReadingPeek";

describe("ReadingPeek (P9 §5.1 — 제목만 공개)", () => {
  it("제목 목록을 잠금 카드로 렌더하고 본문 자리표시자는 aria-hidden", () => {
    const { container } = render(<ReadingPeek titles={["일의 결", "운의 계절"]} />);
    expect(screen.getByText("일의 결")).toBeInTheDocument();
    expect(screen.getByText("운의 계절")).toBeInTheDocument();
    const bars = container.querySelectorAll(".teaser-bar");
    expect(bars.length).toBeGreaterThan(0);
    for (const bar of bars) expect(bar).toHaveAttribute("aria-hidden");
  });
});
```

`src/components/saju/UnlockReading.test.tsx`:

```tsx
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import UnlockReading from "./UnlockReading";
import { unlockReading } from "@/lib/readings/actions";

vi.mock("@/lib/readings/actions", () => ({ unlockReading: vi.fn() }));

describe("UnlockReading (3단계 스펙 §4)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("크레딧 있으면 열기 버튼·잔여 표시", () => {
    render(<UnlockReading product="career" remaining={3} unlimited={false} />);
    expect(screen.getByRole("button", { name: /크레딧 1개로 열기/ })).toBeInTheDocument();
    expect(screen.getByText(/남은 크레딧 3개/)).toBeInTheDocument();
  });

  it("크레딧 0이면 버튼 대신 충전 링크", () => {
    render(<UnlockReading product="career" remaining={0} unlimited={false} />);
    expect(screen.queryByRole("button", { name: /크레딧 1개로 열기/ })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /크레딧 채우기/ })).toHaveAttribute(
      "href", "/premium/credits",
    );
  });

  it("레거시 프리미엄이면 차감 안내 없이 열기 버튼", () => {
    render(<UnlockReading product="career" remaining={-1} unlimited />);
    expect(screen.getByRole("button", { name: /지금 열어보기/ })).toBeInTheDocument();
  });

  it("열기 성공 → 반환된 섹션을 렌더한다", async () => {
    vi.mocked(unlockReading).mockResolvedValue({
      ok: true, usedCredit: true, remaining: 2,
      sections: [{ title: "일의 결", body: "새벽님, 일에서 당신은..." }],
    });
    render(<UnlockReading product="career" remaining={3} unlimited={false} />);
    fireEvent.click(screen.getByRole("button", { name: /크레딧 1개로 열기/ }));
    expect(await screen.findByText("일의 결")).toBeInTheDocument();
    expect(screen.getByText(/새벽님/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /크레딧 1개로 열기/ })).not.toBeInTheDocument();
  });

  it("실패 → 부드러운 오류 안내, 버튼 유지", async () => {
    vi.mocked(unlockReading).mockResolvedValue({ ok: false, reason: "error" });
    render(<UnlockReading product="career" remaining={3} unlimited={false} />);
    fireEvent.click(screen.getByRole("button", { name: /크레딧 1개로 열기/ }));
    expect(await screen.findByText(/지금은 풀이가 어려워요/)).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /크레딧 1개로 열기/ })).not.toBeDisabled(),
    );
  });
});
```

- [ ] **Step 2: 실패 확인 후 구현**

Run: `npx vitest run src/components/saju/ReadingPeek.test.tsx src/components/saju/UnlockReading.test.tsx` → FAIL (모듈 없음)

`src/components/saju/ReadingPeek.tsx`:

```tsx
// 잠금 화면 공용(P9 §5.1) — 실제 섹션 제목만 공개, 본문은 서버가 만들지도 보내지도 않는다.
export default function ReadingPeek({ titles }: { titles: string[] }) {
  return (
    <div className="mt-5 flex flex-col gap-3" aria-label="잠긴 풀이">
      {titles.map((t) => (
        <div key={t} className="rounded-card bg-warm-surface p-5">
          <p className="flex items-center gap-2 text-sm font-medium text-text-main">
            <span aria-hidden>🔒</span> {t}
          </p>
          <div className="mt-3 space-y-2">
            <div aria-hidden className="teaser-bar h-3 w-11/12 rounded-full bg-text-soft/15 blur-[2px]" />
            <div aria-hidden className="teaser-bar h-3 w-2/3 rounded-full bg-text-soft/15 blur-[2px]" />
          </div>
        </div>
      ))}
    </div>
  );
}
```

`src/components/saju/UnlockReading.tsx`:

```tsx
"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { unlockReading } from "@/lib/readings/actions";
import type { InterpretationSection } from "@/lib/interpret/types";

/**
 * 크레딧 풀이 열기(3단계 스펙 §4) — 성공 시 결과 섹션을 이 자리에서 렌더한다.
 * (LLM 실패로 비캐시 템플릿본이 와도 같은 경로 — 사용자에게 실패를 보이지 않는다.)
 * 재방문은 서버 캐시 히트로 페이지가 직접 렌더한다.
 */
export default function UnlockReading({
  product,
  remaining,
  unlimited,
}: {
  product: string;
  remaining: number;
  unlimited: boolean;
}) {
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
          이 풀이는 크레딧 1개로 열 수 있어요. 지금은 남은 크레딧이 없네요.
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

  const open = () => {
    setError(false);
    startTransition(async () => {
      const r = await unlockReading(product);
      if (r.ok) setSections(r.sections);
      else setError(true);
    });
  };

  return (
    <div className="mt-5 text-center">
      <button
        type="button"
        onClick={open}
        disabled={pending}
        className="press w-full rounded-card bg-accent-coral py-3.5 font-medium text-white disabled:opacity-40"
      >
        {pending ? "풀이를 준비하는 중…" : unlimited ? "지금 열어보기 ✨" : "크레딧 1개로 열기 ✨"}
      </button>
      {!unlimited && (
        <p className="mt-2 text-xs text-text-soft">
          남은 크레딧 {remaining}개 · 한 번 연 풀이는 다시 볼 때 무료예요.
        </p>
      )}
      {error && (
        <p className="mt-2 text-sm text-accent-coral">
          지금은 풀이가 어려워요. 잠시 뒤 다시 시도해 주시면 크레딧은 그대로예요.
        </p>
      )}
    </div>
  );
}
```

- [ ] **Step 3: 통과 확인 후 검증·커밋**

Run: 두 테스트 파일 → PASS (6 tests)

```bash
npm run verify
git add src/components/saju/ReadingPeek.tsx src/components/saju/ReadingPeek.test.tsx src/components/saju/UnlockReading.tsx src/components/saju/UnlockReading.test.tsx
git commit -m "feat(saju): 잠금 화면 공용 컴포넌트 — 제목만 엿보기·크레딧 열기/충전 분기"
```

---

### Task 5: `/saju/[product]` 페이지 + 카탈로그 live 전환

**Files:**
- Create: `src/app/(tabs)/saju/[product]/page.tsx`
- Modify: `src/app/(tabs)/saju/chongun/page.tsx` (`const ctx = profile.profile_context;` → `const ctx = await ensureCurrentProfile(supabase, profile);` + import)
- Modify: `src/lib/persona/products.ts` (career·love·wealth·marriage → `status:"live"`, `href:"/saju/<id>"`)
- Modify: `src/lib/persona/products.test.ts` (1단계 연결 테스트 기대값 갱신)
- Modify: `src/app/(tabs)/saju/page.test.tsx` (live 링크 6개·"곧 만나요" 0개)
- Modify: `src/components/home/PersonaCard.test.tsx` (soon 픽스처를 카탈로그 조회 대신 리터럴 Product로)

**Interfaces:**
- Consumes: Task 1~4 전부, `readingAccess`, `readingInputHash`, `readingSectionTitles`, `PRODUCTS`(메타), `PERSONAS`
- Produces: `/saju/career` `/saju/love` `/saju/wealth` `/saju/marriage`

- [ ] **Step 1: 테스트 기대값 갱신(실패 유도)**

`src/lib/persona/products.test.ts` 1단계 연결 테스트를:

```ts
    expect(href).toEqual({
      today: "live:/today", chongun: "live:/saju/chongun", match: "live:/match",
      career: "live:/saju/career", love: "live:/saju/love",
      wealth: "live:/saju/wealth", marriage: "live:/saju/marriage",
    });
```

`src/app/(tabs)/saju/page.test.tsx`:

```tsx
  it("전 풀이 live — 총운·직업·연애·재물·궁합·결혼 링크", () => {
    render(<SajuPage />);
    const hrefs = screen.getAllByRole("link").map((a) => a.getAttribute("href"));
    expect(hrefs).toEqual([
      "/saju/chongun", "/saju/career", "/saju/love", "/saju/wealth", "/match", "/saju/marriage",
    ]);
    expect(screen.queryByText("곧 만나요")).not.toBeInTheDocument();
  });
```

`src/components/home/PersonaCard.test.tsx`의 soon 픽스처를 리터럴로(카탈로그에 soon이 사라지므로):

```tsx
import { PRODUCTS, type Product } from "@/lib/persona/products";

const profileDeep = PRODUCTS.find((p) => p.id === "chongun")!;
const soonProduct: Product = {
  id: "career", title: "직업운", tagline: "일과 재능의 결이 흐르는 방향",
  personaId: "seoon", access: "credit", href: "", status: "soon",
};
```

(테스트 본문에서 `fate` 변수 대신 `soonProduct` 사용, live href 단언은 chongun의 `/saju/chongun`으로.)

Run: 세 테스트 → FAIL

- [ ] **Step 2: 카탈로그 갱신**

`src/lib/persona/products.ts` — career·love·wealth·marriage 4항목을 `href: "/saju/career"` 등, `status: "live"`로.

Run: 위 테스트 → PASS

- [ ] **Step 3: 동적 페이지 구현**

`src/app/(tabs)/saju/[product]/page.tsx`:

```tsx
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createServerSupabase } from "@/lib/supabase/server";
import { readingAccess, isPremium, UNLIMITED } from "@/lib/consult/quota";
import { readingInputHash } from "@/lib/readings/hash";
import { ensureCurrentProfile } from "@/lib/readings/ensure-profile";
import {
  isCreditReadingProduct, readingSectionTitles,
} from "@/lib/interpret/content/credit-readings";
import { PROFILE_CONTEXT_VERSION } from "@/lib/engine/index";
import { currentDaeun } from "@/lib/engine/daeun";
import { toKstParts } from "@/lib/engine/kst";
import { PRODUCTS } from "@/lib/persona/products";
import { PERSONAS } from "@/lib/persona/personas";
import ReadingPeek from "@/components/saju/ReadingPeek";
import UnlockReading from "@/components/saju/UnlockReading";
import type { ProfileRow, ReadingRow } from "@/lib/db/types";

export const metadata: Metadata = { title: "사주 풀이 — 옴니마인드" };
export const dynamic = "force-dynamic";

/** 크레딧 풀이 4종(3단계 스펙 §4) — 비로그인 엿보기 / 온보딩 유도 / 캐시 렌더 / 잠금+열기. */
export default async function CreditReadingPage({
  params,
}: {
  params: Promise<{ product: string }>;
}) {
  const { product } = await params;
  if (!isCreditReadingProduct(product)) notFound();

  const meta = PRODUCTS.find((p) => p.id === product)!;
  const persona = PERSONAS[meta.personaId];
  const titles = readingSectionTitles(product);

  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();

  const header = (
    <>
      <h1 className="font-[family-name:var(--font-serif-kr)] text-2xl text-primary-green">
        {meta.title}
      </h1>
      <p className="mt-1 text-sm text-text-soft">
        {persona.name} · {persona.greeting}
      </p>
    </>
  );

  // 비로그인 — 엿보기 + 로그인 CTA(본문은 이 응답에 없다)
  if (!user) {
    return (
      <main className="fade-rise p-6">
        {header}
        <ReadingPeek titles={titles} />
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
            이 풀이를 열려면 먼저 <span className="text-text-main">당신의 여덟 글자</span>가 필요해요.
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

  const now = new Date();
  const ctx = await ensureCurrentProfile(supabase, profile);
  const t = toKstParts(now);
  const age = Math.max(0, t.y - Number(profile.birth_date.slice(0, 4)));
  const season = ctx.daeun ? currentDaeun(ctx.daeun, age) : null;
  const hash = readingInputHash(ctx, season?.ganzhi ?? "none");

  // 재열람 — 캐시 히트는 차감 없이 바로 렌더(P9 §6.2)
  const { data: cached } = await supabase
    .from("readings").select("*")
    .eq("user_id", user.id).eq("product", product).eq("input_hash", hash)
    .gte("context_version", PROFILE_CONTEXT_VERSION)
    .maybeSingle<ReadingRow>();

  if (cached) {
    return (
      <main className="fade-rise p-6">
        {header}
        <div className="mt-6 space-y-4">
          {cached.sections.map((s, i) => (
            <section key={`${i}-${s.title}`} className="rounded-card bg-warm-surface p-5">
              <h2 className="font-[family-name:var(--font-serif-kr)] text-lg text-primary-green">
                {s.title}
              </h2>
              <p className="mt-2 leading-relaxed text-text-main">{s.body}</p>
            </section>
          ))}
        </div>
        <Link href="/saju" className="mt-6 block text-center text-sm text-text-soft underline">
          다른 풀이 보러 가기
        </Link>
      </main>
    );
  }

  const premium = isPremium(profile.premium_until, now);
  const credits = profile.consult_credits ?? 0;
  const access = readingAccess(product, {
    loggedIn: true, credits, premiumUntil: profile.premium_until, now,
  });

  return (
    <main className="fade-rise p-6">
      {header}
      <ReadingPeek titles={titles} />
      <UnlockReading
        product={product}
        remaining={access.allowed && !access.consumesCredit && premium ? UNLIMITED : credits}
        unlimited={premium}
      />
    </main>
  );
}
```

- [ ] **Step 4: 총운 페이지에 재계산 트리거 적용**

`src/app/(tabs)/saju/chongun/page.tsx`:
- import 추가: `import { ensureCurrentProfile } from "@/lib/readings/ensure-profile";`
- `const ctx = profile.profile_context;` → `const ctx = await ensureCurrentProfile(supabase, profile);`

- [ ] **Step 5: 검증**

Run: `npm run verify` → 통과. `npm run dev`: `/saju/career` 비로그인 엿보기(본문 없음) → 로그인+프로필+크레딧 0 → 충전 링크 → (크레딧 부여 후) 열기 → 섹션 렌더 → 재방문 시 바로 렌더.

- [ ] **Step 6: 커밋**

```bash
git add -A
git commit -m "feat(saju): 크레딧 풀이 4종 페이지 — 엿보기·열기/충전 분기·캐시 렌더·총운 재계산 적용"
```

---

### Task 6: 최종 검증 · 머지

- [ ] **Step 1:** `npm run verify` 전체 통과
- [ ] **Step 2:** 수동 스모크(로컬, Supabase에 0010 적용 상태): ① 비로그인 /saju/career — 소스에 본문 없음 ② 크레딧 0 → 충전 링크 ③ 크레딧 부여(SQL로 `update profiles set consult_credits=3`) → 열기 → 섹션+LLM 문단, `readings` 행 생성, 크레딧 2 ④ 재방문 → 즉시 렌더·크레딧 그대로(재열람 무차감) ⑤ 다른 상품 열기 → 별도 행·차감 1 ⑥ (선택) OPENROUTER 키 제거 후 열기 → 템플릿 4섹션·크레딧 그대로(LLM 실패 무차감) ⑦ 총운 페이지 정상(재계산 트리거 회귀 없음)
- [ ] **Step 3:** 전체 브랜치 리뷰 → `omni-merge`로 main 머지·push·브랜치 정리

---

## Self-Review 기록

- **스펙 커버리지(3a):** §1 파이프라인(Task 3 — 캐시 무차감·성공 후 차감·LLM 실패 무차감) · §2 재계산(Task 1 + Task 5 적용) · §3 조립(Task 2 — 위계·5갈래×4상품·톤) · §4 화면(Task 4·5 — 4상태 전부) · §6 테스트 목록 대응 · §7 비목표 준수. 3b(궁합 심층)는 별도 플랜.
- **타입 일관성:** `CreditReadingProduct`(Task 2) ⊂ `ReadingProduct`(quota, 기존) — unlockReading은 문자열 가드 후 사용. `UnlockResult.sections` ↔ UnlockReading 렌더 ↔ ReadingRow.sections 일치. `daeunSeasonBody`(Task 1) ↔ Task 2 사용부 일치.
- **위계 §3:** ①~③ 팔자, ④ 보조(마지막·"이 …"로 시작해 수식) — 테스트로 고정.
- **respond 사용례:** concern/actions.ts 패턴을 그대로 따르도록 명시(다르면 액션을 사용례에 맞춤).
- **UNLIMITED 표시:** UnlockReading은 `unlimited` prop으로 분기 — remaining이 UNLIMITED(-1)여도 문구가 깨지지 않는다(무제한이면 잔여 문구 미표시).
