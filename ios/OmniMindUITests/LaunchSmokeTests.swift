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
