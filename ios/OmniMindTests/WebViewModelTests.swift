import XCTest
@testable import OmniMind

final class WebViewModelTests: XCTestCase {
    func testReloadClearsFailureAndIncrementsToken() {
        let model = WebViewModel()
        model.loadFailed = true
        model.reloadToken = 3

        model.reload()

        XCTAssertFalse(model.loadFailed)
        XCTAssertEqual(model.reloadToken, 4)
    }

    func testDidFailLoadSetsFailureFlag() {
        let model = WebViewModel()

        model.didFailLoad()

        XCTAssertTrue(model.loadFailed)
    }

    func testRequestDeepLinkSetsPendingDeepLink() {
        let model = WebViewModel()

        model.requestDeepLink(path: "/today")

        XCTAssertEqual(model.pendingDeepLink, AppConfig.url(path: "/today"))
        XCTAssertEqual(model.pendingDeepLink?.absoluteString, "https://omni-mind-i6uj.vercel.app/today")
    }
}
