# Verification matrix

| Gate | Local result | Deployment requirement |
| --- | --- | --- |
| API/database/web TypeScript | Passed | Repeat in CI |
| Unit/security policies | 89 passed | Repeat on every commit |
| All web/API production builds | Passed | Build immutable images |
| Prisma schema | Passed | Run migrations on staging clone |
| YAML and shell syntax | Passed | Validate Compose and Nginx with installed binaries |
| PostgreSQL/Redis readiness | Not runnable in this workspace | Must pass `/ready` in staging |
| Docker image/Compose start | Docker unavailable | Must pass before promotion |
| Full deployed lifecycle | Runner validated locally; no deployed target supplied | Run `infrastructure/scripts/release-gate.sh` in staging |
| Backup restore drill | PostgreSQL tools unavailable | Perform monthly on isolated database |
| Flutter Android | Flutter SDK unavailable | Analyze, test and sign in mobile CI |
| Flutter iOS | Requires macOS/Xcode | Build, sign and hardware-test in iOS CI |
| Physical Bluetooth/USB/LAN printers | Hardware unavailable | Execute printer certification matrix |

A release is not approved merely because source builds locally. Every deployment-only gate must have retained evidence for the exact release revision.
