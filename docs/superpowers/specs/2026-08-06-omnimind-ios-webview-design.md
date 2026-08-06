# OmniMind iOS 앱 전환 설계서 — WebView 래퍼

- 작성일: 2026-08-06
- 상태: 설계 확정(구현 대기)
- 대상: 기존 OmniMind 웹 서비스(Next.js, Vercel)를 손대지 않고 Xcode 기반 iOS 네이티브 앱으로 전환
- 관련 문서: `CLAUDE.md`(현재 서비스의 단일 진실 — 완전 익명·2026-08-01 피벗 반영), `2026-07-13-omnimind-design.md`(원본 웹 설계서 — **로그인·결제·구독 등 익명 피벗 이전 내용이라 현재와 어긋남에 유의**), `2026-07-18-omnimind-4tab-ia.md`(4탭 IA)

> 주의: `2026-07-13-omnimind-design.md`는 CLAUDE.md가 SSOT로 지정하나, 소셜 로그인·Supabase Auth·프리미엄 구독을 전제하는 익명 피벗 이전 문서다. 현재 서비스(완전 익명·localStorage·OpenRouter)는 CLAUDE.md가 정본이며, 본 iOS 스펙은 CLAUDE.md 기준으로 작성됐다. 본 문서는 iOS 전환 계층만 다룬다.

---

## 1. 목표와 비목표

### 목표
- 기존 Vercel 웹앱(`https://omni-mind-i6uj.vercel.app`)을 **원격 로드**하는 iOS 네이티브 셸을 만든다.
- **App Store 정식 출시**를 목표로 하며, 심사 가이드라인 **4.2(최소 기능)** 반려를 피할 네이티브 가치를 얹는다.
- 프로젝트의 **월 고정비 0원·완전 익명** 원칙을 그대로 유지한다(계정·서버 사용자 데이터 없음).

### 비목표
- 웹 UI를 네이티브(SwiftUI)로 재작성하지 않는다.
- 계산 엔진(`src/lib/engine/`)을 Swift로 포팅하지 않는다.
- 기존 웹 서비스의 동작을 바꾸지 않는다(변경이 필요하면 피처 감지 가드가 걸린 **가산·무해** shim만, 사전 승인 후).
- LLM/Supabase/KASI 시크릿을 앱 번들에 넣지 않는다(서버 전용 유지).

---

## 2. 핵심 결정 사항

| 항목 | 결정 | 근거 |
|------|------|------|
| 전환 전략 | **WKWebView 래퍼**(원격 URL 로드) | 코드 100% 재사용, 유지보수 이원화 없음, 0원 유지 |
| 정적 번들 여부 | **불가 — 원격 로드만** | 서버 액션(8개)·`api/card`가 서버 의존이라 정적 export 불가 |
| 로드 URL | `https://omni-mind-i6uj.vercel.app` | 현재 프로덕션 도메인 |
| 언어/프레임워크 | Swift + SwiftUI 라이프사이클 | 최신 표준, 서드파티 의존성 회피 |
| 서드파티 의존성 | **0개**(CocoaPods/SPM 없음) | 0원·최소 유지보수 |
| 저장소 위치 | 같은 저장소 `ios/` 하위 | 웹 CI와 공존하는 모노레포 |
| 번들 ID | `com.omnimind.app` (위젯: `com.omnimind.app.widget`) | 확정 |
| 앱 표시 이름 | 옴니마인드 | 확정 |
| 최소 iOS 버전 | iOS 16.0 (WidgetKit·NWPathMonitor·최신 SwiftUI 여유) | 시장 커버리지 대비 API 안정성 |

---

## 3. 아키텍처

기존 웹앱은 그대로 두고, 네이티브 셸이 `WKWebView`로 원격 URL을 로드한다. 웹은 iOS Safari에서 돌던 것과 동일하게 동작하되, **WKWebView 전용 저장소**(Safari와 분리)에 프로필·기록을 영구 보관한다.

