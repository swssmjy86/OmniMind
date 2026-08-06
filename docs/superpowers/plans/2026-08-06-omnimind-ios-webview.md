# OmniMind iOS (WebView 래퍼) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 기존 OmniMind 웹 서비스를 손대지 않고, 프로덕션 URL을 로드하는 Xcode 기반 iOS 네이티브 셸(WKWebView 래퍼)을 만들어 App Store 출시 가능한 상태로 만든다.

**Architecture:** Swift + SwiftUI 앱이 `WKWebView`로 원격 URL(`https://omni-mind-i6uj.vercel.app`)을 로드한다. 계산·LLM·시크릿은 전부 웹(Vercel)에 남고, 네이티브는 셸·로컬 알림·오프라인·공유·(P2)위젯만 담당한다. 순수 로직(URL 분류·설정 모델·알림 카피·위젯 디코딩)은 XCTest로 TDD하고, UI·통합은 XCUITest 스모크 + 수동 검증 매트릭스로 확인한다.

**Tech Stack:** Swift 5.9+, SwiftUI, WebKit(WKWebView), UserNotifications, Network(NWPathMonitor), WidgetKit(P2). 프로젝트 파일은 **XcodeGen**(`project.yml` → `.xcodeproj`)으로 텍스트 기반 생성. 앱 런타임 서드파티 의존성 0개.

## Global Constraints

*아래는 모든 태스크에 암묵적으로 포함된다. 값은 스펙에서 그대로 옮겼다.*

- **번들 ID:** 앱 `com.omnimind.app`, 위젯 `com.omnimind.app.widget`, App Group `group.com.omnimind.app`.
- **앱 표시 이름:** 옴니마인드
- **최소 iOS:** 16.0
- **프로덕션 URL:** `https://omni-mind-i6uj.vercel.app`
- **언어/프레임워크:** Swift + SwiftUI. **앱 런타임 서드파티 의존성 0개**(CocoaPods/SPM 없음). XcodeGen은 빌드 타임 개발 도구라 예외(앱 번들에 포함 안 됨).
- **웹 코드 무변경:** 웹 저장소(`src/`)는 건드리지 않는다. 부득이한 경우 `window.webkit` 피처 감지 가드가 걸린 무해(no-op) shim만, **사전 승인 후** 별도 작업으로.
- **완전 익명·월 0원:** 계정·서버 사용자 데이터 없음. 알림은 **온디바이스 로컬 전용**(APNs·서버 푸시 금지).
- **브랜딩 톤('지적인 따뜻함'):** 사용자 대면 카피는 단정·명령·공포 마케팅 금지. 컬러는 베이지/코랄/딥그린(블루 금지).
- **위치:** 모든 iOS 코드는 저장소 `ios/` 하위. 웹은 변경하지 않으므로 `npm run verify`는 계속 통과 상태 — 머지 전 1회 확인.

**빌드/테스트 명령(모든 태스크 공통):**
```bash
cd ios
xcodegen generate                                   # project.yml → OmniMind.xcodeproj
SIM='platform=iOS Simulator,name=iPhone 17'         # 이 Mac의 가용 기기. 다르면: xcrun simctl list devices 로 확인 후 교체
xcodebuild -project OmniMind.xcodeproj -scheme OmniMind -destination "$SIM" build
xcodebuild -project OmniMind.xcodeproj -scheme OmniMind -destination "$SIM" test
```
> 선행 설치(1회): `brew install xcodegen`. Xcode(+ iOS 시뮬레이터 런타임) 필요.

**커밋 컨벤션:** 한국어 conventional commit. 각 커밋 메시지 끝에 다음 줄 포함:
```
Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
```

---

## 파일 구조

```
ios/
  project.yml                         # XcodeGen 스펙(앱·테스트·UI테스트·위젯 타깃)
  OmniMind/
    OmniMindApp.swift                 # @main App 진입점, 알림 델리게이트 등록
    RootView.swift                    # WebView + (오프라인/에러) 오버레이
    Support/AppConfig.swift           # 프로덕션 URL, 내부/외부 링크 분류, 딥링크 URL 조립
    Web/WebContainer.swift            # UIViewRepresentable + Coordinator(WKNavigationDelegate)
    Web/WebViewModel.swift            # 로드 상태·딥링크·리로드 신호
    Network/ReachabilityMonitor.swift # NWPathMonitor 래퍼 + 순수 상태 판정
    Offline/OfflineView.swift         # 브랜드 오프라인/에러 화면
    Notifications/NotificationManager.swift  # UNUserNotificationCenter 스케줄·델리게이트
    Notifications/NotificationSettings.swift # UserDefaults 백업 설정 모델(순수)
    Settings/SettingsView.swift       # 알림 on/off + 시각 피커
    Share/SharePayload.swift          # (P1) 공유 페이로드 디코딩(순수)
    Share/ShareCoordinator.swift      # (P1) UIActivityViewController 표시
    Widget/WebBridge.swift            # (P2) evaluateJavaScript로 localStorage 읽기
    Widget/WidgetDataStore.swift      # (P2) App Group 공유 저장(순수 인코드/디코드)
    Resources/Assets.xcassets         # 앱 아이콘·색상
  OmniMindWidget/                     # (P2) WidgetKit 익스텐션
    OmniWidget.swift
    TodayProvider.swift
  OmniMindTests/                      # XCTest 단위 테스트
  OmniMindUITests/                    # XCUITest 스모크
```

---

# P0 — 스캐폴드

## Task 1: XcodeGen 프로젝트 + AppConfig(링크 분류·딥링크)

**Files:**
- Create: `ios/project.yml`
- Create: `ios/OmniMind/OmniMindApp.swift`
- Create: `ios/OmniMind/RootView.swift` (임시 플레이스홀더 텍스트)
- Create: `ios/OmniMind/Support/AppConfig.swift`
- Test: `ios/OmniMindTests/AppConfigTests.swift`

**Interfaces:**
- Produces:
  - `enum AppConfig` — `static let productionURL: URL`, `static let allowedHost: String`, `static func isExternalNavigation(_ url: URL) -> Bool`, `static func url(path: String) -> URL`.

- [ ] **Step 1: Write the failing test**

`ios/OmniMindTests/AppConfigTests.swift`:
```swift
import XCTest
@testable import OmniMind

final class AppConfigTests: XCTestCase {
    func testInternalHostIsNotExternal() {
        let u = URL(string: "https://omni-mind-i6uj.vercel.app/today")!
        XCTAssertFalse(AppConfig.isExternalNavigation(u))
    }
    func testOtherDomainIsExternal() {
        XCTAssertTrue(AppConfig.isExternalNavigation(URL(string: "https://apple.com")!))
    }
    func testMailtoIsExternal() {
        XCTAssertTrue(AppConfig.isExternalNavigation(URL(string: "mailto:hi@omnimind.app")!))
    }
    func testTelIsExternal() {
        XCTAssertTrue(AppConfig.isExternalNavigation(URL(string: "tel:0212345678")!))
    }
    func testDeepLinkURLJoinsPath() {
        XCTAssertEqual(AppConfig.url(path: "/today").absoluteString,
                       "https://omni-mind-i6uj.vercel.app/today")
    }
}
```

