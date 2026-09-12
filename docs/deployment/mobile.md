# Mobile build and operation

The Flutter client in `apps/mobile` uses the shared NestJS API; it contains no fake backend and exposes no merchant registration path.

The access token determines the shell at runtime. Merchant users receive the fast POS navigation. Tenant administrators receive the live tenant dashboard and permission-filtered mobile administration for merchants, branches, users, devices, printers, trial balance, reports and alerts. The backend remains authoritative for every permission, feature and tenant-ownership decision.

## Prerequisites

- Flutter stable with Dart 3.4 or newer
- Android Studio/SDK for Android builds
- Xcode and CocoaPods on macOS for iOS builds

## Generate platform runners

From `apps/mobile`, run `flutter create --platforms=android,ios .` once when the platform runner directories are not present. This preserves `lib/` and `pubspec.yaml`. Then run `flutter pub get` and `flutter analyze`.

## Development

Android emulator:

```sh
flutter run --dart-define=API_URL=http://10.0.2.2:4000
```

Physical device:

```sh
flutter run --dart-define=API_URL=https://api.example.com
```

## Release

Use production HTTPS only. Store signing keys outside source control. Run `flutter test`, `flutter analyze`, `flutter build appbundle --release --dart-define=API_URL=https://api.example.com`, and on macOS run `flutter build ipa --release --dart-define=API_URL=https://api.example.com`.

Tokens and forced-password state are stored in the OS secure store. Offline payloads use AES-256-GCM and SQLite WAL. The server revalidates device assignment, subscription, draw cutoff, limits, permissions and idempotency on every synchronized mutation.
