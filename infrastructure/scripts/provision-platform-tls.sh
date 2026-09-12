#!/usr/bin/env sh
set -eu
: "${PLATFORM_DOMAIN:?PLATFORM_DOMAIN is required}"
: "${ACME_EMAIL:?ACME_EMAIL is required}"
: "${ACME_DNS_ADAPTER_URL:?ACME_DNS_ADAPTER_URL is required for wildcard DNS-01}"
: "${ACME_DNS_ADAPTER_KEY:?ACME_DNS_ADAPTER_KEY is required for wildcard DNS-01}"
case "$PLATFORM_DOMAIN" in ''|*[!a-z0-9.-]*|.*|*.) printf 'invalid PLATFORM_DOMAIN\n' >&2; exit 2;; esac
compose_file="${COMPOSE_FILE:-docker-compose.production.yml}"
config_dir="${CUSTOM_DOMAIN_CONFIG_DIR:-infrastructure/nginx/custom-domains}"
mkdir -p "$config_dir"
docker compose -f "$compose_file" --profile operations run --rm certbot certonly --manual --preferred-challenges dns --manual-auth-hook '/opt/lottivexa/scripts/acme-dns-hook.py present' --manual-cleanup-hook '/opt/lottivexa/scripts/acme-dns-hook.py cleanup' --non-interactive --agree-tos --email "$ACME_EMAIL" --cert-name "$PLATFORM_DOMAIN" -d "$PLATFORM_DOMAIN" -d "*.$PLATFORM_DOMAIN"
target="$config_dir/00-platform-tls.conf"
{
  printf 'server {\n  listen 443 ssl http2;\n  server_name api.%s;\n' "$PLATFORM_DOMAIN"
  printf '  ssl_certificate /etc/letsencrypt/live/%s/fullchain.pem;\n  ssl_certificate_key /etc/letsencrypt/live/%s/privkey.pem;\n' "$PLATFORM_DOMAIN" "$PLATFORM_DOMAIN"
  printf '  ssl_protocols TLSv1.2 TLSv1.3;\n  add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;\n  add_header X-Content-Type-Options nosniff always;\n  add_header X-Frame-Options DENY always;\n  location = /api/v1/auth/login { limit_req zone=login_limit burst=5 nodelay; proxy_set_header Host $host; proxy_set_header X-Forwarded-Proto https; proxy_pass http://api; }\n  location / { limit_req zone=api_limit burst=60 nodelay; limit_conn per_ip 30; proxy_set_header Host $host; proxy_set_header X-Request-ID $request_id; proxy_set_header X-Forwarded-Proto https; proxy_pass http://api; }\n}\n'
  for pair in "$PLATFORM_DOMAIN:public_site" "www.$PLATFORM_DOMAIN:public_site" "admin.$PLATFORM_DOMAIN:master_admin" "app.$PLATFORM_DOMAIN:tenant_web" "pos.$PLATFORM_DOMAIN:merchant_web"; do
    host="${pair%%:*}"; upstream="${pair##*:}"
    printf 'server {\n  listen 443 ssl http2;\n  server_name %s;\n' "$host"
    printf '  ssl_certificate /etc/letsencrypt/live/%s/fullchain.pem;\n  ssl_certificate_key /etc/letsencrypt/live/%s/privkey.pem;\n' "$PLATFORM_DOMAIN" "$PLATFORM_DOMAIN"
    printf '  ssl_protocols TLSv1.2 TLSv1.3;\n  add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;\n  add_header X-Content-Type-Options nosniff always;\n  add_header Referrer-Policy strict-origin-when-cross-origin always;\n  add_header X-Frame-Options DENY always;\n  location /api/ { proxy_set_header Host $host; proxy_set_header X-Forwarded-Proto https; proxy_pass http://api; }\n  location / { proxy_set_header Host $host; proxy_set_header X-Forwarded-Proto https; proxy_pass http://%s; }\n}\n' "$upstream"
  done
  printf 'server {\n  listen 443 ssl http2;\n  server_name *.%s;\n' "$PLATFORM_DOMAIN"
  printf '  ssl_certificate /etc/letsencrypt/live/%s/fullchain.pem;\n  ssl_certificate_key /etc/letsencrypt/live/%s/privkey.pem;\n' "$PLATFORM_DOMAIN" "$PLATFORM_DOMAIN"
  printf '  ssl_protocols TLSv1.2 TLSv1.3;\n  add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;\n  add_header X-Frame-Options DENY always;\n  location /api/ { proxy_set_header Host $host; proxy_set_header X-Forwarded-Host $host; proxy_set_header X-Forwarded-Proto https; proxy_pass http://api; }\n  location / { proxy_set_header Host $host; proxy_set_header X-Forwarded-Host $host; proxy_set_header X-Forwarded-Proto https; proxy_pass http://tenant_web; }\n}\n' "$PLATFORM_DOMAIN"
} >"$target.tmp"
mv "$target.tmp" "$target"
docker compose -f "$compose_file" exec -T nginx nginx -t
docker compose -f "$compose_file" exec -T nginx nginx -s reload