- [ ] **Step 2: Create the project scaffold so the test target exists**

`ios/project.yml`:
```yaml
name: OmniMind
options:
  bundleIdPrefix: com.omnimind
  deploymentTarget:
    iOS: "16.0"
  createIntermediateGroups: true
settings:
  base:
    MARKETING_VERSION: "1.0.0"
    CURRENT_PROJECT_VERSION: "1"
    SWIFT_VERSION: "5.9"
    GENERATE_INFOPLIST_FILE: YES
    DEVELOPMENT_TEAM: ""      # 실기기·배포 시 팀 ID 입력
targets:
  OmniMind:
    type: application
    platform: iOS
    sources: [OmniMind]
    settings:
      base:
        PRODUCT_BUNDLE_IDENTIFIER: com.omnimind.app
        INFOPLIST_KEY_CFBundleDisplayName: 옴니마인드
        INFOPLIST_KEY_UILaunchScreen_Generation: YES
        INFOPLIST_KEY_UIApplicationSupportsIndirectInputEvents: YES
        TARGETED_DEVICE_FAMILY: "1"     # iPhone 우선
  OmniMindTests:
    type: bundle.unit-test
    platform: iOS
    sources: [OmniMindTests]
    dependencies:
      - target: OmniMind
  OmniMindUITests:
    type: bundle.ui-testing
    platform: iOS
    sources: [OmniMindUITests]
    dependencies:
      - target: OmniMind
```

`ios/OmniMind/OmniMindApp.swift`:
```swift
import SwiftUI

@main
struct OmniMindApp: App {
    var body: some Scene {
        WindowGroup { RootView() }
    }
}
```

`ios/OmniMind/RootView.swift` (임시 — Task 2에서 교체):
```swift
import SwiftUI

struct RootView: View {
    var body: some View { Text("OmniMind").padding() }
}
```

`ios/OmniMind/Support/AppConfig.swift`:
```swift
import Foundation

enum AppConfig {
    static let productionURL = URL(string: "https://omni-mind-i6uj.vercel.app")!
    static let allowedHost = "omni-mind-i6uj.vercel.app"

    /// 앱 호스트(http/https) 이외의 모든 목적지는 외부(시스템 앱)로 연다.
    static func isExternalNavigation(_ url: URL) -> Bool {
        guard let scheme = url.scheme?.lowercased() else { return true }
        guard scheme == "http" || scheme == "https" else { return true }
        return url.host != allowedHost
    }

    /// 딥링크 경로를 프로덕션 URL에 결합.
    static func url(path: String) -> URL {
        URL(string: path, relativeTo: productionURL)?.absoluteURL ?? productionURL
    }
}
```

Also create an empty UI test file so the target compiles — `ios/OmniMindUITests/LaunchSmokeTests.swift`:
```swift
import XCTest

final class LaunchSmokeTests: XCTestCase {
    func testAppLaunches() {
        let app = XCUIApplication()
        app.launch()
        XCTAssertEqual(app.state, .runningForeground)
    }
}
```

- [ ] **Step 3: Run test to verify it fails**

```bash
cd ios && xcodegen generate
xcodebuild -project OmniMind.xcodeproj -scheme OmniMind -destination "platform=iOS Simulator,name=iPhone 17" test
```
Expected: `AppConfigTests` 컴파일·통과(로직이 이미 맞으면 통과). 만약 시뮬레이터 이름 오류면 `xcrun simctl list devices`로 가용 기기명으로 교체. (이 태스크는 로직이 자명해 Step 3에서 바로 통과할 수 있음 — 통과하면 Step 4로.)

- [ ] **Step 4: Verify build + tests pass**

Expected: `Test Succeeded`, `AppConfigTests` 5개 통과.

- [ ] **Step 5: Commit**

```bash
git add ios/project.yml ios/OmniMind ios/OmniMindTests ios/OmniMindUITests
git commit -m "feat(ios): XcodeGen 스캐폴드 + AppConfig 링크 분류·딥링크

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 2: WebContainer — 프로덕션 URL 로드 + 외부 링크 정책 + 당겨서 새로고침

**Files:**
- Create: `ios/OmniMind/Web/WebViewModel.swift`
- Create: `ios/OmniMind/Web/WebContainer.swift`
- Modify: `ios/OmniMind/RootView.swift` (플레이스홀더 → WebContainer)
- Test: `ios/OmniMindUITests/LaunchSmokeTests.swift` (로드 확인으로 확장)

**Interfaces:**
- Consumes: `AppConfig.productionURL`, `AppConfig.isExternalNavigation(_:)` (Task 1).
- Produces:
  - `final class WebViewModel: ObservableObject` — `@Published var pendingDeepLink: URL?`, `@Published var loadFailed: Bool`, `@Published var reloadToken: Int`; `func requestDeepLink(path: String)`, `func reload()`, `func didFailLoad()`.
  - `struct WebContainer: UIViewRepresentable` — `init(model: WebViewModel)`.

- [ ] **Step 1: Write WebViewModel + WebContainer**

`ios/OmniMind/Web/WebViewModel.swift`:
```swift
import SwiftUI

final class WebViewModel: ObservableObject {
    @Published var pendingDeepLink: URL?
    @Published var loadFailed = false
    @Published var reloadToken = 0

    func requestDeepLink(path: String) { pendingDeepLink = AppConfig.url(path: path) }
    func reload() { loadFailed = false; reloadToken += 1 }
    func didFailLoad() { loadFailed = true }
}
```

`ios/OmniMind/Web/WebContainer.swift`:
```swift
import SwiftUI
import WebKit

struct WebContainer: UIViewRepresentable {
    @ObservedObject var model: WebViewModel

    func makeCoordinator() -> Coordinator { Coordinator(model: model) }

