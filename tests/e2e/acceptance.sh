#!/usr/bin/env sh
set -eu
: "${E2E_API_URL:?E2E_API_URL is required}"
: "${E2E_TENANT:?E2E_TENANT is required}"
: "${E2E_USERNAME:?E2E_USERNAME is required}"
: "${E2E_PASSWORD:?E2E_PASSWORD is required}"
curl -fsS "$E2E_API_URL/api/v1/health" | grep -q '"status":"ok"'
login="$(curl -fsS -H 'content-type: application/json' -d "{\"tenant\":\"$E2E_TENANT\",\"username\":\"$E2E_USERNAME\",\"password\":\"$E2E_PASSWORD\"}" "$E2E_API_URL/api/v1/auth/login")"
token="$(printf '%s' "$login" | sed -n 's/.*"accessToken":"\([^"]*\)".*/\1/p')"
test -n "$token"
curl -fsS -H "authorization: Bearer $token" "$E2E_API_URL/api/v1/settings" >/dev/null
curl -fsS -H "authorization: Bearer $token" "$E2E_API_URL/api/v1/reports/sales" >/dev/null
unauthorized="$(curl -sS -o /dev/null -w '%{http_code}' "$E2E_API_URL/api/v1/settings")"
test "$unauthorized" = 401
printf 'deployed acceptance checks passed\n'
