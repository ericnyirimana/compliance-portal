# BNR Licensing & Compliance Portal — Implementation Plan

## Overview
Replace BNR's manual email/spreadsheet licensing process for commercial banks with a
web application enforcing a strict workflow, tamper-evident audit trail, and defence-in-depth
security. Evaluators weight clean architecture, honest trade-offs, and regulatory-grade
correctness above feature volume.

---

## Milestone Execution Order

### M1 — Repo skeleton
- `docker-compose.yml`: services for `postgres`, `backend`, `frontend`
- `postgres/init.sql`: create two roles — `bnr_owner` (DDL, used by migrations) and
  `bnr_app` (runtime, limited grants). This separation ensures that even if the app is
  compromised, the attacker cannot issue DDL or revoke grants.
- `.env.example` with all required variables
- README stub (ports, seed creds placeholder)
- Conventional-commit tag: `chore: repo skeleton`

### M2 — Data model + migrations
Entities (TypeORM DataMapper pattern, explicit repositories):
- `User` — id, email, password_hash, role, is_active, created_at
- `Application` — id, applicant_id, bank_name, status, version (optimistic lock),
  submitted_at, decided_at, decision_notes
- `Review` — id, application_id, reviewer_id, action, notes, created_at
- `Document` — id, application_id, slot, current_version_id, created_at
- `DocumentVersion` — id, document_id, version_number, filename_original,
  filename_stored, mime_type, size_bytes, uploaded_by, created_at
- `AuditLog` — id, actor_user_id, action, application_id, state_before, state_after,
  payload (jsonb), occurred_at, request_id, ip, prev_hash, row_hash

Two migrations:
1. `001_initial_schema.ts` — creates all tables via TypeORM schema builder
2. `002_security_grants_and_triggers.ts` — raw SQL:
   - REVOKE UPDATE, DELETE, TRUNCATE on audit_log FROM bnr_app
   - BEFORE UPDATE OR DELETE trigger on audit_log → RAISE EXCEPTION
   - BEFORE INSERT/UPDATE trigger on applications — blocks updates to terminal-status rows
   - BEFORE INSERT/UPDATE trigger on decisions — asserts decision_maker_id ∉ reviewer ids

Commit: `feat: initial schema, migrations, security triggers`

### M3 — Seed script
Standalone `ts-node` script using the same DataSource (not a NestJS bootstrap).
Creates:
- 1× APPLICANT user — alice@bnr.test / Password1!
- 1× REVIEWER user — bob@bnr.test / Password1!
- 1× DECISION_MAKER user — carol@bnr.test / Password1!
- 1× ADMIN user — dave@bnr.test / Password1!
- Application A in UNDER_REVIEW with 2 document versions and review history
- Application B in APPROVED with full audit trail (including genesis row)

Commit: `feat: seed script`

### M4 — Auth module
- `POST /auth/register` — argon2id hash, create APPLICANT by default
- `POST /auth/login` — verify hash, issue JWT access (15m) + refresh (7d)
- `POST /auth/refresh` — rotate refresh: hash new, delete old, return new pair
- `POST /auth/logout` — delete refresh token row
- `JwtAuthGuard` — validates access token, attaches `req.user`
- Refresh tokens stored hashed (sha256) in `refresh_tokens` table; rotation invalidates prior
- Tests: login happy path, bad password, expired token, refresh rotation

Commit: `feat: auth module`

### M5 — RBAC
- `@Roles(...)` decorator + `RolesGuard` applied globally after `JwtAuthGuard`
- Per-endpoint role assertions
- `ReviewerNotDecisionMaker` guard: when a DECISION_MAKER posts a decision, fetch all
  `Review` rows for the application; if decision_maker_id appears in any `reviewer_id`,
  reject 403
- DB-level: trigger `chk_reviewer_not_decision_maker` on applications.decision_maker_id
- Tests: every role on key endpoints (happy + forbidden), reviewer≠decision-maker at both layers

Commit: `feat: RBAC and reviewer≠decision-maker invariant`

