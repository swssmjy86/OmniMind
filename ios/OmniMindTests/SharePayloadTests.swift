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