    func makeUIView(context: Context) -> WKWebView {
        let config = WKWebViewConfiguration()
        config.websiteDataStore = .default()            // Safari와 분리된 영속 저장
        config.allowsInlineMediaPlayback = true
        let webView = WKWebView(frame: .zero, configuration: config)
        webView.navigationDelegate = context.coordinator
        webView.uiDelegate = context.coordinator
        webView.allowsBackForwardNavigationGestures = true
        let rc = UIRefreshControl()
        rc.addTarget(context.coordinator, action: #selector(Coordinator.refresh(_:)), for: .valueChanged)
        webView.scrollView.refreshControl = rc
        context.coordinator.webView = webView
        webView.load(URLRequest(url: AppConfig.productionURL))
        return webView
    }

    func updateUIView(_ webView: WKWebView, context: Context) {
        if let deep = model.pendingDeepLink {
            webView.load(URLRequest(url: deep))
            DispatchQueue.main.async { self.model.pendingDeepLink = nil }
        }
        if model.reloadToken != context.coordinator.lastReloadToken {
            context.coordinator.lastReloadToken = model.reloadToken
            webView.load(URLRequest(url: AppConfig.productionURL))
        }
    }

    final class Coordinator: NSObject, WKNavigationDelegate, WKUIDelegate {
        let model: WebViewModel
        weak var webView: WKWebView?
        var lastReloadToken = 0
        init(model: WebViewModel) { self.model = model }

        @objc func refresh(_ sender: UIRefreshControl) { webView?.reload() }

        func webView(_ webView: WKWebView, didFinish nav: WKNavigation!) {
            webView.scrollView.refreshControl?.endRefreshing()
        }
        func webView(_ webView: WKWebView, didFail nav: WKNavigation!, withError e: Error) {
            webView.scrollView.refreshControl?.endRefreshing(); model.didFailLoad()
        }
        func webView(_ webView: WKWebView, didFailProvisionalNavigation nav: WKNavigation!, withError e: Error) {
            webView.scrollView.refreshControl?.endRefreshing(); model.didFailLoad()
        }

        func webView(_ webView: WKWebView, decidePolicyFor action: WKNavigationAction,
                     decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
            if let url = action.request.url, AppConfig.isExternalNavigation(url) {
                UIApplication.shared.open(url)
                decisionHandler(.cancel); return
            }
            decisionHandler(.allow)
        }

        func webView(_ webView: WKWebView, createWebViewWith config: WKWebViewConfiguration,
                     for action: WKNavigationAction, windowFeatures: WKWindowFeatures) -> WKWebView? {
            if let url = action.request.url {
                if AppConfig.isExternalNavigation(url) { UIApplication.shared.open(url) }
                else { webView.load(URLRequest(url: url)) }
            }
            return nil
        }
    }
}
```

- [ ] **Step 2: Wire RootView to WebContainer**

`ios/OmniMind/RootView.swift`:
```swift
import SwiftUI

struct RootView: View {
    @StateObject private var webModel = WebViewModel()
    var body: some View {
        WebContainer(model: webModel)
            .ignoresSafeArea(.container, edges: .bottom)
    }
}
```

- [ ] **Step 3: Expand the UI smoke test to assert the site loaded**

`ios/OmniMindUITests/LaunchSmokeTests.swift`:
```swift
import XCTest

final class LaunchSmokeTests: XCTestCase {
    func testAppLaunchesAndLoadsWeb() {
        let app = XCUIApplication()
        app.launch()
        // WKWebView 콘텐츠가 접근성 트리에 나타날 때까지 대기(네트워크 필요).
        let web = app.webViews.firstMatch
        XCTAssertTrue(web.waitForExistence(timeout: 20), "웹뷰가 로드되지 않음")
    }
}
```

- [ ] **Step 4: Run build + tests**

```bash
cd ios && xcodegen generate
xcodebuild -project OmniMind.xcodeproj -scheme OmniMind -destination "platform=iOS Simulator,name=iPhone 17" test
```
Expected: 빌드 성공. UI 스모크는 시뮬레이터 네트워크가 있어야 통과(오프라인이면 스킵/재시도).

- [ ] **Step 5: Manual verification (시뮬레이터)**

시뮬레이터에서 앱 실행 → 사이트가 뜨는지, 아래로 당기면 새로고침 되는지, 푸터의 외부 링크(있다면)가 Safari로 열리는지 확인.

- [ ] **Step 6: Commit**

```bash
git add ios/OmniMind ios/OmniMindUITests
git commit -m "feat(ios): WKWebView 프로덕션 로드 + 외부 링크 정책 + 당겨서 새로고침

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

# P1 — 네이티브 가치

## Task 3: 오프라인 처리 — ReachabilityMonitor + OfflineView

**Files:**
- Create: `ios/OmniMind/Network/ReachabilityMonitor.swift`
- Create: `ios/OmniMind/Offline/OfflineView.swift`
- Modify: `ios/OmniMind/RootView.swift` (오버레이 추가)
- Test: `ios/OmniMindTests/ReachabilityMonitorTests.swift`

**Interfaces:**
- Consumes: `WebViewModel.reload()`, `WebViewModel.loadFailed` (Task 2).
- Produces:
  - `final class ReachabilityMonitor: ObservableObject` — `@Published private(set) var isConnected: Bool`; `static func connected(_ status: NWPath.Status) -> Bool`.
  - `struct OfflineView: View` — `init(onRetry: @escaping () -> Void)`.

- [ ] **Step 1: Write the failing test**

`ios/OmniMindTests/ReachabilityMonitorTests.swift`:
```swift
import XCTest
import Network
@testable import OmniMind

final class ReachabilityMonitorTests: XCTestCase {
    func testSatisfiedIsConnected() {
        XCTAssertTrue(ReachabilityMonitor.connected(.satisfied))
    }
    func testUnsatisfiedIsNotConnected() {
        XCTAssertFalse(ReachabilityMonitor.connected(.unsatisfied))
    }
    func testRequiresConnectionIsNotConnected() {
        XCTAssertFalse(ReachabilityMonitor.connected(.requiresConnection))
    }
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `xcodebuild ... test`
Expected: FAIL — `ReachabilityMonitor` 미정의(컴파일 에러).

- [ ] **Step 3: Implement ReachabilityMonitor + OfflineView**

`ios/OmniMind/Network/ReachabilityMonitor.swift`:
```swift
import Foundation
import Network

final class ReachabilityMonitor: ObservableObject {
    @Published private(set) var isConnected = true
    private let monitor = NWPathMonitor()
    private let queue = DispatchQueue(label: "com.omnimind.app.reachability")

    init() {
        monitor.pathUpdateHandler = { [weak self] path in
            let ok = ReachabilityMonitor.connected(path.status)
            DispatchQueue.main.async { self?.isConnected = ok }
        }
        monitor.start(queue: queue)
    }
    deinit { monitor.cancel() }

    static func connected(_ status: NWPath.Status) -> Bool { status == .satisfied }
}
```

`ios/OmniMind/Offline/OfflineView.swift`:
```swift
import SwiftUI

struct OfflineView: View {
    let onRetry: () -> Void
    var body: some View {
        ZStack {
            Color(red: 0.96, green: 0.94, blue: 0.90).ignoresSafeArea()   // 웜 베이지
            VStack(spacing: 16) {
                Text("🌙").font(.system(size: 44))
                Text("잠시 길을 잃었어요")
                    .font(.title3).bold()
                    .foregroundStyle(Color(red: 0.18, green: 0.35, blue: 0.29))  // 딥 그린
                Text("연결이 돌아오면 다시 이어드릴게요.")
                    .font(.subheadline)
                    .foregroundStyle(Color(red: 0.24, green: 0.23, blue: 0.21))
                Button(action: onRetry) {
                    Text("다시 시도")
                        .font(.callout).bold()
                        .padding(.horizontal, 24).padding(.vertical, 12)
                        .background(Color(red: 0.91, green: 0.57, blue: 0.49))   // 차분한 코랄
                        .foregroundStyle(.white)
                        .clipShape(Capsule())
                }
            }.padding(32)
        }
    }
}
```

- [ ] **Step 4: Overlay in RootView**

`ios/OmniMind/RootView.swift`:
```swift
import SwiftUI

struct RootView: View {
    @StateObject private var webModel = WebViewModel()
    @StateObject private var reachability = ReachabilityMonitor()

