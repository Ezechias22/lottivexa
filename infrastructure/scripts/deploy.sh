#!/usr/bin/env sh
set -eu
test -f .env.production
"$(dirname "$0")/preflight.sh" .env.production
compose='docker compose --env-file .env.production -f docker-compose.production.yml'
$compose build --pull
$compose run --rm api sh -c 'cd packages/database && ./node_modules/.bin/prisma migrate deploy && ./node_modules/.bin/prisma migrate status'
$compose up -d --remove-orphans
$compose ps
