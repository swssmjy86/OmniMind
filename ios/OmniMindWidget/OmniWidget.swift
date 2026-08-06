import WidgetKit
import SwiftUI

struct OmniWidgetView: View {
    let entry: TodayEntry
    var body: some View {
        ZStack {
            Color(red: 0.99, green: 0.98, blue: 0.97)
            VStack(alignment: .leading, spacing: 6) {
                Text("오늘의 기운 🌙").font(.caption2).foregroundStyle(.secondary)
                Text(entry.headline).font(.callout).bold()
                    .foregroundStyle(Color(red: 0.18, green: 0.35, blue: 0.29))
                    .lineLimit(3).minimumScaleFactor(0.8)
            }.padding(12)
        }
    }
}

@main
struct OmniWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "OmniTodayWidget", provider: TodayProvider()) { entry in
            if #available(iOS 17.0, *) {
                OmniWidgetView(entry: entry).containerBackground(.fill, for: .widget)
            } else {
                OmniWidgetView(entry: entry)
            }
        }
        .configurationDisplayName("오늘의 기운")
        .description("매일 아침, 오늘의 기운 한 줄을 홈 화면에서.")
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}
