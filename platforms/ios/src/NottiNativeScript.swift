import Foundation
@_spi(Wrapper) import NottiSDK

/// Obj-C visible entry points for the NativeScript plugin. The NativeScript runtime only sees
/// Obj-C metadata, and the wrapper initializer of `NottiSDK` is Swift-only `@_spi(Wrapper)`,
/// so this shim is the only way to report `sdk_name`/`sdk_version` from TypeScript.
/// Only Obj-C representable types cross this boundary.
@objc(NottiNativeScript)
public final class NottiNativeScript: NSObject {

  /// Starts the SDK as the NativeScript wrapper. `sdkName` and `opensInAppURLs` are fixed here:
  /// the backend attributes the device to NativeScript (AD-001) and the host app opens In-App
  /// links itself (AD-004).
  @objc public static func initialize(appId: String, clientKey: String, baseUrl: String?, sdkVersion: String) {
    Notti.initialize(
      appId: appId,
      clientKey: clientKey,
      options: Notti.Options(baseUrl: baseUrl, opensInAppURLs: false),
      sdkName: "nativescript",
      sdkVersion: sdkVersion)
  }
}
