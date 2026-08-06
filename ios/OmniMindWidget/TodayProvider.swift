import WidgetKit
import SwiftUI

struct TodayEntry: TimelineEntry {
    let date: Date
    let headline: String
}

struct TodayProvider: TimelineProvider {
    private var current: TodayEntry {
        if let d = WidgetDataStore.load() {
            return TodayEntry(date: d.updatedAt, headline: d.headline)
        }
        return TodayEntry(date: Date(), headline: "앱을 열어 오늘의 기운을 확인하세요")
    }
    func placeholder(in context: Context) -> TodayEntry {
        TodayEntry(date: Date(), headline: "오늘의 기운")
    }
    func getSnapshot(in context: Context, completion: @escaping (TodayEntry) -> Void) {
        completion(current)
    }
    func getTimeline(in context: Context, completion: @escaping (Timeline<TodayEntry>) -> Void) {
        // 다음 정오·자정 등 4시간마다 갱신(앱이 최신값을 넣어두면 그때 반영).
        let next = Calendar.current.date(byAdding: .hour, value: 4, to: Date()) ?? Date()
        completion(Timeline(entries: [current], policy: .after(next)))
    }
}
