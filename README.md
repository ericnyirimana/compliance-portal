# BNR Licensing & Compliance Portal

> Take-home assessment — National Bank of Rwanda

## Quick start

```bash
cp .env.example .env
# Edit .env with your secrets
docker compose up
```

- Backend: http://localhost:3000
- Frontend: http://localhost:5173
- API docs: http://localhost:3000/api/docs

## Seed credentials

| Email | Password | Role |
|---|---|---|
| alice@bnr.test | Password1! | APPLICANT |
| bob@bnr.test | Password1! | REVIEWER |
| carol@bnr.test | Password1! | DECISION_MAKER |
| dave@bnr.test | Password1! | ADMIN |

## Running tests

```bash
# Backend unit + integration tests
cd backend && npm test

# Backend e2e (requires running Postgres)
cd backend && npm run test:e2e

# Frontend tests
cd frontend && npm test
```

## TypeORM commands

```bash
# Generate a new migration
cd backend && npm run migration:generate -- src/database/migrations/MigrationName

# Run pending migrations
cd backend && npm run migration:run

# Revert last migration
cd backend && npm run migration:revert

# Run seed
cd backend && npm run seed
```

## Documentation

- [DESIGN.md](./DESIGN.md) — Architecture, data model, state machine, trade-offs
- [backend/openapi.yaml](./backend/openapi.yaml) — OpenAPI 3 spec
- [backend/postman_collection.json](./backend/postman_collection.json) — Postman collection

## What I would do with more time

_See DESIGN.md → Production gaps_