    private var showOffline: Bool { !reachability.isConnected || webModel.loadFailed }

    var body: some View {
        ZStack {
            WebContainer(model: webModel)
                .ignoresSafeArea(.container, edges: .bottom)
            if showOffline {
                OfflineView { webModel.reload() }
                    .transition(.opacity)
            }
        }
        .animation(.easeInOut, value: showOffline)
    }
}
```

- [ ] **Step 5: Run tests + manual offline check**

```bash
cd ios && xcodegen generate && xcodebuild ... test
```
Expected: PASS. 수동: 시뮬레이터 실행 후 Mac 네트워크 차단(또는 Network Link Conditioner) → 오프라인 화면 표시 → 복구 시 사라짐/재시도 동작.

- [ ] **Step 6: Commit**

```bash
git add ios/OmniMind ios/OmniMindTests
git commit -m "feat(ios): 오프라인 감지 + 브랜드 오프라인 화면

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 4: 로컬 알림 — 설정 모델 + 스케줄러 + 카피

**Files:**
- Create: `ios/OmniMind/Notifications/NotificationSettings.swift`
- Create: `ios/OmniMind/Notifications/NotificationManager.swift`
- Test: `ios/OmniMindTests/NotificationSettingsTests.swift`
- Test: `ios/OmniMindTests/NotificationContentTests.swift`

**Interfaces:**
- Produces:
  - `struct NotificationSettings: Equatable` — `var isEnabled: Bool`, `var hour: Int`, `var minute: Int`; `static let `default``.
  - `enum NotificationSettingsStore` — `static func load(from: UserDefaults) -> NotificationSettings`, `static func save(_:to:)`.
  - `@MainActor final class NotificationManager: NSObject, ObservableObject, UNUserNotificationCenterDelegate` — `func registerDelegate()`, `func requestAuthorization() async -> Bool`, `func reschedule(_ settings: NotificationSettings) async`, `var onDeepLink: ((String) -> Void)?`; `static let dailyIdentifier`, `static let deepLinkPath = "/today"`, `static func dailyContent() -> UNMutableNotificationContent`.

- [ ] **Step 1: Write the failing tests**

`ios/OmniMindTests/NotificationSettingsTests.swift`:
```swift
import XCTest
@testable import OmniMind

final class NotificationSettingsTests: XCTestCase {
    private func suite() -> UserDefaults {
        let d = UserDefaults(suiteName: "test.notif.\(UUID().uuidString)")!
        return d
    }
    func testDefaultsWhenEmpty() {
        let s = NotificationSettingsStore.load(from: suite())
        XCTAssertEqual(s, NotificationSettings.default)      // 8:00, disabled
        XCTAssertEqual(s.hour, 8)
        XCTAssertFalse(s.isEnabled)
    }
    func testRoundTrip() {
        let d = suite()
        let s = NotificationSettings(isEnabled: true, hour: 7, minute: 30)
        NotificationSettingsStore.save(s, to: d)
        XCTAssertEqual(NotificationSettingsStore.load(from: d), s)
    }
}
```

`ios/OmniMindTests/NotificationContentTests.swift`:
```swift
import XCTest
@testable import OmniMind

final class NotificationContentTests: XCTestCase {
    func testDailyContentCarriesDeepLinkAndTone() {
        let c = NotificationManager.dailyContent()
        XCTAssertEqual(c.title, "옴니마인드")
        XCTAssertFalse(c.body.isEmpty)
        XCTAssertEqual(c.userInfo["deepLink"] as? String, "/today")
    }
}
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `xcodebuild ... test`
Expected: FAIL — `NotificationSettings`/`NotificationManager` 미정의.

- [ ] **Step 3: Implement**

`ios/OmniMind/Notifications/NotificationSettings.swift`:
```swift
import Foundation

struct NotificationSettings: Equatable {
    var isEnabled: Bool
    var hour: Int
    var minute: Int
    static let `default` = NotificationSettings(isEnabled: false, hour: 8, minute: 0)
}

enum NotificationSettingsStore {
    static let enabledKey = "notif.enabled"
    static let hourKey = "notif.hour"
    static let minuteKey = "notif.minute"

    static func load(from d: UserDefaults) -> NotificationSettings {
        guard d.object(forKey: enabledKey) != nil else { return .default }
        return NotificationSettings(
            isEnabled: d.bool(forKey: enabledKey),
            hour: d.integer(forKey: hourKey),
            minute: d.integer(forKey: minuteKey)
        )
    }
    static func save(_ s: NotificationSettings, to d: UserDefaults) {
        d.set(s.isEnabled, forKey: enabledKey)
        d.set(s.hour, forKey: hourKey)
        d.set(s.minute, forKey: minuteKey)
    }
}
```

`ios/OmniMind/Notifications/NotificationManager.swift`:
```swift
import Foundation
import UserNotifications

@MainActor
final class NotificationManager: NSObject, ObservableObject, UNUserNotificationCenterDelegate {
    static let dailyIdentifier = "omni.daily"
    static let deepLinkPath = "/today"
    private let center = UNUserNotificationCenter.current()
    var onDeepLink: ((String) -> Void)?

    func registerDelegate() { center.delegate = self }

    func requestAuthorization() async -> Bool {
        (try? await center.requestAuthorization(options: [.alert, .sound, .badge])) ?? false
    }

    func reschedule(_ settings: NotificationSettings) async {
        center.removePendingNotificationRequests(withIdentifiers: [Self.dailyIdentifier])
        guard settings.isEnabled else { return }
        var comps = DateComponents(); comps.hour = settings.hour; comps.minute = settings.minute
        let trigger = UNCalendarNotificationTrigger(dateMatching: comps, repeats: true)
        let req = UNNotificationRequest(identifier: Self.dailyIdentifier,
                                        content: Self.dailyContent(), trigger: trigger)
        try? await center.add(req)
    }

    static func dailyContent() -> UNMutableNotificationContent {
        let c = UNMutableNotificationContent()
        c.title = "옴니마인드"
        c.body = "오늘의 기운이 도착했어요 🌙"
        c.sound = .default
        c.userInfo = ["deepLink": deepLinkPath]
        return c
    }

