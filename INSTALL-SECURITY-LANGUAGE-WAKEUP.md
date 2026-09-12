# LOTTIVEXA — sekirite, lang ak reveye Render

Mizajou sa ajoute Kreyòl/Français, yon mesaj pandan Render ap reveye, retry mobil pou cold start, sekirite HTTP/CORS, limit tantativ sou endpoint login yo, epi yon GitHub Actions ping pou API pwodiksyon an.

## Apre w fin dekonprese ZIP la

```powershell
Set-Location "$env:USERPROFILE\Documents\LOTTIVEXA"
pnpm install --frozen-lockfile
pnpm db:generate
pnpm --filter @lottivexa/api test
pnpm --filter @lottivexa/api build
pnpm --filter @lottivexa/master-admin build
pnpm --filter @lottivexa/tenant-web build
pnpm --filter @lottivexa/merchant-web build
pnpm --filter @lottivexa/public-site build

Set-Location "apps\mobile"
flutter pub get
flutter analyze
flutter build apk --release --dart-define=API_URL=https://lottivexa-api.onrender.com
```

## Render

Sou kat frontend yo mete:

`NEXT_PUBLIC_API_URL=https://lottivexa-api.onrender.com/api/v1`

Sou API a mete CORS_ORIGINS san espas:

`https://lottivexa-master-admin.onrender.com,https://lottivexa-tenant-web.onrender.com,https://lottivexa-merchant-web.onrender.com,https://lottivexa-public-site.onrender.com`

## GitHub Actions

Workflow `.github/workflows/keep-api-awake.yml` lan rele health API a chak 10 minit. Sou GitHub, verifye tab **Actions** lan aktive apre push la. Sa se yon solisyon dev/test sou plan gratis; li pa yon garanti disponibilite pwodiksyon.

Kat frontend Next.js yo rete Web Services pou kounye a. Pa ping tout senk sèvis yo, paske 750 èdtan gratis pa mwa a pa sifi. Etap ki dirab la se migre kat frontend yo an Render Static Sites; sa mande kreye nouvo sèvis oswa ranplase sèvis aktyèl yo avèk anpil prekosyon.
