# Lottery Results Feed integration

LOTTIVEXA receives official result events only in the API service. Provider tokens and webhook secrets must never be shipped in Next.js public variables or Flutter build definitions.

## Configuration

In Render, open the API Web Service for LOTTIVEXA, choose **Environment**, and add these variables there. Do not add provider credentials to the public-site or tenant-web services.

Set these values in the API service environment:

```env
LOTTERY_RESULTS_FEED_BASE_URL=https://www.lotteryresultsfeed.com/api
LOTTERY_RESULTS_FEED_TOKEN=replace-in-secret-store
LOTTERY_RESULTS_FEED_WEBHOOK_SECRET=replace-with-provider-webhook-secret
LOTTERY_RESULTS_FEED_POLL_ENABLED=false
LOTTERY_RESULTS_FEED_POLL_MS=900000
LOTTERY_RESULTS_FEED_BINDINGS=[{"catalogCode":"US-NY","lotteryId":123,"drawTimes":{"midday":"14:30","evening":"22:30"}}]
```

Replace the example token and secret with real values from the provider. `LOTTERY_RESULTS_FEED_TOKEN` is the provider API token; `LOTTERY_RESULTS_FEED_WEBHOOK_SECRET` is a private secret you also enter in the provider's webhook configuration. Keep both private.

Replace the example `US-NY` mapping with the catalog codes enabled for this tenant and the actual `lotteryId` values returned by the provider API. Do not leave the example ID `123` in production. `drawTimes` must match the result times installed for that catalog game, using 24-hour Haiti local time. Supported keys include the provider draw types (`morning`, `midday`, `afternoon`, `evening`, `late_night`) and `default`.

Leave polling disabled until the token and mappings are verified. If the provider account supports polling and you want it enabled, set `LOTTERY_RESULTS_FEED_POLL_ENABLED=true` and choose an interval allowed by that provider plan. With webhook-only delivery, leave it `false`.

Register this HTTPS URL in the provider dashboard:

```text
https://YOUR-API-HOST/api/v1/results/provider/lottery-results-feed/webhook
```

The API verifies the `Signature` HMAC against the untouched request body, stores an idempotent event, and responds before ticket settlement work begins. The background worker then publishes the draw result and updates all matching tickets. Polling the results endpoint is a fallback and uses the same idempotent queue. It is disabled by default to protect low API-call quotas; enable it only after choosing an interval compatible with the account plan.

After adding or changing environment variables, save them in Render and deploy the API service so the running process reads the new values. The tenant web and mobile screens can also publish a result manually; choose a closed draw and enter the winning numbers in order. Manual publishing is final, so synchronize offline tickets first.

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
