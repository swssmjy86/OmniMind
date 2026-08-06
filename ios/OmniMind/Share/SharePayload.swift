import Foundation

/// 웹 → 네이티브 공유 브리지 페이로드. `navigator.share`가 WKWebView에서 이미 동작한다면
/// 이 경로는 쓰이지 않는다(더미 대기 상태) — Task 6 브리핑 참조.
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
