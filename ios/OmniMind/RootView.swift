import SwiftUI

struct RootView: View {
    @ObservedObject var webModel: WebViewModel
    @ObservedObject var notifications: NotificationManager
    @StateObject private var reachability = ReachabilityMonitor()
    @State private var showSettings = false

    private var showOffline: Bool { !reachability.isConnected || webModel.loadFailed }

    var body: some View {
        ZStack(alignment: .topTrailing) {
            WebContainer(model: webModel).ignoresSafeArea(.container, edges: .bottom)

            Button { showSettings = true } label: {
                Image(systemName: "bell").padding(10)
                    .background(.ultraThinMaterial, in: Circle())
            }
            .padding(.top, 8).padding(.trailing, 12)
            .accessibilityLabel("알림 설정")

            if showOffline {
                OfflineView { webModel.reload() }.transition(.opacity)
            }
        }
        .animation(.easeInOut, value: showOffline)
        .sheet(isPresented: $showSettings) { SettingsView(manager: notifications) }
    }
}
