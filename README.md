# Helios Backend

Helios is a Bun, Express, TypeScript, Prisma, and PostgreSQL backend for an
AI-assisted health pre-screening workflow. In local development, the backend
runs on the host while PostgreSQL runs in Docker.

## Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/)
- [Bun](https://bun.sh/)

## Dockerized PostgreSQL setup

1. Install project dependencies:

   ```bash
   bun install
   ```

2. Copy `.env.docker.example` to `.env.docker` and replace `change_me` with a
   development-only PostgreSQL password:

   ```bash
   cp .env.docker.example .env.docker
   ```

   On Windows, copy and rename the file in Explorer or run:

   ```powershell
   Copy-Item .env.docker.example .env.docker
   ```

   `.env.docker` is ignored by Git. Do not commit its password.

3. Start PostgreSQL and check its health:

   ```bash
   bun run db:up
   bun run db:status
   ```

   Wait until the `postgres` service reports `healthy`. Follow startup logs if
   needed with `bun run db:logs`.

4. Copy `.env.example` to `.env` if needed, then configure the backend
   `DATABASE_URL` using the same database name, user, password, and host port as
   `.env.docker`:

   ```env
   DATABASE_URL="postgresql://helios_app:<POSTGRES_PASSWORD>@localhost:5432/helios?schema=public"
   ```

   The backend runs directly on the host, so use `localhost`, not the Compose
   service hostname `postgres`.

5. Apply the committed Prisma migrations to the fresh Docker database:

   ```bash
   bunx --bun prisma migrate deploy
   ```

   Database tables are created from `prisma/migrations/`; do not use
   `prisma db push` for this setup.

6. Configure `DEV_ADMIN_NAME`, `DEV_ADMIN_EMAIL`, and `DEV_ADMIN_PASSWORD` in
   `.env`, then run the existing idempotent Admin seed:

   ```bash
   bun run prisma:seed
   ```

7. Start the backend:

   ```bash
   bun run dev
   ```

   Backend: <http://localhost:3001>

   Swagger UI: <http://localhost:3001/api-docs>

## Port 5432 conflicts

If a locally installed PostgreSQL service already uses host port `5432`, either
stop that local service or set this in `.env.docker`:

```env
POSTGRES_PORT=5433
```

Then update the backend connection URL accordingly:

```env
DATABASE_URL="postgresql://helios_app:<POSTGRES_PASSWORD>@localhost:5433/helios?schema=public"
```

The PostgreSQL port inside the container always remains `5432`.

## Database lifecycle

The Compose service stores PostgreSQL 18 data in the named volume
`helios_postgres_data`. Stop containers without deleting data with:

```bash
bun run db:down
```

Starting the service for the first time creates a fresh empty database. Existing
local PostgreSQL data is not copied. To intentionally delete all Docker database
data and start over, run the explicit destructive command:

```bash
docker compose --env-file .env.docker down -v
```

Database dump and restore are outside this development setup.
