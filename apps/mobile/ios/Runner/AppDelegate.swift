import Flutter
import UIKit

@main
@objc class AppDelegate: FlutterAppDelegate {
  private var printerBridge: PrinterBridge?
  override func application(_ application:UIApplication,didFinishLaunchingWithOptions launchOptions:[UIApplication.LaunchOptionsKey:Any]?) -> Bool {
    GeneratedPluginRegistrant.register(with:self)
    guard let controller=window?.rootViewController as? FlutterViewController else { return super.application(application,didFinishLaunchingWithOptions:launchOptions) }
    printerBridge=PrinterBridge(channel:FlutterMethodChannel(name:"com.lottivexa/printer",binaryMessenger:controller.binaryMessenger))
    return super.application(application,didFinishLaunchingWithOptions:launchOptions)
  }
}
