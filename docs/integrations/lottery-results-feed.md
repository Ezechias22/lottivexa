# Lottery Results Feed integration

LOTTIVEXA receives official result events only in the API service. Provider tokens and webhook secrets must never be shipped in Next.js public variables or Flutter build definitions.

## Configuration

Set these secrets in the deployment environment:

```env
LOTTERY_RESULTS_FEED_BASE_URL=https://www.lotteryresultsfeed.com/api
LOTTERY_RESULTS_FEED_TOKEN=replace-in-secret-store
LOTTERY_RESULTS_FEED_WEBHOOK_SECRET=replace-with-provider-webhook-secret
LOTTERY_RESULTS_FEED_POLL_ENABLED=false
LOTTERY_RESULTS_FEED_POLL_MS=900000
LOTTERY_RESULTS_FEED_BINDINGS=[{"catalogCode":"US-NY","lotteryId":123,"drawTimes":{"midday":"14:30","evening":"22:30"}}]
```

`lotteryId` must be the actual ID returned by the provider API. `drawTimes` must match the result times installed for that catalog game. Supported keys include the provider draw types (`morning`, `midday`, `afternoon`, `evening`, `late_night`) and `default`.

Register this HTTPS URL in the provider dashboard:

```text
https://YOUR-API-HOST/api/v1/results/provider/lottery-results-feed/webhook
```

The API verifies the `Signature` HMAC against the untouched request body, stores an idempotent event, and responds before ticket settlement work begins. The background worker then publishes the draw result and updates all matching tickets. Polling the results endpoint is a fallback and uses the same idempotent queue. It is disabled by default to protect low API-call quotas; enable it only after choosing an interval compatible with the account plan.

## Retrieve lottery IDs

Use the provider token from a private PowerShell session:

```powershell
$Headers = @{ Authorization = "Bearer $env:LOTTERY_RESULTS_FEED_TOKEN" }
Invoke-RestMethod -Headers $Headers -Uri "https://www.lotteryresultsfeed.com/api/lotteries?country=us"
```

Do not paste the token in source code, screenshots, support messages, or a mobile APK.

## Operational checks

1. Apply Prisma migrations before starting the new API release.
2. Use the provider dashboard test webhook and verify a `ProviderResultEvent` becomes `APPLIED`.
3. Verify a closed draw becomes `RESULT_PUBLISHED` and its valid tickets become `WINNER` or `LOSER`.
4. If an event is `FAILED`, inspect its error. `UNMAPPED` means the provider lottery ID or draw type is missing from `LOTTERY_RESULTS_FEED_BINDINGS`.
5. Keep the provider webhook secret and token in the Render secret environment, and rotate either credential after suspected exposure.
