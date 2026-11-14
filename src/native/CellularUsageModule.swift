internal import ExpoModulesCore
import Darwin

class CellularUsageModule: Module {
  public func definition() -> ModuleDefinition {
    Name("CellularUsageModule")

    Function("getCounters") { () -> [String: Any] in
      var addressList: UnsafeMutablePointer<ifaddrs>?
      guard getifaddrs(&addressList) == 0, let firstAddress = addressList else {
        return ["available": false, "receivedBytes": 0, "sentBytes": 0]
      }
      defer { freeifaddrs(addressList) }

      var receivedBytes: UInt64 = 0
      var sentBytes: UInt64 = 0
      var visitedInterfaces = Set<String>()
      var currentAddress: UnsafeMutablePointer<ifaddrs>? = firstAddress

      while let address = currentAddress {
        let interface = address.pointee
        if let namePointer = interface.ifa_name {
          let name = String(cString: namePointer)
          let addressFamily = interface.ifa_addr.map { Int32($0.pointee.sa_family) } ?? -1
          if name.hasPrefix("pdp_ip"),
             addressFamily == AF_LINK,
             !visitedInterfaces.contains(name),
             let rawData = interface.ifa_data {
            visitedInterfaces.insert(name)
            let data = rawData.assumingMemoryBound(to: if_data.self).pointee
            receivedBytes += UInt64(data.ifi_ibytes)
            sentBytes += UInt64(data.ifi_obytes)
          }
        }
        currentAddress = interface.ifa_next
      }

      return [
        "available": !visitedInterfaces.isEmpty,
        "receivedBytes": receivedBytes,
        "sentBytes": sentBytes
      ]
    }
  }
}
