# Custom domains and TLS

Lottivexa does not depend on Cloudflare. DNS can be hosted by any provider and Nginx routes verified custom hosts to the tenant application.

1. The tenant creates the domain through `POST /api/v1/domains`. The active plan must enable `custom_domain`.
2. Lottivexa returns a unique TXT record at `_lottivexa.<domain>`. The tenant publishes it.
3. The tenant points the hostname CNAME to `TENANT_CNAME_TARGET` (or publishes A/AAAA records to the reverse proxy).
4. `POST /api/v1/domains/:id/verify` resolves DNS independently and marks ownership verified only when the exact token is present.
5. Provision a certificate with an ACME client such as Certbot, mount it read-only into Nginx, add the TLS server block, test with `nginx -t`, then reload Nginx.

Automated certificate issuance consumes only domains whose database status is `VERIFIED`. Run `infrastructure/scripts/provision-domains.sh` with `DATABASE_URL` and `ACME_EMAIL`; it requests the certificate through the ACME HTTP-01 webroot, writes one sanitized Nginx virtual host, validates Nginx, reloads it, changes `sslStatus`, and writes an audit record. Never request a certificate before ownership verification. ACME account keys and certificates live in Docker volumes outside source control.

Schedule `infrastructure/scripts/renew-certificates.sh` daily with systemd or cron. Certbot renews only certificates inside its renewal window; the script validates Nginx before reload. A custom domain cannot become primary or resolve to tenant data until both ownership is `VERIFIED` and SSL is `ACTIVE`.

Platform hosts use `provision-platform-tls.sh`. It requests the apex plus `*.PLATFORM_DOMAIN` through DNS-01, because wildcard certificates cannot use HTTP-01. `acme-dns-hook.py` calls a provider-neutral HTTPS bridge configured with `ACME_DNS_ADAPTER_URL` and `ACME_DNS_ADAPTER_KEY`; the bridge must create/remove the requested TXT record and wait for authoritative propagation before returning success. This design does not depend on Cloudflare. The wildcard covers tenant subdomains while named routing sends `api`, `admin`, `app`, `pos`, apex and `www` to their separate services.

The public resolution endpoint returns only tenant slug, locale, timezone and branding. Operational tenant data remains behind authentication and tenant isolation.