```
[ iOS App — com.omnimind.app (Swift/SwiftUI) ]
  RootView
   ├─ (온라인) WebContainer ──▶ WKWebView ──▶ https://omni-mind-i6uj.vercel.app
   │                                            (기존 Next.js 그대로: 서버액션·LLM·Supabase는 Vercel에서)
   └─ (오프라인) OfflineView ──▶ 재시도

  NotificationManager (UNUserNotificationCenter, 로컬 전용)
  SettingsView (알림 on/off · 시각)
  ShareCoordinator (UIActivityViewController)
  ReachabilityMonitor (NWPathMonitor)

[ Widget Extension — com.omnimind.app.widget ] (P2)
  App Group ◀── 앱이 evaluateJavaScript로 WebView localStorage(om-*) 읽어 기록
             ──▶ 위젯 타임라인이 표시
```

### 3.1 컴포넌트(독립 단위)

각 단위는 하나의 명확한 책임을 가지며 독립 테스트 가능하다.

1. **`OmniMindApp`** — SwiftUI `App` 진입점. `NotificationManager` 델리게이트 등록, `RootView` 표시.
2. **`RootView`** — `ReachabilityMonitor` 구독해 온라인이면 `WebContainer`, 오프라인이면 `OfflineView` 표시.
3. **`WebContainer`** (`UIViewRepresentable` + `Coordinator: WKNavigationDelegate, WKUIDelegate`)
   - 프로덕션 URL 로드. `WKWebsiteDataStore.default()`로 저장소 영속.
   - **링크 정책:** 앱 도메인 내부 네비게이션은 WebView 내, 외부 링크(mailto/tel/타 도메인/`target=_blank`)는 `UIApplication.open`(Safari/기본 앱).
   - **당겨서 새로고침**(`UIRefreshControl`).
   - **딥링크:** 특정 경로 로드 요청을 받아 URL 교체(알림 탭 → `/today`).
   - **에러 처리:** 로드 실패 시 `RootView`에 통보 → 오프라인/에러 화면.
4. **`ReachabilityMonitor`** (`NWPathMonitor`) — 온·오프라인 상태를 `@Published`로 노출.
5. **`OfflineView`** (SwiftUI) — 브랜드 톤(베이지/코랄/딥그린, '지적인 따뜻함' 카피)의 오프라인 안내 + 재시도 버튼.
6. **`NotificationManager`** (`UNUserNotificationCenter`)
   - 권한 요청(설정에서 사용자 액션으로 트리거).
   - **로컬** 반복 알림 스케줄(`UNCalendarNotificationTrigger`, 매일 지정 시각).
   - 알림 탭 응답 처리 → `WebContainer`에 `/today` 딥링크 요청.
7. **`SettingsView`** (SwiftUI) — 네이티브 설정: 데일리 알림 on/off, 시각 `DatePicker`. 설정값은 `UserDefaults`.
8. **`ShareCoordinator`** — 공유 인텐트 → `UIActivityViewController` 표시(§5.3 참조).
9. **(P2) `OmniWidget`** (WidgetKit) + **App Group `group.com.omnimind.app`** — 오늘의 기운 요약 표시.

### 3.2 데이터 흐름
- 앱 실행 → 온라인 확인 → WKWebView가 프로덕션 URL 로드 → 웹이 localStorage에서 프로필 읽어 클라이언트 계산 + 필요 시 Vercel 서버액션 호출(LLM/Supabase). **네이티브는 계산·시크릿에 일절 관여하지 않는다.**
- 데일리 알림: 온디바이스 스케줄 → 탭 시 앱 실행 → `/today` 로드. 서버·계정 불필요.

---

## 4. "웹 서비스는 그대로" 원칙

