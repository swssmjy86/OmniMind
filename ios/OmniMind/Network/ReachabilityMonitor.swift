import Foundation
import Network

final class ReachabilityMonitor: ObservableObject {
    @Published private(set) var isConnected = true
    private let monitor = NWPathMonitor()
    private let queue = DispatchQueue(label: "com.omnimind.app.reachability")

    init() {
        monitor.pathUpdateHandler = { [weak self] path in
            let ok = ReachabilityMonitor.connected(path.status)
            DispatchQueue.main.async { self?.isConnected = ok }
        }
        monitor.start(queue: queue)
    }
    deinit { monitor.cancel() }

    static func connected(_ status: NWPath.Status) -> Bool { status == .satisfied }
}
