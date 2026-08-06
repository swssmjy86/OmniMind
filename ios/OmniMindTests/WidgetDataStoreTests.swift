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
