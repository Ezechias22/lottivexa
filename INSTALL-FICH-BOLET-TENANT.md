# Fich bolet tenant lan — mizajou web ak mobil

Pake sa a fèt sou `LOTTIVEXA-source-aktuel.zip` ou voye a. Li chanje sèlman fichye ki nan pake a.

## Enstale nan PowerShell (nan rasin LOTTIVEXA)

```powershell
$Project = "$env:USERPROFILE\Documents\LOTTIVEXA"
$Zip = "$env:USERPROFILE\Downloads\LOTTIVEXA-fich-tenant-v2.zip"
Set-Location $Project
if (git status --porcelain) { throw "Gen chanjman lokal: fè yon backup oswa commit yo anvan." }
if (-not (Test-Path -LiteralPath $Zip)) { throw "ZIP la pa nan Downloads." }
Expand-Archive -LiteralPath $Zip -DestinationPath $Project -Force
pnpm --filter @lottivexa/printer-sdk test
pnpm --filter @lottivexa/api build
pnpm --filter @lottivexa/tenant-web build
Set-Location "$Project\apps\mobile"
flutter analyze
Set-Location $Project
git status --short
```

Si tout tès yo pase, pibliye chanjman yo:

```powershell
git add services/api/src/printing/printing.service.ts services/api/src/printing/printing.controller.ts packages/printer-sdk/src/types.ts packages/printer-sdk/src/escpos.ts packages/printer-sdk/src/escpos.spec.ts apps/mobile/lib/core/printing/escpos_encoder.dart apps/mobile/lib/core/printing/mobile_print_service.dart apps/mobile/lib/features/tickets/new_ticket_screen.dart apps/tenant-web/app/page.tsx INSTALL-FICH-BOLET-TENANT.md
git commit -m "Print tenant-branded tickets without platform or merchant names"
git push
```

Tann sèvis API ak Tenant Web yo vin Live sou Render. Web POS sèvi ak API sa a pou voye fich la nan fil enpresyon an. Pou mobil, chanjman Dart yo **pa** antre otomatikman nan APK ou deja bati: ou dwe fè yon nouvo APK si w vle yo parèt sou telefòn nan. Mete ajou mekanis app-version ou a ak APK nouvo vèsyon an selon pwosedi piblikasyon ou.

Non fich la soti nan `tenantBranding.businessName`, oswa `tenant.legalName` si tenant lan pa gen yon non biznis apa. App mobil lan konsève dènye non tenant lan sèlman pou enprime offline lè li deja verifye li sou API. Si pa gen okenn non verifye, li pa enprime; tikè ki deja vann nan rete vann. Enpresyon ESC/POS la pa enprime logo imaj pou kounye a.

Fich ki te deja nan fil enpresyon **anvan** deplwaman an ka genyen ansyen done. Nouvo enprimè a refize `LOTTIVEXA` kòm non fich; verifye fich ki rete an atant yo anvan re-enprime. Pa fè okenn nouvo vant pou ranplase yon fich ki pa enprime.
