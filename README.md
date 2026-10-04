# Conduit QA Platform

[![PR smoke](https://github.com/yash4510/conduit-qa-platform/actions/workflows/pr-smoke.yml/badge.svg)](https://github.com/yash4510/conduit-qa-platform/actions/workflows/pr-smoke.yml)

A Playwright + TypeScript test automation platform for a self-hosted RealWorld "Conduit" app (a Medium-style blog: articles, comments, follows, favourites). The app runs locally in Docker, so every test runs against an environment I control.

## Stack

| Layer | Technology | Status |
|---|---|---|
| App under test | Conduit: React/Redux frontend, Express + Prisma API, PostgreSQL | done |
| Test framework | Playwright + TypeScript (strict), run directly by Node 24 | done |
| BDD | playwright-bdd (Gherkin features, page objects) | done |
| API layer | Typed client, every response validated with Zod | done |
| Test data | @faker-js/faker factories, API-created and cleaned up per test | done |
| CI | GitHub Actions: lint, typecheck, app in Docker, smoke suite | done |
| Accessibility, visual, network mocks, k6 | | planned |

## Quick start

Needs Docker Desktop and Node 24. Ports 3000 and 4100 must be free.

```bash
docker compose up -d --build --wait   # returns once db, api and frontend are healthy
npm ci
npx playwright install --with-deps chromium
npm run test:smoke
```

- App: http://localhost:4100
- API: http://localhost:3000/api/tags
- Report: `npm run report`

Optional demo data for exploring the app by hand (tests do not use it):

```bash
npm run seed   # demo_user_1@example.test / Conduit@123
```

Reset to an empty database: `docker compose down -v && docker compose up -d --wait`

## What the smoke suite covers

| Feature | Scenarios |
|---|---|
| Authentication | guest sees sign in / sign up, sign up, sign in, wrong password rejected, signed-in user recognised |
| Articles | publish, edit, delete |
| Comments | post, delete |

## How it is built

- **Auth once, reuse everywhere.** A setup project signs up a user through the API and saves the browser session (`storageState`). Scenarios tagged `@guest` start signed out.
- **Arrange through the API, assert through the UI.** "Given I have published an article" calls the API, so each scenario only drives the UI for the behaviour it tests. Created articles are deleted after each scenario.
- **Locators a user would recognise.** The app has no test ids or form labels, so page objects use roles, visible text and placeholders. CSS is used only where the app exposes nothing else, with a comment saying why.
- **Debuggable failures.** Every test sends an `x-correlation-id` header, and the API calls it made (method, URL, status, duration) are attached to the report when it fails.
- **Reproducible app.** Both upstream repos are pinned to commit SHAs, every container has a healthcheck, and the theme CSS is bundled with a checksum after the original CDN link went dead.

## Findings so far

- The global feed only lists articles by "demo" accounts, so articles by normal users are hidden from everyone else. Cause: a filter in the backend's article query.
- Some API responses differ from the RealWorld spec: a failed login returns 403, and a 401 uses a different error body.
- Form inputs have no labels and the comment delete control is an unlabelled icon (accessibility).

## Project layout

```
features/ui/        Gherkin scenarios
src/pages/          page objects (actions and state, no assertions)
src/components/     shared UI parts (navbar)
src/steps/          step definitions (assertions live here)
src/fixtures/       Playwright fixtures: API client, logging, cleanup, auth
src/api/            typed API client and Zod schemas
src/data/           faker factories
src/scripts/        seed script
tests/              auth setup (more suites to come)
docker/             Dockerfiles and nginx config for the app under test
```

## Test counts and pipeline times

[TBD] — filled in from real CI runs.

## What I'd do next

[TBD]
