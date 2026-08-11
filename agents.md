# AGENTS.md

## Project Overview

Helios is a backend service for a health-focused NLP application.

Tech stack:

- Bun
- TypeScript
- Express.js
- PostgreSQL
- Prisma
- Zod
- Pino

Use the existing project conventions and avoid unnecessary architectural changes.

For project-specific architecture and current development context, read `codex-context.md`.

For detailed API contracts and backend specifications, refer to `docs.md` only when needed.

---

## Build and Test Commands

Common commands:

```bash
bun install
bun run dev
bun run typecheck
bun test
bun run prisma:validate
bun run prisma:generate
bunx --bun prisma migrate status
```

For database schema changes:

```bash
bunx --bun prisma migrate dev --name <migration-name>
```

Before completing a task, run the relevant validation and test commands.

---

## Code Style Guidelines

- Use TypeScript.
- Follow existing naming and folder conventions.
- Prefer small, focused functions.
- Avoid duplicate helpers or abstractions.
- Keep controllers thin.
- Keep business logic outside route definitions.
- Keep Prisma/database logic outside controllers.
- Validate external input with Zod.
- Reuse existing utilities, constants, services, and repositories before creating new ones.
- Do not introduce new dependencies unless necessary.
- Avoid unrelated refactors.

---

## Testing Instructions

- Use Bun's built-in test runner.
- Add tests for new business logic where appropriate.
- Prefer unit tests for services, utilities, validators, and middleware.
- Use mocks when a real database is unnecessary.
- Do not run destructive tests against the development database.
- Existing tests must continue to pass.

A task should not be considered complete if relevant tests or type checking fail.

---

## Security Considerations

Helios processes health-related data and should be treated as a sensitive-data application.

Always:

- validate external input;
- enforce authentication and authorization;
- enforce ownership and role checks;
- hash passwords securely;
- keep secrets in environment variables;
- avoid exposing internal errors;
- avoid logging sensitive health data unnecessarily;
- never return password hashes;
- apply least-privilege access;
- preserve auditability for sensitive actions.

Do not weaken existing security controls unless explicitly requested.

---

## Scope

Implement only the requested task or development phase.

Do not proactively implement future roadmap features.

If a requirement conflicts with the existing project design, report the conflict instead of silently redesigning the system.
