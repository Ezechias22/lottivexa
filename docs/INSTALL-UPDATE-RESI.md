# Mete LOTTIVEXA ajou epi konstwi APK

1. Dekonprese koreksyon yo nan rasin pwojè `LOTTIVEXA`, epi ranplase fichye ki mande sa.
2. Nan PowerShell, kouri:

```powershell
$ErrorActionPreference = 'Stop'
Set-Location "$env:USERPROFILE\Documents\LOTTIVEXA"

pnpm install --frozen-lockfile
if ($LASTEXITCODE -ne 0) { throw 'Enstalasyon depandans yo echwe.' }

pnpm --filter @lottivexa/merchant-web test
if ($LASTEXITCODE -ne 0) { throw 'Tès sit machann lan echwe.' }
pnpm --filter @lottivexa/merchant-web build
if ($LASTEXITCODE -ne 0) { throw 'Build sit machann lan echwe.' }
pnpm --filter @lottivexa/tenant-web test
if ($LASTEXITCODE -ne 0) { throw 'Tès tenant lan echwe.' }
pnpm --filter @lottivexa/tenant-web build
if ($LASTEXITCODE -ne 0) { throw 'Build tenant lan echwe.' }

Push-Location .\apps\mobile
try {
    flutter pub get
    if ($LASTEXITCODE -ne 0) { throw 'flutter pub get echwe.' }
    flutter analyze
    if ($LASTEXITCODE -ne 0) { throw 'flutter analyze jwenn erè.' }
    if (Test-Path .\test) {
        flutter test
        if ($LASTEXITCODE -ne 0) { throw 'Tès Flutter yo echwe.' }
    }
    flutter build apk --release
    if ($LASTEXITCODE -ne 0) { throw 'Build APK la echwe.' }
}
finally { Pop-Location }

git diff --check
if ($LASTEXITCODE -ne 0) { throw 'Git jwenn erè espas nan fichye yo.' }
```

APK la ap parèt nan `apps\mobile\build\app\outputs\flutter-apk\app-release.apk`. Kòd vèsyon an monte pou Android rekonèt nouvo APK la kòm mizajou.

## Lajan

USD se nouvo valè pa defo a lè tenant la poko gen lajan sove. Pou yon tenant ki deja gen HTG, yon administratè dwe chwazi **USD · $** nan Paramèt yo sou web oswa mobil epi sove chanjman an. Sa chanje etikèt lajan an pou lavant ak rapò; li pa konvèti ansyen montan yo.

## Rezilta

Sou web oswa nan administrasyon mobil, ouvri **Antre rezilta tiraj**, chwazi tiraj ki fèmen an, mete nimewo gayan yo nan lòd, epi konfime piblikasyon an. Pou rezilta otomatik, sèvi ak enstriksyon Render yo nan `docs/integrations/lottery-results-feed.md`; ou bezwen jeton founisè a ak ID lotri reyèl yo.
