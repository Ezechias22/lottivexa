#!/usr/bin/env sh
set -eu
: "${DATABASE_URL:?DATABASE_URL is required}"
: "${ACME_EMAIL:?ACME_EMAIL is required}"
compose_file="${COMPOSE_FILE:-docker-compose.production.yml}"
config_dir="${CUSTOM_DOMAIN_CONFIG_DIR:-infrastructure/nginx/custom-domains}"
mkdir -p "$config_dir"
umask 077
psql "$DATABASE_URL" -At -F '|' -c 'SELECT id, "tenantId", domain FROM "TenantDomain" WHERE "verificationStatus"='"'"'VERIFIED'"'"' AND "sslStatus" IN ('"'"'PENDING'"'"','"'"'FAILED'"'"') ORDER BY "createdAt"' |
while IFS='|' read -r domain_id tenant_id domain; do
  case "$domain" in ''|*[!a-z0-9.-]*) printf 'invalid stored domain: %s\n' "$domain" >&2; continue;; esac
  if docker compose -f "$compose_file" --profile operations run --rm certbot certonly --webroot -w /var/www/certbot --non-interactive --agree-tos --email "$ACME_EMAIL" --cert-name "$domain" -d "$domain"; then
    config="$config_dir/$domain.conf"
    { printf 'server {\n  listen 80;\n  server_name %s;\n  location /.well-known/acme-challenge/ { root /var/www/certbot; }\n  location / { return 308 https://$host$request_uri; }\n}\nserver {\n  listen 443 ssl http2;\n  server_name %s;\n' "$domain" "$domain"; printf '  ssl_certificate /etc/letsencrypt/live/%s/fullchain.pem;\n  ssl_certificate_key /etc/letsencrypt/live/%s/privkey.pem;\n' "$domain" "$domain"; printf '  ssl_protocols TLSv1.2 TLSv1.3;\n  add_header Strict-Transport-Security "max-age=31536000" always;\n  add_header X-Content-Type-Options nosniff always;\n  add_header Referrer-Policy strict-origin-when-cross-origin always;\n  add_header X-Frame-Options DENY always;\n  add_header Permissions-Policy "camera=(), microphone=(), geolocation=()" always;\n  location /api/ { proxy_set_header Host $host; proxy_set_header X-Forwarded-Proto https; proxy_pass http://api; }\n  location / { proxy_set_header Host $host; proxy_set_header X-Forwarded-Proto https; proxy_pass http://tenant_web; }\n}\n'; } >"$config.tmp"
    mv "$config.tmp" "$config"
    psql "$DATABASE_URL" -v id="$domain_id" -v tenant="$tenant_id" -v domain="$domain" -c 'BEGIN; UPDATE "TenantDomain" SET "sslStatus"='"'"'ACTIVE'"'"' WHERE id=:'"'"'id'"'"'::uuid AND "tenantId"=:'"'"'tenant'"'"'::uuid; INSERT INTO "AuditLog"("tenantId",action,"entityType","entityId","newValues","createdAt") VALUES (:'"'"'tenant'"'"'::uuid,'"'"'UPDATE'"'"','"'"'TenantDomain'"'"',:'"'"'id'"'"',jsonb_build_object('"'"'sslStatus'"'"','"'"'ACTIVE'"'"','"'"'domain'"'"',:'"'"'domain'"'"'),now()); COMMIT;'
  else
    psql "$DATABASE_URL" -v id="$domain_id" -c 'UPDATE "TenantDomain" SET "sslStatus"='"'"'FAILED'"'"' WHERE id=:'"'"'id'"'"'::uuid'
  fi
done
docker compose -f "$compose_file" exec -T nginx nginx -t
docker compose -f "$compose_file" exec -T nginx nginx -s reload
