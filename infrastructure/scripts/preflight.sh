#!/usr/bin/env sh
set -eu
env_file="${1:-.env.production}"
test -f "$env_file" || { printf 'missing %s\n' "$env_file" >&2; exit 2; }
for key in POSTGRES_PASSWORD REDIS_PASSWORD JWT_ACCESS_SECRET JWT_REFRESH_SECRET DATABASE_URL PLATFORM_DOMAIN TENANT_CNAME_TARGET ACME_EMAIL ACME_DNS_ADAPTER_URL ACME_DNS_ADAPTER_KEY PASSWORD_RESET_WEB_URL; do
  value="$(sed -n "s/^$key=//p" "$env_file" | tail -n 1)"
  test -n "$value" || { printf '%s is missing\n' "$key" >&2; exit 2; }
  case "$value" in *replace*|*example.com*|*.invalid*|*localhost*) printf '%s still contains a placeholder\n' "$key" >&2; exit 2;; esac
done
docker compose --env-file "$env_file" -f docker-compose.production.yml config --quiet
sh -n infrastructure/scripts/*.sh
test -x infrastructure/scripts/backup.sh
test -x infrastructure/scripts/restore.sh
printf 'production preflight passed\n'
