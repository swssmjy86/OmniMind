# 오늘의운세 카드 · 유명인 사주 궁합 설계서

- 날짜: 2026-07-26
- 범위: 브랜치 2개 — `feat/today-share-card`, `feat/celeb-match-tab`
- 관련 문서: `2026-07-18-omnimind-4tab-ia.md`(4탭 IA), `2026-07-19-ia-stage3-credit-readings.md`(궁합 심층)

---

## 1. 오늘의운세 공유 카드 — `feat/today-share-card`

### 배경

사주 풀이 5종은 결과 하단에 `ShareSheet`(카드 미리보기 · 이미지 저장 · 공유 · PDF)를 준다.
오늘의운세는 **로그인 + 프로필 뷰에만** 카드가 붙어 있고, 비로그인 `TodayFreeFlow`에는 없다.
게스트도 개인화(일간 · 띠 · AI 이야기)를 전부 보는데 카드만 못 받는 불일치를 없앤다.

### 설계

**엔진·LLM은 서버에만** 둔다는 기존 원칙을 그대로 지킨다. 클라이언트는 서버가 내려준 값만
조합해 카드 쿼리를 만든다.

1. `src/lib/today/actions.ts` — `GuestDailyExtras`에 `dayMaster: { stem, element }` 추가.
   카드 장식 한자(`dm`/`el`)에 필요한데 지금은 넘어오지 않는다.
2. `src/lib/share/card-copy.ts` — `dailyCardQueryFromParams(p: DailyCardParams): string`을
   분리하고, 기존 `dailyCardQuery(ctx, guide, llm)`은 `dailyCardParams` → 새 함수 위임으로
   바꾼다. 클라이언트에서 `ProfileContext` 없이도 같은 쿼리를 만들 수 있게 하는 것이 목적이며,
   **쿼리 스키마와 출력 문자열은 변하지 않는다**(`/api/card?mode=daily` 무변경).
3. `src/components/today/TodayFreeFlow.tsx` — 결과 화면 하단에 `ShareSheet via="daily"
   label="오늘의 나 카드"` 추가. 쿼리는 공통 일진(props: headline/mind/color/keyword/lucky/sky)
   + 개인화(extras: personal/zodiac/story/dayMaster)로 조립한다.
4. 폴백 — `extras`가 없거나(계산 실패) `dayMaster`가 없으면 카드를 **생략**한다. 일간 심볼 없이는
   카드 스키마(`dm`/`el` 필수)를 채울 수 없고, §8 폴백 정신대로 조용히 빠진다.

### 테스트

- `card-copy.test.ts` — `dailyCardQueryFromParams(dailyCardParams(ctx, guide, llm))`가
  `dailyCardQuery(ctx, guide, llm)`과 문자열이 같음(리팩터 무해성).
- 선택 필드(sky/personal/zodiac/llm) 누락 시 쿼리에서 빠지는 기존 동작 유지.

---

## 2. 유명인 사주 궁합 — `feat/celeb-match-tab`

### 배경

보관함은 하단 탭 한 자리를 쓰지만 진입 빈도가 낮고, 오늘의운세 하단 "지난 기록 보기" 링크로
이미 접근된다. 그 자리를 사람들이 재미로 자주 여는 화면으로 바꾼다.

### 탭 교체

- `BottomNav` 4번째 탭: `보관함 📦 /archive` → `유명인궁합 💞 /celeb`
- `/archive` 라우트 · `ArchiveView` · `ArchiveLogList`는 **삭제하지 않는다**. 오늘의운세
  하단 "지난 기록 보기 (보관함)" 링크가 그대로 유지되고, 홈에도 보관함 링크 한 줄을 추가한다.
- 로그아웃 진입점은 홈 · `/me`에 이미 있어 영향 없음.

### 데이터 — `src/lib/celeb/celebrities.ts`

순수 상수 배열. 외부 API·DB 없음(월 고정비 0원 원칙 유지).

```ts
interface Celebrity {
  id: string;          // 슬러그
  name: string;
  birthDate: string;   // "YYYY-MM-DD" 양력
  region: CelebRegion;     // "kr" | "world"
  category: CelebCategory; // "music" | "actor" | "sports"
  blurb: string;       // 한 줄 소개 — 톤 가드 준수
}
```

**축은 지역 × 갈래 둘.** 국내 22명(노래 8 · 연기 8 · 스포츠 6), 해외 22명(노래 8 ·
연기 7 · 스포츠 7) — 총 44명. 젊은 층을 겨냥해 해외를 국내와 같은 규모로 키웠다.

**수록 원칙**

- 생년월일이 널리 공개된 인물만. 출생 시각은 공개되지 않으므로 **전원 시간 미상**
  (`timeUnknown: true`)으로 계산한다 — 시주 없이 년·월·일주만 본다.
- 계산 엔진의 절기 테이블이 1900~2100이므로 **1900년 이후 출생자만** 수록한다
  (세종대왕·안중근 등 근대 이전 인물은 계산 불가라 제외).
- **근대 한국인(1940년대 이전 출생)은 담지 않는다.** 공식 기록이 음력인 경우가 많은데
  엔진은 양력 입력을 전제하므로, 음력 날짜를 그대로 넣으면 월주가 통째로 어긋난다.
  이 위험 때문에 초안의 "길을 낸 사람"(정주영·이건희·백남준·반기문)을 통째로 뺐다.
- 해외 인물은 출생지 시간대 차이로 일주가 하루 어긋날 수 있다. 시각 미상이라 어차피
  근사치이며, 화면 하단 고지에 이 한계를 밝힌다.

### 화면 — `/celeb` (tabs 그룹, 페르소나 = 연리)

1. 지역 칩(국내·해외) → 갈래 칩(노래·연기·스포츠) → 유명인 리스트
2. 인물을 고르면 궁합 결과(섹션 카드) — 기존 궁합 심층과 동일한 렌더
3. 목록에 없으면 "직접 입력" → 기존 `MatchDeepForm` 흐름 그대로

### 계산

**새 엔진 없음.** 기존 궁합 경로를 그대로 재사용한다.

- 로그인: `unlockMatchDeep`에 유명인 생년월일 · `timeUnknown` · 모드를 주입
- 게스트: `computeGuestMatchDeep`에 동일 주입 (localStorage draft를 내 정보로)

### 톤 가드

실존 인물을 다루므로 단정적 평가를 하지 않는다.

- ❌ "이 사람과는 안 맞아요"
- ✅ "두 분의 결이 다른 자리 — 그래서 서로 배울 게 있는 사이예요"

하단 고지: 공개된 생년월일만 사용하며 출생 시각은 알 수 없어 근사치라는 점, 재미로 보는
이야기라는 점을 한 줄로 밝힌다.

### 테스트

- `celebrities.test.ts` — 전원 1900년 이후, 국내는 1950년 이후(음력 위험 차단), 날짜 형식
  유효, id 중복 없음, 지역 × 갈래 조합이 하나도 비지 않음, 소개 문구 톤 가드 통과,
  전원 시간 미상으로 사주가 세워짐
- `BottomNav.test.tsx` — 보관함 탭이 사라지고 유명인궁합 탭이 있음
- `/celeb` 페이지 렌더 스모크

---

## 3. 하지 않는 것 (YAGNI)

- 유명인 DB 테이블 · 관리 화면 (상수로 충분)
- 유명인 궁합 전용 해석 템플릿 (기존 궁합 심층 문구 재사용)
- 보관함 기능 삭제 (라우트는 유지)
- `/api/card` 파라미터 스키마 변경
