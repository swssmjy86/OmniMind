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
