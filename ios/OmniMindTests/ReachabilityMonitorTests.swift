import XCTest
import Network
@testable import OmniMind

final class ReachabilityMonitorTests: XCTestCase {
    func testSatisfiedIsConnected() {
        XCTAssertTrue(ReachabilityMonitor.connected(.satisfied))
    }
    func testUnsatisfiedIsNotConnected() {
        XCTAssertFalse(ReachabilityMonitor.connected(.unsatisfied))
    }
    func testRequiresConnectionIsNotConnected() {
        XCTAssertFalse(ReachabilityMonitor.connected(.requiresConnection))
    }
}