### M6 — Audit service
Single service injected by all state-changing services. One `writeAuditEntry(ctx)` method:
1. Opens (or reuses) a QueryRunner transaction
2. `SELECT id, row_hash FROM audit_log ORDER BY occurred_at DESC LIMIT 1 FOR UPDATE` —
   serialises concurrent chain appends
3. Computes `row_hash = sha256(prev_hash || canonical_json(entry_without_hashes))`
4. Inserts the audit row in the same transaction as the business action

`GET /audit/:applicationId` — paginated, applicants see only own app
`GET /audit/verify` — walks entire chain, reports first broken link (O(n) scan; add note
about cursor-based verification for prod scale)

Commit: `feat: audit service with hash chain`

### M7 — Application service + state machine
State machine as a pure module (`StateMachineService`) — no I/O, easily unit-tested:
```
DRAFT → SUBMITTED (applicant)
SUBMITTED → UNDER_REVIEW (reviewer, picks up)
UNDER_REVIEW → RETURNED_FOR_INFO (reviewer, requests info)
UNDER_REVIEW → PENDING_DECISION (reviewer, recommends)
RETURNED_FOR_INFO → SUBMITTED (applicant, resubmits)
PENDING_DECISION → APPROVED (decision_maker)
PENDING_DECISION → REJECTED (decision_maker)
```
Terminal: APPROVED, REJECTED — enforced in service (guard against update) AND DB trigger.

Optimistic locking:
- Entity has `@VersionColumn() version: number`
- Transitions use `repo.update({ id, version }, { status: next, version: version + 1 })`
- `affected === 0` → 409 `STALE_VERSION`

Endpoints:
- `POST /applications` — APPLICANT creates DRAFT
- `GET /applications` — filtered by role (applicants see own, reviewers/DMs see all)
- `GET /applications/:id` — role-checked
- `POST /applications/:id/submit` — DRAFT→SUBMITTED
- `POST /applications/:id/pickup` — SUBMITTED→UNDER_REVIEW (reviewer)
- `POST /applications/:id/request-info` — UNDER_REVIEW→RETURNED_FOR_INFO
- `POST /applications/:id/recommend` — UNDER_REVIEW→PENDING_DECISION
- `POST /applications/:id/decide` — PENDING_DECISION→APPROVED|REJECTED (decision_maker)
- `POST /applications/:id/resubmit` — RETURNED_FOR_INFO→SUBMITTED (applicant)

Commit: `feat: application service and state machine`

### M8 — Document service
- `POST /applications/:id/documents/:slot` — multipart, streamed
  - 5MB cap enforced on stream (running byte count, reject mid-stream)
  - MIME allow-list via `file-type` magic-byte sniff
  - Sanitise filename (no path traversal, no special chars)
  - Store at `./storage/<app_id>/<slot>/<version>/<uuid>__<safe_name>`
  - Insert DocumentVersion row, audit the upload
- `GET /applications/:id/documents/:slot` — list versions
- `GET /applications/:id/documents/:slot/:versionId` — authenticated download
  - Re-checks RBAC before streaming file from disk

Commit: `feat: document service`

### M9 — OpenAPI + error envelope
- NestJS Swagger module configured in `main.ts`, writes `openapi.yaml` on startup (dev) or
  via `npm run export:openapi` script
- Global exception filter converts all exceptions to:
  ```json
  { "error": { "code": "...", "message": "...", "request_id": "...", "details": {} } }
  ```
- No stack traces in responses; full trace logged server-side keyed to request_id
- `GET /health` returns `{ "status": "ok", "timestamp": "..." }`
- Generate Postman collection from openapi.yaml via `openapi-to-postmanv2`

Commit: `feat: OpenAPI spec and error envelope`

### M10 — Backend tests
Using Jest + Supertest with real Postgres (docker-compose test DB):
1. State machine unit tests — all valid/invalid transitions
2. Auth tests — login, refresh rotation, token expiry
3. AuthZ matrix — per-role happy + forbidden on key endpoints
4. Reviewer≠decision-maker — service layer + DB trigger
5. Concurrency test — two simultaneous HTTP requests on same app, assert 1 wins / 1 gets 409
6. Audit hash chain — tamper row via privileged connection, assert /audit/verify flags it
7. File size — 6MB stream, assert rejection
8. MIME sniff — .exe renamed to .pdf, assert rejection

