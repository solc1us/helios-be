# Helios Backend — Codex Context

## 1. Project Context

Helios is a health-focused NLP application.

A patient submits a health complaint in Indonesian free text. The backend stores the consultation and passes the text to an internally owned AI model. The AI produces structured pre-screening information that is later reviewed by a doctor.

AI output is decision-support information for doctors and must not be treated as an automatic final diagnosis.

---

## 2. Current Stack

```text
Runtime     : Bun
Language    : TypeScript
Framework   : Express.js 5
Database    : PostgreSQL
Database DB : helios
ORM         : Prisma 7
Validation  : Zod
Logging     : Pino
API Style   : REST
API Base    : /api/v1
```

Local development:

```text
Frontend : http://localhost:3000
Backend  : http://localhost:3001
```

---

## 3. Project Structure

The backend follows a layered structure:

```text
helios-be/
├── src/
│   ├── adapters/
│   ├── config/
│   ├── constants/
│   ├── controllers/
│   ├── jobs/
│   ├── middlewares/
│   ├── repositories/
│   ├── routes/
│   ├── services/
│   ├── types/
│   ├── utils/
│   ├── validators/
│   ├── workers/
│   ├── app.ts
│   └── server.ts
│
├── prisma/
│   ├── migrations/
│   ├── schema.prisma
│   └── seed.ts
│
├── tests/
├── AGENTS.md
├── codex-context.md
├── docs.md
├── package.json
├── prisma.config.ts
└── tsconfig.json
```

Main application flow:

```text
Route
  ↓
Validator / Middleware
  ↓
Controller
  ↓
Service
  ↓
Repository
  ↓
Prisma
```

Controllers should remain thin.

Business logic belongs in services.

Database access belongs in repositories.

---

## 4. Main Entities

The current database contains:

```text
Patient
Doctor
Admin
Consultation
AiAnalysis
DoctorReview
AuditLog
```

Patient, Doctor, and Admin are intentionally separate entities.

Do not merge them into a generic `User` table unless explicitly requested.

Main relationships:

```text
Patient
   │
   └──< Consultation >── Doctor
              │
              ├── AiAnalysis
              ├── DoctorReview
              └──< AuditLog
```

All primary keys use UUID.

Prisma fields use TypeScript-style camelCase while PostgreSQL tables and columns use snake_case mappings.

---

## 5. Authentication Model

Authentication uses JWT Bearer Token.

Actors:

```text
patient
doctor
admin
```

Authentication endpoints are intentionally separated:

```text
POST /api/v1/auth/patient/register
POST /api/v1/auth/patient/login

POST /api/v1/auth/doctor/login

POST /api/v1/auth/admin/login

GET  /api/v1/auth/me
```

Doctor and Admin do not have public registration endpoints.

JWT payload should contain at least:

```json
{
	"sub": "actor-uuid",
	"role": "patient"
}
```

Password hashes must never appear in API responses.

---

## 6. Consultation Flow

Current consultation states:

```text
SUBMITTED
   ↓
PROCESSING
   ↓
ANALYZED
   ↓
IN_REVIEW
   ↓
REVIEWED
   ↓
CLOSED
```

AI failure:

```text
PROCESSING
   ↓
FAILED
```

Patient creates the consultation.

AI processes the consultation.

Doctor reviews the resulting pre-screening information.

For MVP, a doctor will claim an available consultation before reviewing it.

---

## 7. AI Integration

The AI model is internally owned.

The backend should treat AI processing as a separate concern.

Preferred flow:

```text
Consultation Service
        ↓
AI Analysis Service
        ↓
AI Model Adapter
        ↓
Internal AI Model
```

Do not call AI inference directly from a route or controller.

AI output must be validated before being stored.

The expected structured output contains fields such as:

```text
summary
detectedSymptoms
duration
severityLevel
possibleCategory
urgencyLevel
doctorNoteSuggestion
confidenceScore
modelVersion
```

Detailed AI output contracts are documented in `docs.md`.

---

## 8. Database State

Phase 2 database work is complete.

Models:

```text
Patient
Doctor
Admin
Consultation
AiAnalysis
DoctorReview
AuditLog
```

Enums:

```text
AccountStatus
ConsultationStatus
SeverityLevel
UrgencyLevel
ActorType
```

Initial migration:

```text
20260811064237_init
```

The migration has been applied successfully.

Development Admin seed:

```text
prisma/seed.ts
```

Environment variables:

```text
DEV_ADMIN_NAME
DEV_ADMIN_EMAIL
DEV_ADMIN_PASSWORD
```

The seed is idempotent.

Dockerized PostgreSQL development is available through `compose.yaml` using
PostgreSQL 18, a named persistent volume, a configurable host port, and the
existing migration workflow through `prisma migrate deploy`.

---

## 9. Development Progress

### Phase 1 — Complete

Completed:

- Bun + Express.js setup
- TypeScript setup
- environment configuration
- PostgreSQL connection
- Prisma setup
- logging
- global error handler
- route aggregator
- health endpoint
- graceful shutdown

Health endpoint:

```text
GET /api/v1/health
```

Expected backend address:

```text
http://localhost:3001
```

---

### Phase 2 — Complete

Completed:

