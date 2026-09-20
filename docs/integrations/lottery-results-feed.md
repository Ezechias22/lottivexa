# Lottery Results Feed integration

LOTTIVEXA retrieves third-party results from the provider REST API in the API service. This setup uses API polling only; it does not require webhook access or a paid webhook plan. Provider tokens must never be shipped in Next.js public variables or Flutter build definitions.

## Configuration

In Render, open the API Web Service for LOTTIVEXA, choose **Environment**, and add these variables there. Do not add provider credentials to the public-site or tenant-web services.

Set these values in the API service environment:

```env
LOTTERY_RESULTS_FEED_BASE_URL=https://www.lotteryresultsfeed.com/api
LOTTERY_RESULTS_FEED_TOKEN=paste-your-private-api-key-here
LOTTERY_RESULTS_FEED_POLL_ENABLED=true
LOTTERY_RESULTS_FEED_POLL_MS=900000
LOTTERY_RESULTS_FEED_BINDINGS=[{"catalogCode":"REPLACE_WITH_REAL_CATALOG_CODE","lotteryId":123,"drawTimes":{"midday":"14:30","evening":"22:30"}}]
```

In the provider's **API Keys** page, reveal and copy the existing Lottivexa key, or generate a new key if it cannot be revealed. Paste it as `LOTTERY_RESULTS_FEED_TOKEN` in the Render **lottivexa-api** service only. Keep it private. No webhook secret or webhook URL is needed for API polling.

Replace `REPLACE_WITH_REAL_CATALOG_CODE` and the example ID `123` with a catalog code enabled for this tenant and the actual numeric `lotteryId` returned by the provider API. An empty `[]` mapping means no game can be matched automatically. `drawTimes` must match the result times installed for that catalog game, using 24-hour Haiti local time. Supported keys include the provider draw types (`morning`, `midday`, `afternoon`, `evening`, `late_night`) and `default`.

The recommended `900000` interval polls every 15 minutes; choose an interval allowed by the provider plan. The current REST adapter reads the provider's `results[]` objects from `balls` and `result_published_at`; it deliberately does not treat `ball_bonus` as a main result position. The background worker publishes each matched draw result and updates matching tickets idempotently.

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
2. In Render, save the API service variables and deploy `lottivexa-api`.
3. Check the authenticated provider status endpoint `/api/v1/results/provider/status`: polling should be enabled, the token configured, bindings valid, and the binding count above zero.
4. Verify a closed draw becomes `RESULT_PUBLISHED` and its valid tickets become `WINNER` or `LOSER`.
5. If an event is `FAILED`, inspect its error. `UNMAPPED` means the provider lottery ID or draw type is missing from `LOTTERY_RESULTS_FEED_BINDINGS`.
6. Keep the provider API token in Render's secret environment and rotate it after suspected exposure.
