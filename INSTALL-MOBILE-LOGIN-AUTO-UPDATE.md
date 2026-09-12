# Login mobil ak mizajou aplikasyon

Mizajou sa retire adrès API nan login, fikse API pwodiksyon an, mete Kreyòl/Français sou login, epi tcheke nouvo vèsyon aplikasyon an atravè `app-version.json`.

## Enstale epi verifye

```powershell
$Project = "$env:USERPROFILE\Documents\LOTTIVEXA"
$Zip = "$env:USERPROFILE\Downloads\LOTTIVEXA-mobile-login-auto-update.zip"
Expand-Archive -LiteralPath $Zip -DestinationPath $Project -Force
Set-Location "$Project\apps\mobile"
flutter clean
flutter pub get
flutter analyze
flutter build apk --release --dart-define=API_URL=https://lottivexa-api.onrender.com
```

## Pibliye nouvo APK pita

1. Ogmante `version:` nan `apps/mobile/pubspec.yaml`.
2. Build APK release la.
3. Kreye yon GitHub Release epi mete APK la kòm asset.
4. Mete menm nimewo vèsyon an nan `apps/public-site/public/app-version.json`, epi push/deploy public-site la.

App ki deja enstale a ap detekte nouvo vèsyon an epi ouvri paj release la. Android mande itilizatè a konfime enstalasyon an; enstalasyon an silans pa disponib pou yon APK nòmal.

## Kont pwodiksyon

Baz Neon lan se yon nouvo baz. Konekte sou Master Admin ak kont `root` seed la, kreye tenant lan, epi nan Tenant Admin kreye branch ak kont merchant yo. Kont ki te sèlman nan PostgreSQL lokal la pa egziste nan Neon.
