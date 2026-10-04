# Conduit QA Platform

> A Playwright + TypeScript test automation platform for the self-hosted RealWorld "Conduit" app — built as a public SDET portfolio.

<!-- CI badge will go here once GitHub Actions is wired in Phase 1 -->

## Stack

| Layer | Technology |
|---|---|
| App under test | RealWorld Conduit (React/Redux + Node/Express + Prisma + PostgreSQL) |
| Test framework | Playwright + TypeScript (strict) |
| BDD | playwright-bdd (Gherkin) |
| API validation | Zod schemas |
| Test data | @faker-js/faker factories |
| Accessibility | @axe-core/playwright |
| Reporting | Allure + Playwright HTML |
| CI/CD | GitHub Actions (sharding, matrix, Pages report) |
| Performance | k6 smoke |

## Run the app

**Prerequisites:** Docker Desktop running, ports 3000 and 4100 free.

```bash
# Build and start; returns once every service passes its healthcheck
docker compose up -d --build --wait
```

- Frontend: http://localhost:4100
- API: http://localhost:3000/api/tags

**Reset all test data** (clean slate):
```bash
docker compose down -v   # removes the Postgres volume
docker compose up -d --wait
```

**Stop the app:**
```bash
docker compose down
```

## Quick start (tests — Phase 1 onwards)

```bash
npm ci
npx playwright install --with-deps
npm run test:smoke
```

## Architecture

<!-- Diagram will be added in Phase 4 -->

## Test counts and pipeline times

<!-- Filled from real runs — see PLAN_TRACKER.md Metrics table -->

## What I'd do next

<!-- Filled at end of Phase 4 -->