    nonisolated func userNotificationCenter(_ center: UNUserNotificationCenter,
        didReceive response: UNNotificationResponse) async {
        let info = response.notification.request.content.userInfo
        if let path = info["deepLink"] as? String {
            await MainActor.run { self.onDeepLink?(path) }
        }
    }
    nonisolated func userNotificationCenter(_ center: UNUserNotificationCenter,
        willPresent notification: UNNotification) async -> UNNotificationPresentationOptions {
        [.banner, .sound]
    }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `xcodebuild ... test`
Expected: PASS — 설정 라운드트립 + 카피/딥링크 검증 통과.

- [ ] **Step 5: Commit**

```bash
git add ios/OmniMind/Notifications ios/OmniMindTests/NotificationSettingsTests.swift ios/OmniMindTests/NotificationContentTests.swift
git commit -m "feat(ios): 로컬 알림 설정 모델 + 스케줄러 + 달지기 톤 카피

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 5: 설정 화면 + 알림 탭 딥링크 배선

**Files:**
- Create: `ios/OmniMind/Settings/SettingsView.swift`
- Modify: `ios/OmniMind/OmniMindApp.swift` (NotificationManager 소유·델리게이트 등록·딥링크 → WebViewModel)
- Modify: `ios/OmniMind/RootView.swift` (설정 진입 버튼 + 딥링크 수신)

**Interfaces:**
- Consumes: `NotificationManager`, `NotificationSettings`, `NotificationSettingsStore`, `WebViewModel.requestDeepLink(path:)`.
- Produces: `struct SettingsView: View` — `init(manager: NotificationManager)`.

- [ ] **Step 1: Implement SettingsView**

`ios/OmniMind/Settings/SettingsView.swift`:
```swift
import SwiftUI

struct SettingsView: View {
    @ObservedObject var manager: NotificationManager
    @Environment(\.dismiss) private var dismiss
    @State private var settings = NotificationSettingsStore.load(from: .standard)
    @State private var deniedAlert = false

    private var time: Binding<Date> {
        Binding(
            get: {
                Calendar.current.date(from: DateComponents(hour: settings.hour, minute: settings.minute)) ?? Date()
            },
            set: { newDate in
                let c = Calendar.current.dateComponents([.hour, .minute], from: newDate)
                settings.hour = c.hour ?? 8; settings.minute = c.minute ?? 0
                persist()
            })
    }

    var body: some View {
        NavigationStack {
            Form {
                Section("데일리 알림") {
                    Toggle("매일 오늘의 기운 알림", isOn: Binding(
                        get: { settings.isEnabled },
                        set: { on in Task { await toggle(on) } }))
                    if settings.isEnabled {
                        DatePicker("받을 시각", selection: time, displayedComponents: .hourAndMinute)
                    }
                }
                Section {
                    Text("알림은 이 기기에서만 예약돼요. 서버에 저장되는 정보는 없어요.")
                        .font(.footnote).foregroundStyle(.secondary)
                }
            }
            .navigationTitle("설정")
            .toolbar { ToolbarItem(placement: .confirmationAction) { Button("완료") { dismiss() } } }
            .alert("알림 권한이 꺼져 있어요", isPresented: $deniedAlert) {
                Button("설정 열기") { openSystemSettings() }
                Button("취소", role: .cancel) {}
            } message: { Text("설정 앱에서 옴니마인드 알림을 켜주세요.") }
        }
    }

    private func toggle(_ on: Bool) async {
        if on {
            let granted = await manager.requestAuthorization()
            if !granted { deniedAlert = true; return }
        }
        settings.isEnabled = on
        persist()
        await manager.reschedule(settings)
    }
    private func persist() {
        NotificationSettingsStore.save(settings, to: .standard)
        Task { await manager.reschedule(settings) }
    }
    private func openSystemSettings() {
        if let url = URL(string: UIApplication.openSettingsURLString) { UIApplication.shared.open(url) }
    }
}
```

- [ ] **Step 2: Own NotificationManager in the App and route deep links**

`ios/OmniMind/OmniMindApp.swift`:
```swift
import SwiftUI

@main
struct OmniMindApp: App {
    @StateObject private var notifications = NotificationManager()
    @StateObject private var webModel = WebViewModel()

    var body: some Scene {
        WindowGroup {
            RootView(webModel: webModel, notifications: notifications)
                .onAppear {
                    notifications.registerDelegate()
                    notifications.onDeepLink = { path in webModel.requestDeepLink(path: path) }
                    Task {
                        await notifications.reschedule(NotificationSettingsStore.load(from: .standard))
                    }
                }
        }
    }
}
```

- [ ] **Step 3: Add settings entry + accept injected models in RootView**

`ios/OmniMind/RootView.swift`:
```swift
import SwiftUI

struct RootView: View {
    @ObservedObject var webModel: WebViewModel
    @ObservedObject var notifications: NotificationManager
    @StateObject private var reachability = ReachabilityMonitor()
    @State private var showSettings = false

    private var showOffline: Bool { !reachability.isConnected || webModel.loadFailed }

