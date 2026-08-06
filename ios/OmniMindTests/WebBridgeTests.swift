import XCTest
@testable import OmniMind

/// `Optional<String>.nonBlank`(WebBridge.swift) — 빈 문자열/공백 문자열을 nil로 취급해
/// 위젯 헤드라인 `??` 폴백 체인이 빈 값을 "존재하는 값"으로 오인하지 않도록 하는 헬퍼.
final class WebBridgeTests: XCTestCase {
    func testEmptyStringIsBlank() {
        let value: String? = ""
        XCTAssertNil(value.nonBlank)
    }

    func testWhitespaceOnlyStringIsBlank() {
        let value: String? = "  \n\t "
        XCTAssertNil(value.nonBlank)
    }

    func testNilStaysNil() {
        let value: String? = nil
        XCTAssertNil(value.nonBlank)
    }

    func testNonBlankStringIsPreserved() {
        let value: String? = "오늘은 기다림이 어울리는 날"
        XCTAssertEqual(value.nonBlank, value)
    }

    func testFallbackChainSkipsBlankPersonal() {
        let personal: String? = ""
        let zodiacLine: String? = "차분히 흘러가는 하루"
        let headline = personal.nonBlank ?? zodiacLine.nonBlank ?? "오늘의 기운이 준비됐어요"
        XCTAssertEqual(headline, zodiacLine)
    }
}
