import SwiftUI

struct OfflineView: View {
    let onRetry: () -> Void
    var body: some View {
        ZStack {
            Color(red: 0.96, green: 0.94, blue: 0.90).ignoresSafeArea()   // 웜 베이지
            VStack(spacing: 16) {
                Text("🌙").font(.system(size: 44))
                Text("잠시 길을 잃었어요")
                    .font(.title3).bold()
                    .foregroundStyle(Color(red: 0.18, green: 0.35, blue: 0.29))  // 딥 그린
                Text("연결이 돌아오면 다시 이어드릴게요.")
                    .font(.subheadline)
                    .foregroundStyle(Color(red: 0.24, green: 0.23, blue: 0.21))
                Button(action: onRetry) {
                    Text("다시 시도")
                        .font(.callout).bold()
                        .padding(.horizontal, 24).padding(.vertical, 12)
                        .background(Color(red: 0.91, green: 0.57, blue: 0.49))   // 차분한 코랄
                        .foregroundStyle(.white)
                        .clipShape(Capsule())
                }
            }.padding(32)
        }
    }
}
