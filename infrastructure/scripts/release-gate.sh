#!/usr/bin/env sh
set -eu
: "${E2E_PUBLIC_URL:?E2E_PUBLIC_URL is required}"
: "${E2E_PLATFORM_USERNAME:?E2E_PLATFORM_USERNAME is required}"
: "${E2E_PLATFORM_PASSWORD:?E2E_PLATFORM_PASSWORD is required}"
export E2E_API_URL="${E2E_PUBLIC_URL%/}/api/v1"
node tests/e2e/full-lifecycle.mjs
node tests/e2e/deployment-gate.mjs
printf 'LOTTIVEXA release gate passed\n'
