import Foundation

struct NotificationSettings: Equatable {
    var isEnabled: Bool
    var hour: Int
    var minute: Int
    static let `default` = NotificationSettings(isEnabled: false, hour: 8, minute: 0)
}

enum NotificationSettingsStore {
    static let enabledKey = "notif.enabled"
    static let hourKey = "notif.hour"
    static let minuteKey = "notif.minute"

    static func load(from d: UserDefaults) -> NotificationSettings {
        guard d.object(forKey: enabledKey) != nil else { return .default }
        return NotificationSettings(
            isEnabled: d.bool(forKey: enabledKey),
            hour: d.integer(forKey: hourKey),
            minute: d.integer(forKey: minuteKey)
        )
    }
    static func save(_ s: NotificationSettings, to d: UserDefaults) {
        d.set(s.isEnabled, forKey: enabledKey)
        d.set(s.hour, forKey: hourKey)
        d.set(s.minute, forKey: minuteKey)
    }
}
