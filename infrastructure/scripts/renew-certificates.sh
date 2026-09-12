#!/usr/bin/env sh
set -eu
compose_file="${COMPOSE_FILE:-docker-compose.production.yml}"
docker compose -f "$compose_file" --profile operations run --rm certbot renew --webroot -w /var/www/certbot --non-interactive
docker compose -f "$compose_file" exec -T nginx nginx -t
docker compose -f "$compose_file" exec -T nginx nginx -s reload
