# OmniMind iOS — App Store 제출 준비 (RELEASE.md)

이 문서는 `ios/` WebView 래퍼 앱을 App Store Connect에 제출할 때 그대로 쓰는 참고 자료다.
웹 서비스(`src/`)는 이 작업으로 전혀 변경되지 않았다 — 앱은 프로덕션 사이트
(`https://omni-mind-i6uj.vercel.app`)를 `WKWebView`로 감싼 얇은 네이티브 셸이다.

- 번들 ID: `com.omnimind.app` (앱), `com.omnimind.app.widget` (위젯 익스텐션)
- 표시 이름: 옴니마인드
- 최소 iOS: 16.0, 대상 기기: iPhone only (`TARGETED_DEVICE_FAMILY: "1"`, iPad 미지원)

---

## 1. App Privacy 응답 (App Store Connect → App Privacy)

OmniMind는 **완전 익명 서비스**(2026-08-01)다. 로그인·계정·결제가 없고, 프로필(생년월일시·성별·
MBTI·혈액형·닉네임)과 마음·고민 기록은 이용자 **기기의 `WKWebView` `localStorage`에만** 저장되며
서버에 전송·수집되지 않는다. 따라서 App Privacy 설문의 기본값은 대부분 **"Data Not Collected"**다.

### 기본: Data Not Collected로 답할 항목
- Contact Info, Health & Fitness, Financial Info, Location, User Content(프로필·고민·채팅 기록은
  기기에만 있고 서버로 전송되지 않음), Identifiers(계정 없음), Browsing History, Search History,
  Purchases — 전부 수집 없음.

> 예외: 마음/고민 텍스트와 사주 프로필 맥락은 **LLM 문장 생성을 위해 OpenRouter(미국)로 전송**되지만
> 서버(Supabase)에 저장되지 않고 응답 생성 후 폐기된다(`src/app/privacy` §3 국외 이전 항목 참고).
> App Privacy 설문의 "Data Collected" 기준은 **저장·연결 여부**이므로, 저장하지 않는 일시적 프록시
> 전송은 일반적으로 "수집"으로 신고하지 않는다 — 다만 최종 판단은 제출 시점 담당자가 Apple 가이드
> 문구를 다시 확인할 것.

### 판정이 필요한 예외 2건

**① Vercel/Supabase 익명 지표(events) — 코드 실사 결과: 현재 활성 상태(활성 신고 권장)**

`src/lib/metrics/events.ts`의 `recordEvent()`가 `events` 테이블에 `user_id: null`로 익명 insert를
수행하며, `src/components/share/ShareSheet.tsx`가 `card_open`/`card_share`/`card_copy_link` 이벤트를
실제로 호출하고 있다(코드 경로 확인 완료, 2026-08-06 기준). 유입 추적 쿠키(`om_ref`)가 있으면
`ref`/`via`를 병합하지만 사용자 식별자(user_id, 기기 ID)는 없다.

→ **"Analytics" 데이터 타입으로 신고 권장**, 단 **"Linked to You": No**, **"Used for Tracking": No**
(계정·기기 식별자로 개인에게 연결되지 않음, 제3자 트래킹 SDK 아님, 단일 앱 내부 익명 카운터).
Vercel 자체 애널리틱스가 별도로 켜져 있다면 그것도 동일 기준으로 함께 신고할 것 — 제출 시점에
Vercel 프로젝트 설정(Analytics 탭)을 다시 확인해 실제 활성 여부를 재확인한다(코드는 항상 이벤트를
시도하지만, Vercel 대시보드의 Web Analytics 토글은 이 리포지토리 밖의 설정이라 여기서 확정할 수
없다).

**② 카카오 AdFit 광고 — 조건부 활성(환경변수 의존, 제출 시점 재확인 필요)**

`src/components/ads/AdSlot.tsx`는 `NEXT_PUBLIC_ADFIT_UNIT` 환경변수가 설정된 경우에만 데일리 화면
하단에 카카오 AdFit 배너(`kas/static/ba.min.js`)를 로드한다. 값이 없으면 아무것도 렌더링하지 않는다.
이 값은 Vercel 프로젝트 환경변수(레포 밖)이므로 **제출 시점에 Vercel 대시보드에서 실제 설정 여부를
확인**해야 한다.

