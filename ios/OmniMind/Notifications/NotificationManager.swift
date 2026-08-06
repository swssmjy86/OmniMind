import Foundation
import UserNotifications

@MainActor
final class NotificationManager: NSObject, ObservableObject, UNUserNotificationCenterDelegate {
    static let dailyIdentifier = "omni.daily"
    static let deepLinkPath = "/today"
    private let center = UNUserNotificationCenter.current()
    var onDeepLink: ((String) -> Void)?

    func registerDelegate() { center.delegate = self }

    func requestAuthorization() async -> Bool {
        (try? await center.requestAuthorization(options: [.alert, .sound, .badge])) ?? false
    }

    func reschedule(_ settings: NotificationSettings) async {
        center.removePendingNotificationRequests(withIdentifiers: [Self.dailyIdentifier])
        guard settings.isEnabled else { return }
        var comps = DateComponents(); comps.hour = settings.hour; comps.minute = settings.minute
        let trigger = UNCalendarNotificationTrigger(dateMatching: comps, repeats: true)
        let req = UNNotificationRequest(identifier: Self.dailyIdentifier,
                                        content: Self.dailyContent(), trigger: trigger)
        try? await center.add(req)
    }

    nonisolated static func dailyContent() -> UNMutableNotificationContent {
        let c = UNMutableNotificationContent()
        c.title = "옴니마인드"
        c.body = "오늘의 기운이 도착했어요 🌙"
        c.sound = .default
        c.userInfo = ["deepLink": deepLinkPath]
        return c
    }

    nonisolated func userNotificationCenter(_ center: UNUserNotificationCenter,
        didReceive response: UNNotificationResponse) async {
        let info = response.notification.request.content.userInfo
        if let path = info["deepLink"] as? String {
            await MainActor.run { self.onDeepLink?(path) }
        }
    }
    nonisolated func userNotificationCenter(_ center: UNUserNotificationCenter,
        willPresent notification: UNNotification) async -> UNNotificationPresentationOptions {
        [.banner, .sound]
    }
}
