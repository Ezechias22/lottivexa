# Mobile build and signing

## Required build hosts

- Android: Flutter stable, JDK 17, Android SDK and an Android signing keystore.
- iOS: macOS, Flutter stable, current Xcode, CocoaPods and an Apple Developer signing team.

The repository never stores keystores, certificates, provisioning profiles, passwords or Apple API keys.

## Android

1. From `apps/mobile`, run `flutter pub get`.
2. Configure the production API at build time: `--dart-define=API_URL=https://api.example.com`.
3. Put signing values in a local `android/key.properties` file and replace the temporary debug signing configuration in `android/app/build.gradle` before a production release.
4. Build with `flutter build appbundle --release --dart-define=API_URL=https://api.example.com`.
5. Test Bluetooth permission, SPP printing, USB permission, USB bulk transfer, offline sync and process restart on physical hardware.

## iOS

The checked-in Swift adapter implements CoreBluetooth discovery and acknowledged BLE writes. An approved BLE printer configuration must provide `deviceAddress` (the peripheral UUID), `serviceUuid`, and `writeCharacteristicUuid`. Generic Bluetooth Classic SPP and generic USB-host printing are not exposed by iOS; MFi hardware requires its vendor protocol and a dedicated adapter.

Before the final signed build, generate/verify the Runner Xcode project with the installed Flutter version, include `AppDelegate.swift` and `PrinterBridge.swift` in the Runner target, select the signing team, then run `pod install` and `flutter build ipa --release --dart-define=API_URL=https://api.example.com`. Validate on physical iPhone/iPad and the supported printer model.

No mobile artifact is considered release-verified until these commands and physical-device tests pass on the required build hosts.