- **`NEXT_PUBLIC_ADFIT_UNIT`이 설정되어 있다면** → App Privacy에 **"Third-Party Advertising"**
  데이터 타입 신고 필요(광고 노출을 위해 페이지/광고 슬롯 정보가 카카오 AdFit으로 전달됨).
- 이것은 **WKWebView 안에서 표시되는 웹 배너 광고**이며, 네이티브 광고 SDK(iOS SDK 임베드)가 아니다.
  → **IDFA 수집도, App Tracking Transparency(ATT) 프롬프트도 필요 없다.** 네이티브 코드 어디에도
  광고 SDK가 링크되어 있지 않음(이 리포지토리의 `ios/` 소스 전체를 확인 — 광고 관련 import/SDK
  없음).
- **`NEXT_PUBLIC_ADFIT_UNIT`이 비어 있다면** → 이 항목은 신고하지 않는다(광고가 아예 렌더되지 않음).

### App Privacy 요약 표

| 데이터 타입 | 수집 여부 | 비고 |
|---|---|---|
| 프로필·마음·고민 기록 | 수집 안 함 | 기기 `localStorage`에만 저장, 서버 미도달 |
| 계정 식별자 | 수집 안 함 | 로그인 없음 |
| 위치/건강/금융/연락처 | 수집 안 함 | 해당 기능 없음 |
| Analytics(익명 events) | **활성 시 수집** | 비식별, 사용자 미연결, 트래킹 아님 — ①번 확인 |
| Third-Party Advertising | **`NEXT_PUBLIC_ADFIT_UNIT` 설정 시만** | 웹 배너, IDFA/ATT 불필요 — ②번 확인 |

---

## 2. 심사 노트 (Guideline 4.2 — Minimum Functionality 대응)

App Review Notes(App Store Connect → 버전 정보 → App Review Information → Notes)에 아래 내용을
그대로 붙여넣는다(영문 권장 — 심사자는 국제 인력):

