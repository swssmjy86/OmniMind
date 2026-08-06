import SwiftUI
import WebKit
import WidgetKit

struct WebContainer: UIViewRepresentable {
    @ObservedObject var model: WebViewModel

    func makeCoordinator() -> Coordinator { Coordinator(model: model) }

    func makeUIView(context: Context) -> WKWebView {
        let config = WKWebViewConfiguration()
        config.websiteDataStore = .default()            // Safari와 분리된 영속 저장
        config.allowsInlineMediaPlayback = true
        // navigator.share 폴백 브리지(Task 6) — 웹이 window.webkit.messageHandlers.omniShare로
        // postMessage하면 네이티브 공유 시트를 띄운다. 웹 shim은 별도 승인 전까지 미적용이라
        // 현재는 대기 상태(무해)다.
        config.userContentController.add(context.coordinator, name: "omniShare")
        let webView = WKWebView(frame: .zero, configuration: config)
        webView.navigationDelegate = context.coordinator
        webView.uiDelegate = context.coordinator
        webView.allowsBackForwardNavigationGestures = true
        let rc = UIRefreshControl()
        rc.addTarget(context.coordinator, action: #selector(Coordinator.refresh(_:)), for: .valueChanged)
        webView.scrollView.refreshControl = rc
        context.coordinator.webView = webView
        webView.load(URLRequest(url: AppConfig.productionURL))
        NotificationCenter.default.addObserver(context.coordinator,
            selector: #selector(Coordinator.syncWidget),
            name: UIApplication.willResignActiveNotification, object: nil)
        return webView
    }

    func updateUIView(_ webView: WKWebView, context: Context) {
        if let deep = model.pendingDeepLink {
            webView.load(URLRequest(url: deep))
            DispatchQueue.main.async { self.model.pendingDeepLink = nil }
        }
        if model.reloadToken != context.coordinator.lastReloadToken {
            context.coordinator.lastReloadToken = model.reloadToken
            webView.load(URLRequest(url: AppConfig.productionURL))
        }
    }

    final class Coordinator: NSObject, WKNavigationDelegate, WKUIDelegate {
        let model: WebViewModel
        weak var webView: WKWebView?
        var lastReloadToken = 0
        init(model: WebViewModel) { self.model = model }

        @objc func refresh(_ sender: UIRefreshControl) { webView?.reload() }

        /// 앱이 백그라운드로 물러날 때 웹의 오늘 요약을 읽어 위젯 공유 저장소에 반영한다(Task 7).
        @objc func syncWidget() {
            guard let webView else { return }
            Task { @MainActor in
                if let data = await WebBridge.readToday(from: webView) {
                    WidgetDataStore.save(data)
                    WidgetCenter.shared.reloadAllTimelines()
                }
            }
        }

        func webView(_ webView: WKWebView, didFinish nav: WKNavigation!) {
            webView.scrollView.refreshControl?.endRefreshing()
            model.loadFailed = false
        }
        func webView(_ webView: WKWebView, didFail nav: WKNavigation!, withError e: Error) {
            webView.scrollView.refreshControl?.endRefreshing()
            guard (e as NSError).code != NSURLErrorCancelled else { return }
            model.didFailLoad()
        }
        func webView(_ webView: WKWebView, didFailProvisionalNavigation nav: WKNavigation!, withError e: Error) {
            webView.scrollView.refreshControl?.endRefreshing()
            guard (e as NSError).code != NSURLErrorCancelled else { return }
            model.didFailLoad()
        }

        func webView(_ webView: WKWebView, decidePolicyFor action: WKNavigationAction,
                     decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
            if let url = action.request.url, AppConfig.isExternalNavigation(url) {
                UIApplication.shared.open(url)
                decisionHandler(.cancel); return
            }
            decisionHandler(.allow)
        }

        func webView(_ webView: WKWebView, createWebViewWith config: WKWebViewConfiguration,
                     for action: WKNavigationAction, windowFeatures: WKWindowFeatures) -> WKWebView? {
            if let url = action.request.url {
                if AppConfig.isExternalNavigation(url) { UIApplication.shared.open(url) }
                else { webView.load(URLRequest(url: url)) }
            }
            return nil
        }
    }
}

/// navigator.share 폴백 브리지 수신부(Task 6). 웹이 아직 `omniShare`로 postMessage하지 않으므로
/// (웹 shim은 별도 승인 대기) 현재는 등록만 돼 있고 실사용되지 않는 대기 경로다.
extension WebContainer.Coordinator: WKScriptMessageHandler {
    func userContentController(_ uc: WKUserContentController, didReceive message: WKScriptMessage) {
        guard message.name == "omniShare",
              let payload = SharePayload.decode(message.body),
              let view = webView else { return }
        ShareCoordinator.present(payload, from: view)
    }
}
