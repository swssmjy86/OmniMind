import Foundation

enum AppConfig {
    static let productionURL = URL(string: "https://omni-mind-i6uj.vercel.app")!
    static let allowedHost = "omni-mind-i6uj.vercel.app"

    /// 앱 호스트(http/https) 이외의 모든 목적지는 외부(시스템 앱)로 연다.
    static func isExternalNavigation(_ url: URL) -> Bool {
        guard let scheme = url.scheme?.lowercased() else { return true }
        guard scheme == "http" || scheme == "https" else { return true }
        return url.host != allowedHost
    }

    /// 딥링크 경로를 프로덕션 URL에 결합.
    static func url(path: String) -> URL {
        URL(string: path, relativeTo: productionURL)?.absoluteURL ?? productionURL
    }
}