    var body: some View {
        ZStack(alignment: .topTrailing) {
            WebContainer(model: webModel).ignoresSafeArea(.container, edges: .bottom)

            Button { showSettings = true } label: {
                Image(systemName: "bell").padding(10)
                    .background(.ultraThinMaterial, in: Circle())
            }
            .padding(.top, 8).padding(.trailing, 12)
            .accessibilityLabel("알림 설정")

            if showOffline {
                OfflineView { webModel.reload() }.transition(.opacity)
            }
        }
        .animation(.easeInOut, value: showOffline)
        .sheet(isPresented: $showSettings) { SettingsView(manager: notifications) }
    }
}
```

> 참고: 설정 진입 버튼은 웹 헤더와 겹치지 않는 최소 배치. 겹침이 확인되면 위치·표시 조건을 조정(예: 스크롤 상단에서만 노출)한다. 이 버튼은 P1 알림을 사용자에게 노출하는 유일한 네이티브 진입점이라 유지한다.

- [ ] **Step 4: Build + tests + manual notification test**

```bash
cd ios && xcodegen generate && xcodebuild ... test
```
수동: 설정 열기 → 알림 토글 ON → 권한 허용 → 시각을 1~2분 뒤로 → 앱 백그라운드 → 알림 수신 → 탭 → 앱이 `/today`로 이동하는지 확인.

- [ ] **Step 5: Commit**

```bash
git add ios/OmniMind
git commit -m "feat(ios): 알림 설정 화면 + 권한 요청 + 탭 시 오늘 딥링크

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 6: 네이티브 공유 검증 + 폴백 브리지

**Files:**
- Create: `ios/OmniMind/Share/SharePayload.swift`
- Create: `ios/OmniMind/Share/ShareCoordinator.swift`
- Test: `ios/OmniMindTests/SharePayloadTests.swift`

**Interfaces:**
- Produces:
  - `struct SharePayload: Equatable, Decodable` — `let text: String?`, `let url: URL?`; `static func decode(_ message: Any) -> SharePayload?`.
  - `enum ShareCoordinator` — `static func present(_ payload: SharePayload, from webView: UIView)`.

- [ ] **Step 1: Verify whether `navigator.share` already works in WKWebView (측정 먼저)**

시뮬레이터에서 앱 실행 → 웹의 기존 공유 버튼(사주 결과 하단 `ShareSheet`) 탭 → **iOS 네이티브 공유 시트가 뜨는지** 확인.
- 뜨면: **웹·네이티브 추가 코드 없이 공유 완료.** Step 2~5의 브리지는 만들지 않고, 이 태스크는 "확인됨" 메모만 남기고 종료(빈 커밋 대신 스펙 검증 기록을 커밋 메시지에).
- 안 뜨면(콘솔에 `navigator.share is not a function` 등): Step 2로 진행해 네이티브 브리지를 만든다. **웹 shim은 별도 승인 작업**이며 이 태스크에서는 네이티브 수신부만 준비한다.

- [ ] **Step 2: (Step 1 실패 시) Write the failing test for SharePayload**

`ios/OmniMindTests/SharePayloadTests.swift`:
```swift
import XCTest
@testable import OmniMind

final class SharePayloadTests: XCTestCase {
    func testDecodeTextAndURL() {
        let msg: [String: Any] = ["text": "나의 조합 보기", "url": "https://omni-mind-i6uj.vercel.app/"]
        let p = SharePayload.decode(msg)
        XCTAssertEqual(p?.text, "나의 조합 보기")
        XCTAssertEqual(p?.url?.absoluteString, "https://omni-mind-i6uj.vercel.app/")
    }
    func testDecodeTextOnly() {
        XCTAssertEqual(SharePayload.decode(["text": "hi"])?.text, "hi")
    }
    func testRejectsEmpty() {
        XCTAssertNil(SharePayload.decode(["foo": "bar"]))
    }
}
```

- [ ] **Step 3: (Step 1 실패 시) Implement SharePayload + ShareCoordinator + message handler**

`ios/OmniMind/Share/SharePayload.swift`:
```swift
import Foundation

struct SharePayload: Equatable {
    let text: String?
    let url: URL?

    static func decode(_ message: Any) -> SharePayload? {
        guard let dict = message as? [String: Any] else { return nil }
        let text = dict["text"] as? String
        let url = (dict["url"] as? String).flatMap(URL.init(string:))
        guard text != nil || url != nil else { return nil }
        return SharePayload(text: text, url: url)
    }
}
```

`ios/OmniMind/Share/ShareCoordinator.swift`:
```swift
import UIKit

enum ShareCoordinator {
    static func present(_ payload: SharePayload, from source: UIView) {
        var items: [Any] = []
        if let t = payload.text { items.append(t) }
        if let u = payload.url { items.append(u) }
        guard !items.isEmpty else { return }
        let vc = UIActivityViewController(activityItems: items, applicationActivities: nil)
        vc.popoverPresentationController?.sourceView = source
        source.window?.rootViewController?.present(vc, animated: true)
    }
}
```

In `WebContainer.makeUIView`, register a handler that forwards `omniShare` messages (added only in this branch):
```swift
// makeUIView 내 config 설정 직후:
config.userContentController.add(context.coordinator, name: "omniShare")
```
And on the Coordinator add `WKScriptMessageHandler`:
```swift
extension WebContainer.Coordinator: WKScriptMessageHandler {
    func userContentController(_ uc: WKUserContentController, didReceive message: WKScriptMessage) {
        guard message.name == "omniShare",
              let payload = SharePayload.decode(message.body),
              let view = webView else { return }
        ShareCoordinator.present(payload, from: view)
    }
}
```

> 웹 shim(별도 승인): `if (window.webkit?.messageHandlers?.omniShare) { window.webkit.messageHandlers.omniShare.postMessage({text, url}); } else { navigator.share?.(...) }`. 웹 저장소 변경이므로 이 스텝은 승인 전까지 진행하지 않는다.

- [ ] **Step 4: Run tests / manual share**

Step 1이 성공했다면 이 태스크는 검증 메모로 끝. 실패해 브리지를 만들었다면: `xcodebuild ... test`로 `SharePayloadTests` 통과 확인 + (승인 후) 수동 공유 확인.

- [ ] **Step 5: Commit**

```bash
git add ios/OmniMind ios/OmniMindTests 2>/dev/null
git commit -m "feat(ios): 공유 경로 검증 — navigator.share 네이티브 매핑 확인(또는 폴백 브리지 수신부)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

# P2 — 홈 화면 위젯

## Task 7: App Group + 위젯 데이터 저장 + WebView localStorage 읽기

**Files:**
- Modify: `ios/project.yml` (App Group 엔타이틀먼트, 위젯 타깃 추가)
- Create: `ios/OmniMind/Widget/WidgetDataStore.swift`
- Create: `ios/OmniMind/Widget/WebBridge.swift`
- Modify: `ios/OmniMind/Web/WebContainer.swift` (포그라운드 복귀 시 오늘 요약 읽기)
- Test: `ios/OmniMindTests/WidgetDataStoreTests.swift`

**Interfaces:**
- Produces:
  - `struct TodayWidgetData: Codable, Equatable` — `let headline: String`, `let updatedAt: Date`.
  - `enum WidgetDataStore` — `static let appGroup = "group.com.omnimind.app"`, `static func save(_ d: TodayWidgetData)`, `static func load() -> TodayWidgetData?`; 순수 헬퍼 `static func encode(_:) -> Data`, `static func decode(_ data: Data) -> TodayWidgetData?`.
  - `enum WebBridge` — `static func readToday(from webView: WKWebView) async -> TodayWidgetData?`.

- [ ] **Step 1: Determine the web's daily-summary localStorage key (discovery)**

웹 저장소에서 데일리 결과 캐시 키를 찾는다:
```bash
grep -rn "localStorage.setItem\|localStorage.getItem" src/lib/today src/lib/readings src/components/today | grep -iE "cache|today|daily|extras|headline"
```
찾은 키를 `WebBridge.todayCacheKey` 상수로 고정한다. **깔끔한 요약 문자열 캐시가 없으면**(예: 헤드라인만 따로 저장하지 않는 구조), 위젯은 폴백 카피만 쓰기로 하고 `readToday`는 항상 `nil`을 반환하도록 두되, 최소한 입력 존재 키(`om-today-birth`, `src/lib/today/birth-store.ts:10`)로 "오늘의 기운 준비됨" 여부만 판별한다. (아래 구현은 요약 키 발견 시나리오 기준이며, 미발견 시 `todayCacheKey`를 `om-today-birth`로 두고 `headline`을 고정 카피로 채운다.)

- [ ] **Step 2: Write the failing test for WidgetDataStore encode/decode**

`ios/OmniMindTests/WidgetDataStoreTests.swift`:
```swift
import XCTest
@testable import OmniMind

final class WidgetDataStoreTests: XCTestCase {
    func testEncodeDecodeRoundTrip() {
        let d = TodayWidgetData(headline: "오늘은 기다림이 어울리는 날",
                                updatedAt: Date(timeIntervalSince1970: 1_754_000_000))
        let bytes = WidgetDataStore.encode(d)
        XCTAssertEqual(WidgetDataStore.decode(bytes), d)
    }
    func testDecodeGarbageIsNil() {
        XCTAssertNil(WidgetDataStore.decode(Data([0x00, 0x01])))
    }
}
```

- [ ] **Step 3: Run test to verify it fails**

Expected: FAIL — `TodayWidgetData`/`WidgetDataStore` 미정의.

- [ ] **Step 4: Implement store + bridge, add entitlement + widget target**

`ios/OmniMind/Widget/WidgetDataStore.swift`:
```swift
import Foundation

struct TodayWidgetData: Codable, Equatable {
    let headline: String
    let updatedAt: Date
}

enum WidgetDataStore {
    static let appGroup = "group.com.omnimind.app"
    private static let key = "today.widget.data"