- Prisma models
- Prisma enums
- relations
- indexes
- constraints
- initial migration
- development Admin seed
- Prisma Client generation
- migration verification

---

### Phase 3 — Complete

Completed:

- separate Patient, Doctor, and Admin authentication;
- patient registration;
- patient login by email or phone;
- doctor and admin login;
- JWT Bearer access tokens with actor ID and role claims;
- authenticated current-account lookup;
- bcrypt password utilities;
- Zod request validation;
- authentication and role middleware;
- narrow Prisma authentication repositories;
- unit tests for utilities, services, validators, and middleware.

Implemented endpoints:

```text
POST /api/v1/auth/patient/register
POST /api/v1/auth/patient/login
POST /api/v1/auth/doctor/login
POST /api/v1/auth/admin/login
GET  /api/v1/auth/me
```

Implemented components:

```text
auth.controller
auth.service

patient.repository
doctor.repository
admin.repository

auth.validator

auth.middleware
patientOnly.middleware
doctorOnly.middleware
adminOnly.middleware

password utility
JWT utility
role constants
Express auth request typing
```

Do not implement consultation endpoints as part of Phase 3.

---

### Phase 4 — Complete

Completed:

- authenticated patient consultation creation;
- patient-owned consultation history;
- status filtering and page/limit pagination;
- newest-first consultation ordering;
- generated complaint previews;
- ownership-scoped consultation detail lookup;
- enumeration-safe 404 behavior for missing and foreign consultations;
- strict body, query, and UUID validation;
- Patient-only route protection;
- Phase 4 unit and route-protection tests.

Implemented endpoints:

```text
POST /api/v1/patient/consultations
GET  /api/v1/patient/consultations
GET  /api/v1/patient/consultations/:id
```

During Phase 4, consultations remained in `SUBMITTED` after creation. Phase 5
has since extended the create flow with synchronous dummy AI processing.

Phase 4.1 added patient dashboard data to the existing consultation history
endpoint: lightweight `complaint_text`, doctor-confirmed category, reviewed-only
confidence, UTC current-month count, best reviewed confidence, deterministic top
diagnosis, and final-category distribution. Dashboard statistics remain
patient-scoped and independent from table pagination and status filtering. Raw
AI analysis and unreviewed AI categories remain private.

### Phase 4.2 — Complete

Phase 4.2 added a modular OpenAPI 3.0.3 definition for every implemented
endpoint, Swagger UI at `/api-docs`, the raw shared specification at
`/openapi.json`, JWT `BearerAuth`, and automated OpenAPI validation and route
coverage tests. Documentation routes are enabled in development/test and
disabled by default in production.

---

### Phase 5 — Dummy AI Integration: Complete

An `AiModelAdapter` abstraction now isolates model transport from consultation
processing. The deterministic `DummyAiModelAdapter` is currently wired in;
Patient consultation creation synchronously transitions `SUBMITTED` to
`PROCESSING`, validates the dummy output, persists `AiAnalysis`, records system
audit events, and transitions to `ANALYZED` or `FAILED`. The POST response
temporarily returns the safe dummy analysis without raw output or processing
timing. A real model adapter remains deferred.

---

### Phase 6 — Doctor Consultation & Review: Complete

Doctors now have ownership-safe `available` and `mine` consultation queues,
safe AI detail access, atomic consultation claim, transactional one-time
`DoctorReview` creation, and the `ANALYZED -> IN_REVIEW -> REVIEWED -> CLOSED`
workflow. Patient detail exposes only confirmed safe review fields, while the
existing Patient dashboard automatically incorporates reviewed categories and
confidence. Doctor view, claim, review, and status changes are audited.

---

### Phase 7 — Admin Management: Complete

Admin now has protected Doctor account list/create/detail/profile/status
management, Patient list/detail/status monitoring, read-only Consultation
monitoring, and paginated AuditLog access. Doctor creation uses the existing
bcrypt password utility; account status changes preserve historical relations.
Admin Doctor/account changes and Consultation detail views create safe audit
events without health free text.

### Phase 8 — Security & Validation Hardening: Complete

Authentication and AI-triggering writes now have configurable in-memory rate
limits. Protected actor routes verify current account existence/status, CORS is
strictly allowlisted, JSON payloads remain bounded, logging redacts credentials
and health free text, and malformed/oversized/unexpected errors are sanitized.
Helmet and production-disabled Swagger behavior have dedicated regression tests.

### Phase 9 — Next

Testing & API Documentation.

---

## 10. Remaining Roadmap

```text
Phase 9  Testing & API Documentation
Phase 10 Deployment Preparation
```

Only implement the currently requested phase.

---

## 11. Important Development Rules

- Preserve the existing layered architecture.
- Reuse existing files and utilities where possible.
- Prisma remains the database schema source of truth.
- Do not manually modify PostgreSQL tables outside Prisma migrations.
- Do not change backend port `3001`.
- Do not change frontend CORS origin `http://localhost:3000`.
- Do not expose password hashes.
- Do not expose Prisma/internal errors.
- Do not put sensitive health text into general application logs.
- Do not implement future phases unless explicitly requested.
- Read `docs.md` only when the detailed API/data contract is required.

For repository-wide coding and security rules, follow `AGENTS.md`.
