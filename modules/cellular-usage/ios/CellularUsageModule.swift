import Darwin
import ExpoModulesCore

public final class CellularUsageModule: Module {
  public func definition() -> ModuleDefinition {
    Name("CellularUsage")

    AsyncFunction("getCounters") { () -> [String: Any] in
      var firstInterface: UnsafeMutablePointer<ifaddrs>?
      guard getifaddrs(&firstInterface) == 0, let firstInterface else {
        return ["available": false, "receivedBytes": 0, "sentBytes": 0]
      }
      defer { freeifaddrs(firstInterface) }

      var receivedBytes: UInt64 = 0
      var sentBytes: UInt64 = 0
      var foundCellularInterface = false
      var current: UnsafeMutablePointer<ifaddrs>? = firstInterface

      while let interface = current {
        let name = String(cString: interface.pointee.ifa_name)
        if name.hasPrefix("pdp_ip"), let rawData = interface.pointee.ifa_data {
          let statistics = rawData.assumingMemoryBound(to: if_data.self).pointee
          receivedBytes &+= UInt64(statistics.ifi_ibytes)
          sentBytes &+= UInt64(statistics.ifi_obytes)
          foundCellularInterface = true
        }
        current = interface.pointee.ifa_next
      }

      return [
        "available": foundCellularInterface,
        "receivedBytes": receivedBytes,
        "sentBytes": sentBytes
      ]
    }
  }
}