    static func encode(_ d: TodayWidgetData) -> Data { (try? JSONEncoder().encode(d)) ?? Data() }
    static func decode(_ data: Data) -> TodayWidgetData? { try? JSONDecoder().decode(TodayWidgetData.self, from: data) }

    static func save(_ d: TodayWidgetData) {
        UserDefaults(suiteName: appGroup)?.set(encode(d), forKey: key)
    }
    static func load() -> TodayWidgetData? {
        guard let data = UserDefaults(suiteName: appGroup)?.data(forKey: key) else { return nil }
        return decode(data)
    }
}
```

`ios/OmniMind/Widget/WebBridge.swift`:
```swift
import WebKit

enum WebBridge {
    /// Step 1에서 확정한 키. 요약 캐시가 없으면 om-today-birth로 두고 headline은 고정 카피.
    static let todayCacheKey = "om-today-birth"

    @MainActor
    static func readToday(from webView: WKWebView) async -> TodayWidgetData? {
        let js = "localStorage.getItem('\(todayCacheKey)')"
        let raw = try? await webView.evaluateJavaScript(js)
        guard let str = raw as? String, !str.isEmpty else { return nil }
        // 요약 키가 있으면 파싱해 headline 추출. 없으면 존재만으로 준비됨 표시.
        return TodayWidgetData(headline: "오늘의 기운이 준비됐어요", updatedAt: Date())
    }
}
```
> `readToday`가 `Date()`를 쓰는 것은 위젯 표시용 타임스탬프로 순수성 대상이 아니다. 순수 로직(encode/decode)만 테스트한다.

`ios/project.yml` — App Group 엔타이틀먼트 + 위젯 타깃 추가:
```yaml
# targets 아래 OmniMind에 추가:
    entitlements:
      path: OmniMind/OmniMind.entitlements
      properties:
        com.apple.security.application-groups: [group.com.omnimind.app]

# targets에 신규 위젯 타깃 추가:
  OmniMindWidget:
    type: app-extension
    platform: iOS
    sources: [OmniMindWidget, OmniMind/Widget]   # 데이터 스토어 공유
    settings:
      base:
        PRODUCT_BUNDLE_IDENTIFIER: com.omnimind.app.widget
        INFOPLIST_KEY_CFBundleDisplayName: 오늘의 기운
    info:
      properties:
        NSExtension:
          NSExtensionPointIdentifier: com.apple.widgetkit-extension
    entitlements:
      path: OmniMindWidget/OmniMindWidget.entitlements
      properties:
        com.apple.security.application-groups: [group.com.omnimind.app]
# OmniMind 앱 타깃 dependencies에 추가:
      - target: OmniMindWidget
```

`ios/OmniMind/Web/WebContainer.swift` — 포그라운드 복귀 시 읽어 저장(Coordinator에 추가):
```swift
import WidgetKit
// makeUIView에서 웹뷰 생성 직후 옵저버 등록:
NotificationCenter.default.addObserver(context.coordinator,
    selector: #selector(Coordinator.syncWidget),
    name: UIApplication.willResignActiveNotification, object: nil)

// Coordinator에 추가:
@objc func syncWidget() {
    guard let webView else { return }
    Task { @MainActor in
        if let data = await WebBridge.readToday(from: webView) {
            WidgetDataStore.save(data)
            WidgetCenter.shared.reloadAllTimelines()
        }
    }
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `xcodebuild ... test`
Expected: `WidgetDataStoreTests` PASS. (위젯 타깃 추가 후에도 앱 빌드 성공.)

- [ ] **Step 6: Commit**

```bash
git add ios/project.yml ios/OmniMind
git commit -m "feat(ios): App Group + 위젯 데이터 스토어 + WebView 오늘 요약 읽기

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 8: WidgetKit 위젯 UI + 타임라인

**Files:**
- Create: `ios/OmniMindWidget/OmniWidget.swift`
- Create: `ios/OmniMindWidget/TodayProvider.swift`
- Test: 위젯 뷰는 수동 미리보기 + 시뮬레이터 배치로 검증(순수 로직은 Task 7에서 커버).

**Interfaces:**
- Consumes: `TodayWidgetData`, `WidgetDataStore.load()` (Task 7).
- Produces: `struct OmniWidget: Widget`, `struct TodayProvider: TimelineProvider`, `struct TodayEntry: TimelineEntry`.

- [ ] **Step 1: Implement provider + widget**

`ios/OmniMindWidget/TodayProvider.swift`:
```swift
import WidgetKit
import SwiftUI

struct TodayEntry: TimelineEntry {
    let date: Date
    let headline: String
}

struct TodayProvider: TimelineProvider {
    private var current: TodayEntry {
        if let d = WidgetDataStore.load() {
            return TodayEntry(date: d.updatedAt, headline: d.headline)
        }
        return TodayEntry(date: Date(), headline: "앱을 열어 오늘의 기운을 확인하세요")
    }
    func placeholder(in context: Context) -> TodayEntry {
        TodayEntry(date: Date(), headline: "오늘의 기운")
    }
    func getSnapshot(in context: Context, completion: @escaping (TodayEntry) -> Void) {
        completion(current)
    }
    func getTimeline(in context: Context, completion: @escaping (Timeline<TodayEntry>) -> Void) {
        // 다음 정오·자정 등 4시간마다 갱신(앱이 최신값을 넣어두면 그때 반영).
        let next = Calendar.current.date(byAdding: .hour, value: 4, to: Date()) ?? Date()
        completion(Timeline(entries: [current], policy: .after(next)))
    }
}
```

`ios/OmniMindWidget/OmniWidget.swift`:
```swift
import WidgetKit
import SwiftUI

struct OmniWidgetView: View {
    let entry: TodayEntry
    var body: some View {
        ZStack {
            Color(red: 0.99, green: 0.98, blue: 0.97)
            VStack(alignment: .leading, spacing: 6) {
                Text("오늘의 기운 🌙").font(.caption2).foregroundStyle(.secondary)
                Text(entry.headline).font(.callout).bold()
                    .foregroundStyle(Color(red: 0.18, green: 0.35, blue: 0.29))
                    .lineLimit(3).minimumScaleFactor(0.8)
            }.padding(12)
        }
    }
}

@main
struct OmniWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "OmniTodayWidget", provider: TodayProvider()) { entry in
            if #available(iOS 17.0, *) {
                OmniWidgetView(entry: entry).containerBackground(.fill, for: .widget)
            } else {
                OmniWidgetView(entry: entry)
            }
        }
        .configurationDisplayName("오늘의 기운")
        .description("매일 아침, 오늘의 기운 한 줄을 홈 화면에서.")
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}
```

- [ ] **Step 2: Build widget target**

```bash
cd ios && xcodegen generate
xcodebuild -project OmniMind.xcodeproj -scheme OmniMindWidget -destination "platform=iOS Simulator,name=iPhone 17" build
```
Expected: 위젯 타깃 빌드 성공.

- [ ] **Step 3: Manual verification**

시뮬레이터: 앱을 한 번 실행(오늘 화면까지) → 홈으로 나가 위젯 추가 → "오늘의 기운" 위젯이 값(또는 폴백 카피)을 표시하는지 확인.

- [ ] **Step 4: Commit**

```bash
git add ios/OmniMindWidget
git commit -m "feat(ios): 오늘의 기운 홈 위젯(WidgetKit) + 폴백 카피

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

