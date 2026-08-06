import Foundation

/// 오늘 위젯이 표시할 요약 한 줄. `updatedAt`은 위젯 표시용 타임스탬프.
struct TodayWidgetData: Codable, Equatable {
    let headline: String
    let updatedAt: Date
}

/// App Group 공유 컨테이너를 통해 앱과 위젯 익스텐션(Task 8)이 오늘의 요약을 주고받는 저장소.
enum WidgetDataStore {
    static let appGroup = "group.com.omnimind.app"
    private static let key = "today.widget.data"

    static func encode(_ d: TodayWidgetData) -> Data { (try? JSONEncoder().encode(d)) ?? Data() }
    static func decode(_ data: Data) -> TodayWidgetData? { try? JSONDecoder().decode(TodayWidgetData.self, from: data) }

    static func save(_ d: TodayWidgetData) {
        UserDefaults(suiteName: appGroup)?.set(encode(d), forKey: key)
    }

    static func load() -> TodayWidgetData? {
        guard let data = UserDefaults(suiteName: appGroup)?.data(forKey: key) else { return nil }
        return decode(data)
    }
}
