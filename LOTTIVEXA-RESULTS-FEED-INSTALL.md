# LOTTIVEXA Lottery Results Feed update

After extracting this archive over the project root, configure the provider values in the API/Render environment, then run:

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

The provider webhook URL is:

```text
https://YOUR-API-HOST/api/v1/results/provider/lottery-results-feed/webhook
```

See `docs/integrations/lottery-results-feed.md` for environment variables, lottery ID mapping, security, and operational checks.
