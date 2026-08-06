import SwiftUI

struct RootView: View {
    @StateObject private var webModel = WebViewModel()
    @StateObject private var reachability = ReachabilityMonitor()

    private var showOffline: Bool { !reachability.isConnected || webModel.loadFailed }

    var body: some View {
        ZStack {
            WebContainer(model: webModel)
                .ignoresSafeArea(.container, edges: .bottom)
            if showOffline {
                OfflineView { webModel.reload() }
                    .transition(.opacity)
            }
        }
        .animation(.easeInOut, value: showOffline)
    }
}
