import SwiftUI

final class WebViewModel: ObservableObject {
    @Published var pendingDeepLink: URL?
    @Published var loadFailed = false
    @Published var reloadToken = 0

    func requestDeepLink(path: String) { pendingDeepLink = AppConfig.url(path: path) }
    func reload() { loadFailed = false; reloadToken += 1 }
    func didFailLoad() { loadFailed = true }
}