| 기능 | 웹 변경 | 방식 |
|------|---------|------|
| WebView 로드 | 없음 | 원격 URL 그대로 |
| 오프라인 처리 | 없음 | 네이티브 `NWPathMonitor` + `OfflineView` |
| 로컬 푸시 | 없음 | 네이티브 `UNUserNotificationCenter`만 |
| 네이티브 설정 | 없음 | 네이티브 `SettingsView` + `UserDefaults` |
| 공유 | **원칙 없음** | 우선 `navigator.share`의 WKWebView 네이티브 매핑 검증(§5.3). 실패 시에만 `window.webkit` 피처 감지 가드 shim 추가(웹에선 no-op) — **사전 승인** |
| 위젯(P2) | 없음 | 네이티브가 `evaluateJavaScript`로 `om-*` localStorage **읽기만** |

> 웹 저장 키는 `om_*`/`om-*` 접두(예: `om_first_seen`, `om-today-birth`). 위젯 구현 시 정확한 키를 코드에서 재확인해 고정한다.

---

## 5. 네이티브 기능 상세

### 5.1 로컬 푸시 알림 (4.2 통과 핵심, 서버·계정 불필요)
- `UNCalendarNotificationTrigger`로 매일 지정 시각(기본 **오전 8시**, 설정에서 변경) 반복 알림.
- 온디바이스 스케줄 → 완전 익명·0원 유지.
- **카피:** 특정 운세를 미리 계산하지 않고 달지기 보이스 티저("오늘의 기운이 도착했어요 🌙")로 앱을 `/today`로 유도. 브랜딩 톤('지적인 따뜻함') 준수.
- 권한 거부/미결정 상태를 설정 화면에서 안내(시스템 설정 딥링크 제공).

### 5.2 오프라인 처리
- `NWPathMonitor`가 연결 끊김 감지 → `OfflineView` 표시(백색 WebView 대신 브랜드 화면).
- 재연결 또는 재시도 버튼 → WebView 리로드.

### 5.3 네이티브 공유
- 1순위: WKWebView에서 웹의 기존 공유(`navigator.share`)가 iOS 네이티브 공유 시트로 동작하는지 검증. 동작 시 **웹·네이티브 코드 추가 없음.**
- 2순위(1순위 실패 시): `WKScriptMessageHandler`로 공유 페이로드 수신 → `ShareCoordinator`가 `UIActivityViewController` 표시. 이때 웹에 피처 감지 가드 shim 필요 → 사전 승인.

### 5.4 홈 화면 위젯 (P2)
- App Group 공유 컨테이너 사용.
- 앱이 포그라운드/백그라운드 전환 시 `evaluateJavaScript`로 WebView의 오늘 기운 캐시(`om-*`)를 읽어 App Group에 요약 문자열 저장.
- `OmniWidget` 타임라인이 App Group 값을 표시. 데이터 없으면 "앱을 열어 오늘의 기운을 확인하세요" 폴백.
- **가장 무거운 조각 → P2로 분리.** P1 출시 범위에서 제외.

---

## 6. App Store 대응

- **4.2 근거:** 로컬 알림·오프라인 경험·네이티브 공유·네이티브 설정(P1) + 홈 위젯(P2)으로 "최소 기능" 이상임을 심사 노트에 명시.
- **App Privacy:** 완전 익명·localStorage 저장이라 대체로 "수집 안 함". 단:
  - Vercel/Supabase **익명 지표**(events) → "Analytics(비식별, 사용자 미연결)" 신고 검토.
  - **카카오 AdFit 광고**(`NEXT_PUBLIC_ADFIT_UNIT` 활성 시에만 WebView 내 표시) → 활성화 시 "제3자 광고" 신고 검토. 네이티브 광고 SDK가 아니므로 **IDFA/ATT 프롬프트 불필요.**
- **URL:** 지원/개인정보 URL은 기존 `/privacy`·`/contact` 활용.
- **자산:** 앱 아이콘(페르소나 아트 기반), 런치 스크린, 스크린샷.

---

## 7. 단계별 로드맵 (기획 → 개발 → 구현 → 검증)

- **P0 — 스캐폴드**
  - Xcode 프로젝트 생성(`ios/`), 번들 ID·이름·최소 버전 설정.
  - `WebContainer`로 프로덕션 URL 로드, 외부 링크 정책, 당겨서 새로고침.
  - 앱 아이콘·런치 스크린 임시본.
