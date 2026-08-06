import WebKit

/// 웹뷰의 localStorage에서 오늘의 개인화 요약을 읽어와 위젯용 데이터로 변환한다.
enum WebBridge {
    /// `src/components/today/TodayFreeFlow.tsx`의 `EXTRAS_KEY`와 동일한 캐시 키.
    static let todayCacheKey = "om-today-extras"

    /// 캐시 JSON 파싱용 미러 구조체. 웹의 `GuestDailyExtras`(src/lib/today/actions.ts) 형태를 따른다.
    private struct CachedExtras: Decodable {
        struct Zodiac: Decodable { let animal: String; let line: String }
        struct Extras: Decodable {
            let date: String
            let personal: String?
            let zodiac: Zodiac?
            let story: String?
        }
        let birthDate: String?
        let birthTime: String?
        let extras: Extras?
    }

    @MainActor
    static func readToday(from webView: WKWebView) async -> TodayWidgetData? {
        let js = "localStorage.getItem('\(todayCacheKey)')"
        guard let raw = try? await webView.evaluateJavaScript(js),
              let str = raw as? String, !str.isEmpty,
              let data = str.data(using: .utf8),
              let cached = try? JSONDecoder().decode(CachedExtras.self, from: data)
        else { return nil }

        let headline = (cached.extras?.personal).nonBlank
            ?? (cached.extras?.zodiac?.line).nonBlank
            ?? "오늘의 기운이 준비됐어요"
        return TodayWidgetData(headline: headline, updatedAt: Date())
    }
}

extension Optional where Wrapped == String {
    /// 공백/빈 문자열을 nil로 취급해 `??` 체인에서 다음 폴백으로 넘어가게 한다.
    var nonBlank: String? {
        guard let self, !self.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else { return nil }
        return self
    }
}
