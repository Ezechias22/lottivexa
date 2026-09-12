# LOTTIVEXA — Haiti lottery update

This package overlays the existing LOTTIVEXA checkpoint. It adds the Haitian lottery catalog foundation, tenant-controlled lottery and draw schedules, automatic draw creation, signed result-provider ingestion, transactional winner settlement, public live results, ticket replay, automatic Maryaj/Loto 4, and automatic Boul Pè.

## Install on Windows PowerShell

Extract the archive directly over `C:\Users\touss\Documents\LOTTIVEXA` and allow matching source files to be replaced. Do not replace your `.env` file.

Then run:

```powershell
Set-Location "$env:USERPROFILE\Documents\LOTTIVEXA"
Copy-Item .env "packages\database\.env" -Force
Copy-Item .env "services\api\.env" -Force
pnpm db:generate
pnpm db:migrate
pnpm test
pnpm build
pnpm dev
```

For an existing tenant, open **Games & Draws** and click **Enstale / mete katalòg ajou** once. New tenants receive the catalog automatically.

The public result board is `/results?tenant=TENANT_SLUG` on the public-site port.

## Result-provider environment

Automatic external result ingestion stays disabled until a real licensed provider is configured:

```dotenv
RESULT_PROVIDER_URL=https://provider.example/results
RESULT_PROVIDER_TOKEN=replace-me
RESULT_PROVIDER_SECRET=at-least-32-random-characters
```

The provider payload must be signed with HMAC SHA-256. Manual result publication remains available to authorized tenant staff.

## Logos

No fabricated or unlicensed logo is bundled. An authorized tenant administrator can save an official licensed HTTPS logo URL for each lottery. Catalog refreshes preserve this customization.