> OmniMind wraps our production web app in a native WKWebView shell, but adds native platform
> value beyond a bare browser wrapper:
> - **On-device local daily notification** — a `UNCalendarNotificationTrigger` reminder scheduled
>   entirely on-device (no push server, no account); tapping it deep-links into `/today`.
> - **Offline experience** — a native `NWPathMonitor`-driven offline screen (not a blank/broken
>   WebView) with a retry action that reloads once connectivity returns.
> - **Native share receiver** — a `WKScriptMessageHandler` bridge that can present the native iOS
>   `UIActivityViewController` share sheet for cards/results shared from the web content.
> - **Native settings screen** — a SwiftUI settings sheet (bell icon) to manage the daily
>   notification time and permission, entirely local (`UserDefaults`), no network round-trip.
> - **Home Screen widget** — a WidgetKit "오늘의 기운" (Today's Energy) widget that reads a cached
>   summary from an App Group container and falls back to a friendly "open the app" message when no
>   data is cached yet.
>
> The service is fully anonymous — there is no login, no account, and no payment anywhere in the
> app. Every feature (profile onboarding, daily reading, mind/concern chat, saju report, sharing,
> notifications, widget) is usable immediately without creating an account. Privacy Policy:
> https://omni-mind-i6uj.vercel.app/privacy

핵심 메시지: "단순 웹뷰가 아니라 로컬 알림·오프라인·네이티브 공유·네이티브 설정·홈 위젯의 5가지
네이티브 가치를 더했고, 익명 서비스라 로그인 장벽 없이 전 기능을 심사자가 바로 확인할 수 있다."

---

## 3. 지원 / 개인정보 URL

- **Support URL:** `https://omni-mind-i6uj.vercel.app/contact`
- **Privacy Policy URL:** `https://omni-mind-i6uj.vercel.app/privacy`

(둘 다 기존 웹 서비스의 페이지를 그대로 재사용 — 앱 전용 URL을 새로 만들지 않았다.)

---

## 4. 스크린샷 체크리스트

**필요 규격 (제출 시점 App Store Connect 요구사항 재확인 필수 — Apple이 주기적으로 변경함):**
- 현재(2026) 기준 가장 큰 iPhone 디스플레이 세트가 필수 — 6.9" (iPhone 17 Pro Max급, 1320×2868)가
  현행 최대 규격이다. `ios/project.yml`의 `TARGETED_DEVICE_FAMILY: "1"`(iPhone only)이므로 iPad
  스크린샷은 불필요.
- 이 저장소의 CI/검증 시뮬레이터는 "iPhone 17"(부팅 상태 확인됨) — 스크린샷은 iPhone 17 계열
  시뮬레이터(17 / 17 Pro / 17 Pro Max)에서 촬영하면 된다.

**5개 상태(브리프 지정) — 각 상태별 캡처:**

| # | 화면 | 캡처 포인트 |
|---|------|-------------|
| 1 | 홈(오늘) | 앱 콜드 런치 → 오늘의 기운 화면, 데일리 카드가 로드된 상태 |
| 2 | 프로필(나) | `/me` — 온보딩 완료 후 사주·MBTI·혈액형·별자리 종합 프로필 |
| 3 | 알림 설정 | 우상단 종 아이콘 탭 → `SettingsView` 시트, 토글 ON + `DatePicker` 노출 상태 |
| 4 | 오프라인 | 기기/시뮬레이터 네트워크 차단 → `OfflineView`("잠시 길을 잃었어요") |
| 5 | 위젯 | 홈 화면에 "오늘의 기운" 위젯을 배치한 SpringBoard 캡처(실제 값 또는 폴백 카피) |

각 캡처는 마케팅 카피 오버레이 없이 **실제 UI 스크린샷**으로 준비하고, App Store Connect에
순서대로 업로드한다(1~2번이 첫인상이므로 앞쪽 순서 권장).

---

## 5. 버전 / 빌드 규칙

- `MARKETING_VERSION`: `1.0.0` (첫 제출). `ios/project.yml`의 최상위 `settings.base`에서 앱·위젯
  타깃 공통 적용(Task 9에서 두 타깃 버전 드리프트를 수정해 정렬 완료).
- `CURRENT_PROJECT_VERSION`: `1`. **매 App Store Connect 업로드(같은 마케팅 버전 재제출 포함)마다
  1씩 증가**시킨다 — Apple은 동일 빌드 번호 재업로드를 거부한다.
- 마케팅 버전을 올릴 때(1.0.0 → 1.0.1/1.1.0 등)는 빌드 번호를 1로 되돌리지 않아도 되지만, 팀
  컨벤션상 새 마케팅 버전의 첫 빌드에서 `CURRENT_PROJECT_VERSION`을 그대로 이어서 증가시킨다(예:
  1.0.0 build 3 다음 1.0.1은 build 4부터).
- 두 값 모두 `ios/project.yml` 최상위에서만 바꾸면 `xcodegen generate` 후 앱·위젯 Info.plist에
  동일하게 반영된다(`$(MARKETING_VERSION)`/`$(CURRENT_PROJECT_VERSION)` 참조 — Task 9에서 확정한
  구조, 개별 `Info.plist`를 직접 편집하지 말 것. 편집해도 다음 `xcodegen generate`에서 되돌아간다).

---

## 6. 서명 (Signing)

1. Xcode에서 `ios/OmniMind.xcodeproj` 오픈(`cd ios && xcodegen generate`로 먼저 생성).
2. `OmniMind` 및 `OmniMindWidget` 두 타깃 모두 **Signing & Capabilities**에서:
   - Team: 실제 Apple Developer 팀 선택(현재 `project.yml`의 `DEVELOPMENT_TEAM: ""`는 빈 값 —
     로컬에서 팀 ID를 채우거나 Xcode UI에서 직접 선택. **레포에는 팀 ID를 커밋하지 않는다**, 각자
     로컬 오버라이드로 관리).
   - Automatically manage signing: 체크.
3. App Store Connect에서 앱 등록:
   - Bundle ID `com.omnimind.app` 등록(Identifiers).
   - Bundle ID `com.omnimind.app.widget` 등록, **App Group** capability에
     `group.com.omnimind.app` 포함(위젯 데이터 공유에 필수 — `ios/OmniMind/OmniMind.entitlements`,
     `ios/OmniMindWidget/OmniMindWidget.entitlements`와 동일해야 함).
   - App Group `group.com.omnimind.app` 자체도 Identifiers에서 미리 등록.
4. 새 앱(New App) 생성 시 Bundle ID로 `com.omnimind.app` 선택, SKU/이름 입력, 위 1~3항 URL/개인정보
   입력.

---

## 7. 웹 회귀 게이트 — `npm run verify` 결과

브리프 지시대로 `src/`는 이번 작업에서 전혀 건드리지 않았고, `npm run verify`(lint → typecheck →
test → build)를 저장소 루트에서 실행해 통과를 확인했다.

**한 가지 발견 사항(투명하게 기록):** 첫 실행에서 `eslint`가 저장소 루트에 우연히 생성된 로컬
Obsidian 볼트 폴더(`.obsidian/`, git 미추적·gitignore 미등록·`src/`와 무관한 개인 도구 산출물)의
플러그인 JS 파일을 스캔해 `require()` 금지 규칙 위반 1건으로 실패했다. 이는 `src/`나 이 브랜치의
어떤 작업 결과도 아니고, 저장소 루트에서 우연히 열린 무관한 파일이 프로젝트 lint 스코프 밖이어야
했을 뿐이다. `.gitignore`에 `.obsidian/`을 추가하고 `eslint.config.mjs`의 `globalIgnores`에
`.obsidian/**`를 추가해(둘 다 `src/` 밖, 프로젝트 설정 파일) 스캔 대상에서 제외한 뒤 재실행하니
아래처럼 완전히 깨끗하게 통과했다. `src/` 코드 자체는 이 예외 처리와 무관하게 원래도 에러 0건이었다
(스코프를 좁혀 재확인 완료).

```
$ npm run verify
> omnimind@0.1.0 verify
> npm run lint && npm run typecheck && npm run test && npm run build

> lint
> eslint
(문제 없음 — clean)

> typecheck
> tsc --noEmit
(문제 없음 — clean)

> test
> vitest run
 Test Files  86 passed (86)
      Tests  658 passed (658)
   Duration  13.08s

> build
> next build
▲ Next.js 16.2.10 (Turbopack)
✓ Compiled successfully in 3.3s
✓ Generating static pages using 9 workers (21/21) in 339ms
```

**결과: 통과.** 웹 서비스는 이번 iOS 작업으로 인한 어떤 회귀도 없다.

---

## 8. 수동 검증 매트릭스 (사람이 기기/시뮬레이터에서 1회 완주)

아래는 이 개발 환경(샌드박스)에서 자동화할 수 없었던 항목들이다 — 접근성 자동화(idb 등)가
WKWebView 내부 콘텐츠에 닿지 않고, 알림 발화/실기기 권한 프롬프트/홈 화면 위젯 배치는 사람의 상호
작용이 필요하다. 제출 전 실기기(권장) 또는 시뮬레이터에서 아래를 체크한다.

- [ ] **콜드 런치** — 앱을 완전히 종료된 상태에서 실행 → 프로덕션 사이트가 로드된다.
- [ ] **주요 플로우** — 온보딩(생년월일시·MBTI·혈액형 입력) → 오늘(`/today`) → 마음(`/mind`) →
      사주(`/saju`) 결과 화면까지 WKWebView 안에서 정상 동작.
- [ ] **오프라인 → 재연결 복구** (Task 3 — 이 환경에서 실기기 네트워크 토글로 라이브 검증되지 않음)
      — 기기/시뮬레이터 네트워크를 끈다 → 브랜드 `OfflineView`("잠시 길을 잃었어요")가 표시되는지
      확인 → 네트워크를 복구하고 재시도 버튼(또는 자동 복구)으로 웹뷰가 다시 로드되는지 확인.
- [ ] **알림 권한 → 스케줄 → 발화 → 탭 → `/today` 딥링크** (Task 5) — 종 아이콘 → 알림 토글 ON →
      권한 허용 → 시각 설정(테스트 편의상 1~2분 뒤로) → 앱을 백그라운드로 보냄 → 알림 수신 확인 →
      알림 탭 → 앱이 `/today`로 딥링크되는지 확인.
- [ ] **공유 시트** — 사주 결과/카드 화면에서 "공유하기" 탭 → 네이티브 iOS 공유 시트가 뜨는지 확인.
      **Task 6에서 미확정으로 남긴 핵심 질문:** 이 WKWebView(순정, RN WebView 등 커스텀 브리지
      없음)에서 웹의 `navigator.share` 호출이 **이미** 네이티브 시트를 띄우는지 실측으로 확정한다.
      - 뜬다면 → `ios/OmniMind/Share/ShareCoordinator.swift` + `omniShare` 메시지 핸들러(이미
        구현·테스트 완료, `WebContainer.swift`에 배선됨)는 **불필요한 대기 상태로 유지**해도 무방
        (무해하며 웹이 `postMessage`하지 않는 한 절대 발화하지 않음) — 이연됐던 웹 shim
        (`window.webkit.messageHandlers.omniShare` 분기, `src/components/share/ShareSheet.tsx`)은
        **적용하지 않는다**.
      - 안 뜬다면 → 웹 shim이 필요하다는 뜻이므로, 별도 승인을 받아 최소 변경으로 추가하고
        `npm run verify`가 다시 통과하는지 확인한 뒤 반영한다(이번 태스크 범위 밖 — 이 문서에
        발견 사항만 기록해 다음 작업으로 넘긴다).
- [ ] **앱 재실행 후 localStorage 유지** — 온보딩으로 프로필을 만든 뒤 앱을 완전히 종료 → 재실행 →
      프로필/마음 기록이 그대로 남아 있는지 확인(`WKWebsiteDataStore.default()`가 영속 저장소를
      쓰므로 유지되어야 함).
- [ ] **외부 링크 → Safari** — 웹 안의 외부 도메인 링크(예: 문의 메일, 외부 공유 대상)를 탭했을 때
      앱 안이 아니라 Safari로 열리는지 확인(`AppConfig.isExternalNavigation` 라우팅).
- [ ] **위젯 값/폴백 표시** (Task 8) — 홈 화면 길게 눌러 위젯 갤러리 → "오늘의 기운" 검색 → 추가 →
      (a) 앱을 한 번 열어 오늘 데이터를 캐시한 뒤 위젯이 실제 헤드라인을 보여주는지, (b) 캐시가 없는
      상태에서 폴백 카피("앱을 열어 오늘의 기운을 확인하세요")가 보이는지 둘 다 확인.
- [ ] **아이콘/표시 이름 육안 재확인** (Task 9, 재확인용) —
      `sips -g hasAlpha ios/OmniMind/Resources/Assets.xcassets/AppIcon.appiconset/AppIcon-1024.png`
      → `hasAlpha: no` (알파 채널 있으면 App Store Connect가 업로드를 거부한다). 홈 화면 아이콘
      아래 표시 이름이 "옴니마인드"(한글)로 렌더되는지 육안 확인.

### Xcode 빌드/테스트 게이트 (자동화 완료 — 이번 태스크에서 재확인)

```
$ cd ios && xcodegen generate
Created project at /Users/swssmjy86/OmniMind/ios/OmniMind.xcodeproj

$ xcodebuild -project OmniMind.xcodeproj -scheme OmniMind \
    -destination "platform=iOS Simulator,name=iPhone 17" test
Test Suite 'OmniMindTests.xctest' passed — Executed 19 tests, with 0 failures
  (AppConfigTests ×5, NotificationContentTests ×1, NotificationSettingsTests ×2,
   ReachabilityMonitorTests ×3, SharePayloadTests ×3, WebViewModelTests ×3, WidgetDataStoreTests ×2)
Test Suite 'OmniMindUITests.xctest' passed — Executed 1 test (LaunchSmokeTests), with 0 failures
** TEST SUCCEEDED **
```

`sips -g hasAlpha` 확인(재검증):
```
$ sips -g hasAlpha ios/OmniMind/Resources/Assets.xcassets/AppIcon.appiconset/AppIcon-1024.png
  hasAlpha: no
```

---

## 9. 아직 확정되지 않은 것 (다음 작업/제출 담당자에게 인계)

- **공유 시트 실측**(§8 항목) — 이 코드베이스는 순정 WKWebView + 표준 `navigator.share`이므로
  네이티브 시트가 뜰 가능성이 높다는 정황 조사(Task 6)는 있지만, 실기기 탭 확인은 아직 없다.
- **Vercel Web Analytics 활성 여부**, **`NEXT_PUBLIC_ADFIT_UNIT` 설정 여부** — 둘 다 레포 밖(Vercel
  프로젝트 설정)이라 이 문서 작성 시점 코드 조사로는 "코드 경로가 활성 상태로 구현돼 있다/조건부로
  구현돼 있다"까지만 확인 가능했다. App Privacy 제출 직전 Vercel 대시보드에서 최종 확인할 것.
- **DEVELOPMENT_TEAM** — `project.yml`에는 빈 문자열로 남아 있다(의도적 — 팀 ID는 레포에 커밋하지
  않음). 실제 서명 전 로컬에서 채우거나 Xcode UI에서 선택.
