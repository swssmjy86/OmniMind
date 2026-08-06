import SwiftUI

struct RootView: View {
    @StateObject private var webModel = WebViewModel()
    var body: some View {
        WebContainer(model: webModel)
            .ignoresSafeArea(.container, edges: .bottom)
    }
}
