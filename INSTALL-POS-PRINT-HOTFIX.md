# LOTTIVEXA POS + Print Hotfix

1. Fèmen `pnpm dev` avèk `Ctrl+C`.
2. Ekstrè ZIP la dirèkteman nan `C:\Users\touss\Documents\LOTTIVEXA` epi aksepte ranplasman fichye yo.
3. Kouri:

```powershell
Set-Location "$env:USERPROFILE\Documents\LOTTIVEXA"
pnpm --filter @lottivexa/api test
pnpm --filter @lottivexa/api build
pnpm --filter @lottivexa/merchant-web build

Set-Location "apps\mobile"
flutter analyze
flutter build apk --debug --dart-define=API_URL=http://192.168.15.17:4100
```

4. Dezenstale ansyen APK a epi enstale `apps\mobile\build\app\outputs\flutter-apk\app-debug.apk`.
5. Retounen nan rasin pwojè a epi lanse `pnpm dev`.

Hotfix la serialize tout `BigInt` API yo kòm string, kenbe idempotency ticket, korije opsyon Loto yo, sèvi ak boul Bolet yo pou Maryaj/Loto otomatik, amelyore pri pa liy/pri global, epi pèmèt chèche/konekte/teste yon printer mobil san antre ID li manyèlman.