- **P1 — 네이티브 가치**
  - `ReachabilityMonitor` + `OfflineView`.
  - `NotificationManager` + `SettingsView`(로컬 알림, 시각 설정, 딥링크).
  - 공유(§5.3 1순위 검증 → 필요 시 2순위).
- **P2 — 위젯**
  - App Group + `evaluateJavaScript` 브리지 + `OmniWidget`.
- **P3 — 출시 준비**
  - App Privacy 응답, 스크린샷/메타데이터, 심사 노트, 아이콘 최종본, TestFlight 검증.

---

## 8. 검증 전략

계산 엔진처럼 "정답이 존재하는 영역"이 아니라 통합 동작 검증 중심이다.

- **빌드:** Xcode 시뮬레이터 + 실기기 빌드 성공.
- **수동 테스트 매트릭스(단계별):**
  1. 콜드 런치 → 프로덕션 사이트 로드.
  2. 온보딩·오늘·마음·사주 등 주요 플로우가 WebView에서 동작.
  3. 오프라인 전환 → `OfflineView` 표시 → 재연결 → 복구.
  4. 알림 권한 → 스케줄 → 발화 → 탭 → `/today` 딥링크.
  5. 공유 시트 표시 및 이미지/카드 공유.
  6. 앱 재실행 후 localStorage 프로필·기록 유지.
  7. 외부 링크가 Safari로 열림.
- **선택:** XCUITest 스모크(런치·로드 성공).
- **웹 회귀:** 웹은 변경하지 않으므로 기존 `npm run verify`가 계속 웹을 보증. 부득이한 shim 추가 시 `npm run verify` 통과 필수.

---

## 9. 리스크와 대응

| 리스크 | 대응 |
|--------|------|
| 4.2 반려(순수 웹뷰) | 로컬 알림·오프라인·공유·설정·위젯으로 네이티브 가치 확보 + 심사 노트 |
| `navigator.share`가 WKWebView에서 미동작 | 피처 감지 가드 shim(사전 승인) + 네이티브 `UIActivityViewController` |
| Vercel 다운 시 앱 백지 | `OfflineView`/에러 화면으로 폴백, 재시도 제공 |
| WebView 저장소 초기화(사용자 데이터 유실) | `WKWebsiteDataStore.default()` 영속 사용, 삭제 트리거 회피 |
| 위젯 데이터 부재 | 폴백 카피 + 앱 열기 유도, P2로 분리해 P1 출시 비차단 |
| 광고/지표 개인정보 신고 누락 | P3에서 AdFit·Supabase events 활성 여부 확인 후 신고 |

---

## 10. 하지 않는 것 (YAGNI)

- **웹 UI의 네이티브(SwiftUI) 재작성** — WebView 래퍼가 목표. 화면은 웹 그대로.
- **계산 엔진(`src/lib/engine/`)의 Swift 포팅** — 계산은 웹(WKWebView 내부)에서 그대로 수행.
- **서버 푸시(APNs) 인프라** — 계정·서버 없는 익명 원칙 유지. 알림은 온디바이스 로컬 전용.
- **앱 자체 계정·로그인·결제** — 서비스가 완전 익명이므로 도입하지 않는다.
- **오프라인 캐시(사이트 정적 번들)** — 서버 액션 의존이라 불가·비목표. 오프라인은 안내 화면까지만.
- **네이티브 광고 SDK(AdMob 등) 도입** — 광고는 기존 웹 AdFit으로 충분. IDFA/ATT 회피.
- **React Native·Capacitor 등 하이브리드 런타임** — 순수 WKWebView로 충분(의존성 0개 유지).
- **iPad 전용 레이아웃·macOS Catalyst** — iPhone 우선. iPad는 기본 호환 실행까지만.
- **딥링크 커스텀 스킴/유니버설 링크(외부 유입)** — 내부 알림 딥링크(`/today`)만. 외부 진입은 웹 URL로 충분.
