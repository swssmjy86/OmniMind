import SwiftUI

@main
struct OmniMindApp: App {
    @StateObject private var notifications = NotificationManager()
    @StateObject private var webModel = WebViewModel()

    var body: some Scene {
        WindowGroup {
            RootView(webModel: webModel, notifications: notifications)
                .tint(.omniCoral)
                .onAppear {
                    notifications.registerDelegate()
                    notifications.onDeepLink = { path in webModel.requestDeepLink(path: path) }
                    Task {
                        await notifications.reschedule(NotificationSettingsStore.load(from: .standard))
                    }
                }
        }
    }
}
