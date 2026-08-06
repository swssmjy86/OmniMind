import UIKit

/// `omniShare` 메시지 핸들러가 받은 페이로드를 네이티브 공유 시트(UIActivityViewController)로 띄운다.
enum ShareCoordinator {
    static func present(_ payload: SharePayload, from source: UIView) {
        var items: [Any] = []
        if let t = payload.text { items.append(t) }
        if let u = payload.url { items.append(u) }
        guard !items.isEmpty else { return }
        let vc = UIActivityViewController(activityItems: items, applicationActivities: nil)
        vc.popoverPresentationController?.sourceView = source
        source.window?.rootViewController?.present(vc, animated: true)
    }
}
