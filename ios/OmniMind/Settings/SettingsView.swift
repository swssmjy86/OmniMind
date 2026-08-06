import SwiftUI

struct SettingsView: View {
    @ObservedObject var manager: NotificationManager
    @Environment(\.dismiss) private var dismiss
    @State private var settings = NotificationSettingsStore.load(from: .standard)
    @State private var deniedAlert = false

    private var time: Binding<Date> {
        Binding(
            get: {
                Calendar.current.date(from: DateComponents(hour: settings.hour, minute: settings.minute)) ?? Date()
            },
            set: { newDate in
                let c = Calendar.current.dateComponents([.hour, .minute], from: newDate)
                settings.hour = c.hour ?? 8; settings.minute = c.minute ?? 0
                persist()
            })
    }

    var body: some View {
        NavigationStack {
            Form {
                Section("데일리 알림") {
                    Toggle("매일 오늘의 기운 알림", isOn: Binding(
                        get: { settings.isEnabled },
                        set: { on in Task { await toggle(on) } }))
                    if settings.isEnabled {
                        DatePicker("받을 시각", selection: time, displayedComponents: .hourAndMinute)
                    }
                }
                Section {
                    Text("알림은 이 기기에서만 예약돼요. 서버에 저장되는 정보는 없어요.")
                        .font(.footnote).foregroundStyle(.secondary)
                }
            }
            .navigationTitle("설정")
            .toolbar { ToolbarItem(placement: .confirmationAction) { Button("완료") { dismiss() } } }
            .alert("알림 권한이 꺼져 있어요", isPresented: $deniedAlert) {
                Button("설정 열기") { openSystemSettings() }
                Button("취소", role: .cancel) {}
            } message: { Text("설정 앱에서 옴니마인드 알림을 켜주세요.") }
        }
    }

    private func toggle(_ on: Bool) async {
        if on {
            let granted = await manager.requestAuthorization()
            if !granted { deniedAlert = true; return }
        }
        settings.isEnabled = on
        persist()
        await manager.reschedule(settings)
    }
    private func persist() {
        NotificationSettingsStore.save(settings, to: .standard)
        Task { await manager.reschedule(settings) }
    }
    private func openSystemSettings() {
        if let url = URL(string: UIApplication.openSettingsURLString) { UIApplication.shared.open(url) }
    }
}
