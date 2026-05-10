# BNR Licensing & Compliance Portal

> Take-home assessment — National Bank of Rwanda
> A production-grade licensing workflow system replacing manual email/spreadsheet processes.

## Quick Start

```bash
cp .env.example .env
# Edit .env — set strong secrets for POSTGRES_OWNER_PASSWORD, POSTGRES_APP_PASSWORD,
# JWT_ACCESS_SECRET, JWT_REFRESH_SECRET
docker compose up
```

- **Backend API**: http://localhost:3000/api/v1
- **Frontend**: http://localhost:5173
- **API Docs (Swagger)**: http://localhost:3000/api/docs
- **Health check**: http://localhost:3000/api/v1/health

The docker compose startup runs migrations automatically (`npm run migration:run`) then seeds the database (`npm run seed`) before launching the dev servers.

## Run Without Docker

If you prefer to run the backend against a local PostgreSQL instance instead of Docker:

### 1 — PostgreSQL prerequisites

```bash
# Create the database and owner role (adjust credentials as needed)
psql -U postgres -c "CREATE ROLE bnr_owner WITH LOGIN PASSWORD 'changeme_owner' SUPERUSER;"
psql -U postgres -c "CREATE DATABASE bnr_licensing OWNER bnr_owner;"

# Bootstrap the bnr_app runtime role and schema grants
psql -U bnr_owner -d bnr_licensing -f postgres/init.sql
```

> If `bnr_owner` already exists as your local superuser, skip the first `CREATE ROLE` command and adjust the `POSTGRES_OWNER_PASSWORD` accordingly.

### 2 — Backend environment

```bash
cp backend/.env.local.example backend/.env
# Edit backend/.env — set DATABASE_URL, DATABASE_OWNER_URL, and JWT secrets
```

### 3 — Install, migrate, seed, and start

```bash
cd backend
npm install

# Run all pending migrations (uses DATABASE_OWNER_URL)
npm run migration:run

# Seed the database with demo users (idempotent)
npm run seed

# Start the dev server with hot-reload
npm run start:dev
```

Backend API will be available at **http://localhost:3000/api/v1** (Swagger at `/api/docs`).

### 4 — Frontend (separate terminal)

```bash
cd frontend
npm install
npm run dev
```

Frontend will be available at **http://localhost:5173**.

---

## Seed Credentials

| Email | Password | Role |
|-------|----------|------|
| alice@bnr.test | Password1! | APPLICANT |
| bob@bnr.test | Password1! | REVIEWER |
| carol@bnr.test | Password1! | DECISION_MAKER |
| dave@bnr.test | Password1! | ADMIN |

## Running Tests

### Backend unit tests
```bash
cd backend
npm test
```
Runs state machine and auth unit tests (no Postgres needed).

### Backend e2e tests (requires Postgres)
```bash
# Start Postgres first
docker compose up postgres -d

# Set environment variables
export DATABASE_URL=postgres://bnr_app:changeme_app@localhost:5432/bnr_licensing
export DATABASE_OWNER_URL=postgres://bnr_owner:changeme_owner@localhost:5432/bnr_licensing
export JWT_ACCESS_SECRET=test-secret-min-32-chars-long-here
export JWT_REFRESH_SECRET=test-refresh-secret-min-32-chars

cd backend
npm run test:e2e
```

### Run the concurrency test specifically
```bash
cd backend
npm run test:e2e -- --testPathPattern=concurrency
```

### Run the audit tamper test specifically
```bash
cd backend
npm run test:e2e -- --testPathPattern=audit-tamper
```

### Frontend tests
```bash
cd frontend
npm test
```

## TypeORM Commands

```bash
cd backend

# Generate a new migration from entity changes
npm run migration:generate -- src/database/migrations/YourMigrationName

# Run all pending migrations
npm run migration:run

# Revert the most recent migration
npm run migration:revert

# Run seed (idempotent — safe to run multiple times)
npm run seed
```

## Documentation

- [DESIGN.md](./DESIGN.md) — Architecture, data model, state machine, permission matrix, hard decisions, ambiguity log, production gaps
- [backend/openapi.yaml](./backend/openapi.yaml) — OpenAPI 3.0 spec (auto-generated on backend startup in dev mode)
- [backend/postman_collection.json](./backend/postman_collection.json) — Postman collection

## Project Structure

```
bnr-licensing-portal/
  PLAN.md              Implementation plan (written before coding)
  DESIGN.md            Architecture and design decisions
  docker-compose.yml   One-command startup
  .env.example         Environment variable template
  postgres/
    init.sql           Creates bnr_app role with limited privileges
  backend/
    src/
      database/
        migrations/    001_initial_schema, 002_security_grants_and_triggers
        seeds/         run-seeds.ts (standalone ts-node)
        data-source.ts AppDataSource for migrations (owner role)
      modules/
        auth/          JWT, argon2id, guards, refresh rotation
        users/         User management (ADMIN)
        applications/  State machine, optimistic locking, RBAC
        documents/     Streaming upload, MIME sniff, versioning
        audit/         Hash chain, SELECT...FOR UPDATE, /verify
        health/        GET /health
      common/
        decorators/    @Roles, @Public, @CurrentUser
        filters/       GlobalExceptionFilter (error envelope)
        middleware/    RequestIdMiddleware
    test/              e2e tests (auth-rbac, concurrency, audit-tamper, documents)
  frontend/
    src/
      pages/           Login, Dashboard, Applications, Detail, NewApplication, Admin, AuditVerify
      components/      AppLayout, Sidebar, TopBar, StatusBadge, Badge
      contexts/        AuthContext (JWT parse, token refresh)
      lib/             api.ts (Axios + interceptors), auth.ts, types.ts, utils.ts
  storage/             Local file storage (gitignored, simulated)
```

## What I Would Do With More Time

### Security
- **Rate limiting**: ThrottlerModule on auth endpoints (e.g., 5 attempts per minute on `/auth/login`)
- **MFA**: TOTP (authenticator app) for REVIEWER, DECISION_MAKER, and ADMIN roles
- **External WORM audit log**: Stream audit entries to S3 with Object Lock; sign with an HSM key
- **Anti-malware scanning**: ClamAV integration on document upload (polyglot file defense)
- **Secrets rotation**: HashiCorp Vault integration instead of .env files

### Features
- **Assignment**: Allow a reviewer to be explicitly assigned to an application rather than first-come-first-served
- **Notifications**: Email notifications on state transitions (applicant notified when info is requested, DM notified when recommendation is made)
- **Withdrawal**: Allow applicants to withdraw a SUBMITTED application (WITHDRAWN terminal state) with a justification required
- **Application versioning**: Show a full history of application field edits, not just status transitions
- **Bulk operations**: Allow an admin to export applications to CSV for regulatory reporting

### Production Readiness
- **Pagination**: Cursor-based pagination on all list endpoints (currently returns all rows)
- **Soft delete**: Add `deleted_at` to users and applications instead of hard delete
- **Connection pooling**: PgBouncer in transaction mode between the app and Postgres
- **OpenTelemetry**: Distributed tracing with Jaeger; metrics with Prometheus
- **CI/CD pipeline**: GitHub Actions: lint → unit tests → build → e2e tests against a test DB → docker build

### Frontend
- **Real-time updates**: WebSocket or SSE for live status updates without manual refresh
- **Document preview**: In-browser PDF preview before downloading
- **Accessible audit timeline**: ARIA roles and keyboard navigation for the audit trail
- **Dark mode**: Respects `prefers-color-scheme`
