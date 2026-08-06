import SwiftUI
import WebKit

struct WebContainer: UIViewRepresentable {
    @ObservedObject var model: WebViewModel

    func makeCoordinator() -> Coordinator { Coordinator(model: model) }

    func makeUIView(context: Context) -> WKWebView {
        let config = WKWebViewConfiguration()
        config.websiteDataStore = .default()            // Safari와 분리된 영속 저장
        config.allowsInlineMediaPlayback = true
        let webView = WKWebView(frame: .zero, configuration: config)
        webView.navigationDelegate = context.coordinator
        webView.uiDelegate = context.coordinator
        webView.allowsBackForwardNavigationGestures = true
        let rc = UIRefreshControl()
        rc.addTarget(context.coordinator, action: #selector(Coordinator.refresh(_:)), for: .valueChanged)
        webView.scrollView.refreshControl = rc
        context.coordinator.webView = webView
        webView.load(URLRequest(url: AppConfig.productionURL))
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

        func webView(_ webView: WKWebView, didFinish nav: WKNavigation!) {
            webView.scrollView.refreshControl?.endRefreshing()
        }
        func webView(_ webView: WKWebView, didFail nav: WKNavigation!, withError e: Error) {
            webView.scrollView.refreshControl?.endRefreshing(); model.didFailLoad()
        }
        func webView(_ webView: WKWebView, didFailProvisionalNavigation nav: WKNavigation!, withError e: Error) {
            webView.scrollView.refreshControl?.endRefreshing(); model.didFailLoad()
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
