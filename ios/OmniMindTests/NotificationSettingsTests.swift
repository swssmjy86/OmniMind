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
