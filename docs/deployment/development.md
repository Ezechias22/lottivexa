# Development environment

1. Copy `.env.example` to `.env` and replace all secrets.
2. Start PostgreSQL and Redis: `docker compose up -d`.
3. Install dependencies: `pnpm install`.
4. Generate the Prisma client: `pnpm db:generate`.
5. Apply migrations: `pnpm db:migrate`.
6. Set a temporary `SEED_ADMIN_PASSWORD` and run `pnpm db:seed`.
7. Start the API and web applications: `pnpm dev`.

The physical printing worker is intentionally separate because it requires a provisioned tenant worker account and printer hardware configuration. Start it with `pnpm dev:printing` only after configuring the `PRINT_*` environment variables.

Swagger is available at `http://localhost:4000/docs`; health checks are `/api/v1/health` and `/api/v1/ready`.