# P3 — 출시 준비

## Task 9: 앱 아이콘 · 런치 스크린 · Info.plist 마감

**Files:**
- Create: `ios/OmniMind/Resources/Assets.xcassets/AppIcon.appiconset/` (1024pt 아이콘 포함)
- Modify: `ios/project.yml` (아이콘·런치 스크린·개인정보 문자열)

**Interfaces:**
- Consumes: 없음(자산·설정만).
- Produces: 배포용 앱 아이콘·런치 스크린이 붙은 빌드.

- [ ] **Step 1: Add app icon asset**

페르소나 아트(예: 달지기) 기반 1024×1024 PNG(투명·알파 없음)를 `AppIcon.appiconset`에 추가하고 `Contents.json`을 단일 1024 아이콘 형식으로 작성:
```json
{
  "images": [{ "idiom": "universal", "platform": "ios", "size": "1024x1024", "filename": "AppIcon-1024.png" }],
  "info": { "author": "xcode", "version": 1 }
}
```
> 아이콘 소스가 없으면 `public/images/persona`의 달지기 이미지를 1024 정사각으로 가공해 사용. 최종 아트는 디자이너 확정본으로 교체 가능.

- [ ] **Step 2: Configure launch screen + display name in project.yml**

`OmniMind` 타깃 settings.base에 추가:
```yaml
        ASSETCATALOG_COMPILER_APPICON_NAME: AppIcon
        INFOPLIST_KEY_UILaunchScreen_Generation: YES
```
런치 스크린은 웜 베이지 단색 배경으로 시작(별도 스토리보드 없이 생성 키 사용). 필요 시 `UILaunchScreen` 딕셔너리에 배경색 지정.

- [ ] **Step 3: Build + visual check**

```bash
cd ios && xcodegen generate && xcodebuild ... build
```
시뮬레이터에서 홈 화면 아이콘·런치 화면 색이 브랜드에 맞는지 확인.

- [ ] **Step 4: Commit**

```bash
git add ios/OmniMind/Resources ios/project.yml
git commit -m "feat(ios): 앱 아이콘 + 브랜드 런치 스크린 + 표시 이름

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 10: App Store 제출 준비 문서 (개인정보·심사 노트·체크리스트)

**Files:**
- Create: `ios/RELEASE.md`

**Interfaces:**
- Consumes: 스펙 §6.
- Produces: 제출 시 그대로 쓰는 App Privacy 응답·심사 노트·스크린샷 체크리스트.

- [ ] **Step 1: Write RELEASE.md**

`ios/RELEASE.md`에 아래를 작성:
- **App Privacy 응답:** 프로필·기록은 기기(WKWebView localStorage) 저장, 서버 미수집 → 대부분 "Data Not Collected". 예외 후보 2가지와 판정:
  - Vercel/Supabase 익명 지표(events): "Analytics(비식별, 사용자 미연결)"로 신고할지 여부 — 제출 시점 events 실사용 확인 후 결정.
  - 카카오 AdFit: `NEXT_PUBLIC_ADFIT_UNIT` 활성 시에만 WebView 내 표시. 활성 시 "Third-Party Advertising" 신고. **네이티브 광고 SDK 아님 → IDFA/ATT 불필요.**
- **심사 노트(4.2 대응):** "웹뷰 셸이지만 로컬 알림(온디바이스 데일리)·오프라인 경험·네이티브 공유·네이티브 설정·홈 위젯을 제공한다"를 명시. 익명 서비스라 로그인 없이 전 기능 이용 가능함을 안내.
- **지원/개인정보 URL:** `https://omni-mind-i6uj.vercel.app/privacy`, `.../contact`.
- **스크린샷 체크리스트:** 6.7"·6.5"(또는 요구되는 최신 규격) — 홈(오늘)·프로필(나)·알림 설정·오프라인·위젯 5종.
- **버전/빌드:** `MARKETING_VERSION 1.0.0` / `CURRENT_PROJECT_VERSION` 증가 규칙.
- **서명:** `DEVELOPMENT_TEAM` 입력, 자동 서명 사용, App Store Connect에 `com.omnimind.app` 등록.

- [ ] **Step 2: Full manual verification matrix (스펙 §8)**

`ios/RELEASE.md` 하단에 체크리스트로 남기고 1회 완주:
1. 콜드 런치 → 사이트 로드
2. 온보딩·오늘·마음·사주 주요 플로우 동작
3. 오프라인 → 오프라인 화면 → 재연결 복구
4. 알림 권한 → 스케줄 → 발화 → 탭 → `/today`
5. 공유 시트 표시·이미지/카드 공유
6. 앱 재실행 후 localStorage 프로필·기록 유지
7. 외부 링크가 Safari로 열림
8. (P2) 위젯 값/폴백 표시

- [ ] **Step 3: Web regression gate**

웹 미변경 확인:
```bash
cd /Users/swssmjy86/OmniMind && npm run verify
```
Expected: 기존과 동일하게 통과(iOS 추가가 웹 빌드에 영향 없음). shim을 승인받아 넣었다면 여기서 반드시 통과해야 함.

- [ ] **Step 4: Commit**

```bash
git add ios/RELEASE.md
git commit -m "docs(ios): App Store 제출 준비 — 개인정보 응답·심사 노트·검증 매트릭스

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## 자기 점검 결과(작성자 확인)

- **스펙 커버리지:** §3 컴포넌트 9종 → Task 1~8에 매핑. §4 웹 무변경 원칙 → 공유(Task 6)·위젯(Task 7) 모두 웹 읽기/네이티브 수신만. §5 네이티브 기능(알림·오프라인·공유·위젯) → Task 3~8. §6 App Store → Task 9~10. §7 로드맵 P0~P3 → Task 1~10. §8 검증 → Task 10 매트릭스.
- **플레이스홀더:** 코드 스텝은 실제 코드 포함. Task 6·7은 "측정 먼저/탐색" 스텝으로 분기가 명시돼 있고, 미발견 시 폴백 동작을 구체화(placeholder 아님).
- **타입 일관성:** `WebViewModel`(reload/requestDeepLink/loadFailed/reloadToken), `NotificationManager`(reschedule/dailyContent/onDeepLink/deepLinkPath="/today"), `TodayWidgetData`(headline/updatedAt), `WidgetDataStore`(encode/decode/save/load) — 태스크 간 시그니처 일치.
