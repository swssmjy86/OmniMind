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