Commit: `test: full backend test suite`

### M11 — Frontend
Tech: React + TypeScript + Vite + TanStack Query + Tailwind + shadcn/ui

Shell:
- Sidebar nav (role-aware links)
- Top bar with user menu (logout)
- Token refresh via Axios interceptor (silent retry on 401)

Pages:
- `/login` — form, error display
- `/` → redirect to `/dashboard`
- `/dashboard` — role-specific summary cards
- `/applications` — table with status filter, pagination
- `/applications/new` — multi-step wizard (applicant only)
- `/applications/:id` — tabs: Overview, Documents, Audit Timeline; action panel gated by role+state
- `/applications/:id/upload/:slot` — document upload with progress bar, errors
- `/admin/users` — list users, toggle active, create (admin only)

Every async surface: loading skeleton, error banner, empty state illustration.
Toast for transient feedback (react-hot-toast or sonner). No `alert()`.

Commit: `feat: frontend`

### M12 — Frontend tests
Vitest + React Testing Library:
- Login renders, submits, shows server error
- Dashboard shows correct links per role
- Gated action buttons not rendered for wrong role
- Application transition triggers optimistic UI, shows 409 conflict toast

Commit: `test: frontend tests`

### M13 — DESIGN.md + README final pass
- DESIGN.md: architecture diagram (ASCII/Mermaid), data model, state machine diagram,
  roles & permission matrix, hard decisions (each non-negotiable), ambiguity log,
  production gaps
- README: docker compose up → running system, seed credentials table, test commands,
  TypeORM commands, links to openapi.yaml and Postman collection,
  "What I would do with more time"

Commit: `docs: DESIGN.md and README final pass`

---

## Key Design Decisions (summary; full rationale in DESIGN.md)

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Auth tokens | JWT (access 15m + refresh 7d) | Stateless access checks at API layer without a DB round-trip per request; revocation handled via short-lived access + refresh rotation |
| ORM strategy | TypeORM DataMapper | Explicit repositories enforce clear boundaries; no magic on entity instances |
| Optimistic vs pessimistic locking | Optimistic (`@VersionColumn`) | Fits HTTP request model; low contention on typical review workflow; avoids held locks across network round trips |
| Audit append-only | DB-level REVOKE + trigger + app privilege | Defense in depth: app can't update/delete, trigger as belt-and-braces, hash chain detects superuser tampering |
| Reviewer ≠ DM | Service guard + DB trigger | Regulatory requirement — two independent enforcement layers so a bug in one doesn't break the invariant |
| File storage | Local disk with metadata in DB | Simple, auditable; DESIGN.md notes S3/GCS migration path for production |
| MIME validation | Magic-byte sniff (`file-type`) not Content-Type | Content-Type header is attacker-controlled; magic bytes are authoritative |

---

## Ambiguity Log (pre-execution snapshot; full log in DESIGN.md)

1. **Can an applicant withdraw a SUBMITTED application?** — Decided NO. No WITHDRAWN state.
   Alternative considered but rejected: adds a terminal state the spec doesn't describe and
   complicates the reviewer pickup flow.
2. **Who can pick up a SUBMITTED application?** — Any REVIEWER. No assignment mechanism.
   Adds complexity; a real system would need it.
3. **Multiple reviewers per application?** — Allowed (each creates a Review row). DM-invariant
   checks all review rows, not just the last.
4. **Application fields?** — Minimal: bank_name, licence_type, capital_amount, address.
   Enough to demonstrate the flow without over-engineering a form.
5. **Refresh token storage?** — Stored hashed (sha256) in DB. On rotation, old hash deleted.
   This defends against token theft from the DB.

---

## Timeline Estimate
Milestones 1-9 (backend): ~6–7 hours of focused work
Milestone 10 (tests): ~2 hours
Milestones 11-12 (frontend): ~4–5 hours
Milestone 13 (docs): ~1 hour
