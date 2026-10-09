# Conduit QA Platform

[![PR smoke](https://github.com/yash4510/conduit-qa-platform/actions/workflows/pr-smoke.yml/badge.svg)](https://github.com/yash4510/conduit-qa-platform/actions/workflows/pr-smoke.yml)
[![Nightly regression](https://github.com/yash4510/conduit-qa-platform/actions/workflows/nightly-regression.yml/badge.svg)](https://github.com/yash4510/conduit-qa-platform/actions/workflows/nightly-regression.yml)

Latest nightly report: [TBD]

A Playwright + TypeScript test automation platform for a self-hosted RealWorld "Conduit" app (a Medium-style blog: articles, comments, follows, favourites). The app runs locally in Docker, so every test runs against an environment I control.

## Stack

| Layer | Technology | Status |
|---|---|---|
| App under test | Conduit: React/Redux frontend, Express + Prisma API, PostgreSQL | done |
| Test framework | Playwright + TypeScript (strict), run directly by Node 24 | done |
| UI tests | playwright-bdd (Gherkin features, page objects) | done |
| API tests | Typed client, every response validated with Zod | done |
| Hybrid tests | API for setup and verification, browser for the behaviour | done |
| Test data | @faker-js/faker factories, a fresh user per test | done |
| CI on pull requests | GitHub Actions: lint, typecheck, app in Docker, smoke suite (shardable), one "PR gate" check | done |
| Nightly run | Chromium + Firefox, sharded, merged HTML report | done |
| Report on GitHub Pages, failure webhook | | [TBD] until the first publish from `main` |
| Accessibility, visual, network mocks, k6 | | planned |

## Quick start

Needs Docker Desktop and Node 24. Ports 3000 and 4100 must be free.

```bash
docker compose up -d --build --wait   # returns once db, api and frontend are healthy
npm ci
npx playwright install --with-deps chromium
npm run test:smoke
```

| Command | Runs |
|---|---|
| `npm run test:smoke` | the `@smoke` set: the PR gate |
| `npm run test:api` | API tests only (no browser) |
| `npm run test:hybrid` | hybrid tests |
| `npm run test:regression` | everything, on Chromium |
| `npm run test:firefox` | UI and hybrid tests on Firefox (`npx playwright install firefox` first) |
| `npm run report` | opens the HTML report |

App: http://localhost:4100 · API: http://localhost:3000/api/tags

Optional demo data for exploring the app by hand (tests do not use it): `npm run seed`, then log in as `demo_user_1@example.test` / `Conduit@123`.
Reset to an empty database: `docker compose down -v && docker compose up -d --wait`

## Test strategy

**Scope.** The whole product surface of Conduit: accounts, articles, comments, favourites, follows, feeds and tags.

**Approach.** Most checks sit at the API level because it is the fastest and most precise place to test rules, permissions and error handling. The browser is used for what only a browser can show: forms, navigation, what a user sees. Hybrid tests join the two, so a UI action is verified in the API and an API change is verified in the UI.

| Layer | What it proves | Tags |
|---|---|---|
| API (`tests/api`) | rules, permissions, validation, exact error bodies | `@api` |
| Hybrid (`tests/hybrid`) | UI and API agree on the same data | `@hybrid` |
| UI (`features/ui`) | the main user journeys through the browser | `@ui` |

`@smoke` is the small set that gates a pull request. `@regression` is everything else. `test:regression` runs both.

**Risks I focused on.**
- Permissions: can a guest or another user change someone else's data?
- Validation: are bad inputs rejected with a clear error and the right status?
- Data visibility: do users see the articles and comments they should?
- Errors: does the server ever answer with a 500 or leak internal messages?

**Known defects are tests, not comments.** When the app is wrong, the test asserts the correct behaviour and is marked as an expected failure (`test.fail()`). It stays green while the defect exists and turns red the day someone fixes it, which tells me to remove the marker. Where the API has a quirk the frontend depends on (for example 403 for a wrong password), the test pins the current behaviour and says so in a comment.

**Out of scope.** Performance (only a k6 smoke is planned), security testing beyond the checks above, mobile browsers, and the third-party hosts the original app loads icons and fonts from.

## Traceability

| Feature | API tests | UI scenarios | Hybrid tests |
|---|---|---|---|
| Sign up | `users.spec`: required fields, taken username and email, no password in response, malformed email (defect) | sign up, taken email, taken username | account created in the UI can log in through the API |
| Sign in | `users.spec`: success, wrong password, no user enumeration, missing fields | sign in, wrong password, unregistered email | |
| Session and account | `users.spec`: current user, invalid token, bio and image update, taken email (defect) | signed-in user shown, sign out | bio saved in settings is stored by the API |
| Articles | `articles.spec`: create, read, validation, update, slug change, partial update (defect), delete, permissions | publish, edit, delete, edit and delete buttons by owner, guest reads an article, publish errors (defect) | created in the API shown in the UI, published in the UI stored by the API, edited in the UI |
| Comments | `comments.spec`: add, list, validation, delete, permissions, visibility to others (defect) | post, delete, box emptied, guest asked to sign in | posted in the UI stored by the API, added in the API shown in the UI, deleted in the UI |
| Favourites | `favorites.spec`: favourite, repeat, remove, counts, guest, unknown article (defect) | favourite, remove favourite | favourite and unfavourite recorded by the API |
| Follows and feed | `profiles.spec`, `articles.spec`: follow, unfollow, visibility, feed contents, unknown user (defect) | follow, unfollow, feed, empty feed | follow and unfollow recorded by the API, followed author in the feed |
| Lists and tags | `articles.spec`, `tags.spec`: order, paging, tag and favourite filters, global list (defect), popular tags | | |

## How it is built

- **Every test owns its data.** API and hybrid tests register a fresh user per test, so no test depends on another and they run in any order. Articles are deleted after each test.
- **Auth once for the UI suite.** A setup project signs a user up through the API and saves the browser session, which the BDD scenarios reuse. Scenarios tagged `@guest` start signed out.
- **Arrange through the API, assert through the UI.** "Given I have published an article" calls the API, so a scenario only drives the browser for the behaviour it tests.
- **Locators a user would recognise.** The app has no test ids or form labels, so page objects use roles, visible text and placeholders. CSS is used only where the app exposes nothing else, with a comment saying why.
- **Debuggable failures.** Every test sends an `x-correlation-id` header, and the API calls it made (method, URL, status, duration) are attached to the report when it fails.
- **Reproducible and self-contained app.** Both upstream repos are pinned to commit SHAs, every container has a healthcheck, and the theme CSS and icon font are bundled with checksums after their original hosts stopped working. The test browser aborts any request to a non-local host, so a slow CDN cannot make a test flaky.

## CI/CD

**On every pull request** (`PR smoke`):
1. `Lint, typecheck, format` runs in parallel with the app build, so a style error fails in seconds.
2. `Smoke` is a matrix of shards (one today, see the measurements below). Each shard builds the app images with a Docker layer cache, starts them with `docker compose up --wait`, and runs its share of the `@smoke` tests.
3. `Merge reports` combines the shards' blob reports into one HTML report, with traces, screenshots and videos for anything that failed.
4. `PR gate` is the single check that has to be green. It stays the same name however many shards there are, so branch protection never needs updating.

**Every night** (`Nightly regression`, 02:00 Chennai time, or by hand): the whole suite on Chromium and on Firefox, sharded, then one merged report. On `main` it is published to GitHub Pages together with a small `history.json` (totals and flaky count per run). If a shard fails, a webhook message is sent.

**How sharding and merging work.** `--shard=1/2` makes a job run half of the selected tests. The `setup` project runs in every shard, because the tests depend on it. With the `blob` reporter each shard writes a zip instead of a report; the merge job downloads them all and `playwright merge-reports` builds one HTML report as if the run had never been split.

**Measured pipeline times.** I ran the same code through five setups, five warm-cache runs each (six for the old workflow), on GitHub-hosted runners over several days:

| Pipeline | What is timed | Median | Min | Max |
|---|---|---|---|---|
| PR smoke, old: rebuild the app every run, no sharding | until the smoke job finishes | 146.5 s | 119 s | 153 s |
| PR smoke, layer cache, 1 shard | until "PR gate" is green | 125 s | 96 s | 139 s |
| PR smoke, layer cache, 2 shards | until "PR gate" is green | 136 s | 123 s | 174 s |
| Nightly, 1 shard per browser | whole workflow | 162 s | 144 s | 172 s |
| Nightly, 2 shards per browser | whole workflow | 152 s | 148 s | 162 s |

The first run after the cache is empty is slower: 234 to 243 s for the PR setups and 214 to 239 s for the nightly ones.

What I take from it:
- **The layer cache helped.** Time until the gate is green dropped by about 15% (146.5 s to 125 s). Building the app was the biggest single step before; with a warm cache it takes about 20 to 30 s.
- **Sharding the PR smoke suite did not help.** It was about 11 s slower. The smoke tests take 6 to 10 s, and every shard repeats well over a minute of setup (checkout, image load, starting the app, installing the browser). So the PR gate uses one shard, and splitting again is a one-line change in the workflow.
- **Sharding the nightly run helped a little**, about 6% (162 s to 152 s). It will matter more as the suite grows.
- With five runs per setup and overlapping ranges, treat these as a direction, not proof.

To reproduce: `node src/scripts/ci-metrics.ts runs pr-smoke.yml --branch=ci-bench-b --until-job="PR gate" --skip-oldest=1`.

## Findings

Real defects found while testing, each covered by a test marked as an expected failure:

| Area | Defect |
|---|---|
| Visibility | The global article list shows only articles by "demo" accounts or the viewer's own, so an ordinary user's articles are hidden from everyone else |
| Visibility | Comments follow the same rule: only the author of a comment can see it |
| Articles | Updating only the body removes all tags |
| Errors | Five requests return a 500 with a raw database or JavaScript error message instead of a 4xx: taking an email that is already used, following an unknown user, favouriting an unknown article, commenting on an unknown article, and creating an article without an article object |
| Errors | Listing comments of an unknown article returns 200 with an empty object |
| Validation | Registration accepts any string as an email |
| Frontend | A failed publish (for example a missing or duplicate title) crashes the app's reducer: no message is shown and the Publish button stays disabled |

Contract differences from the usual RealWorld behaviour, pinned by tests: a wrong password returns 403, a missing or invalid token returns a body that is not an `errors` object, and several 404 responses have an empty body.

Accessibility notes for later: form inputs have no labels, and the comment delete control is an unlabelled icon.

## Test counts and timings

Measured on my machine with 8 workers, app already running.

| Suite | Tests | Of which expected failures (known defects) |
|---|---|---|
| API | 81 | 11 |
| Hybrid | 13 | 0 |
| UI (BDD scenarios) | 27 | 2 |
| Setup | 1 | 0 |
| **Total** | **122** | **13** |

- Full run: 122 passed in 29.1 s.
- Stability: the whole suite repeated three times, 364 passed, none failed.
- CI: the nightly run (Chromium and Firefox, two shards each) has a median wall time of 152 s over five warm runs.

## Project layout

```
features/ui/        Gherkin scenarios
src/pages/          page objects (actions and state, no assertions)
src/components/     shared UI parts (navbar, error list)
src/steps/          step definitions (assertions live here)
src/fixtures/       Playwright fixtures: API clients, sessions, logging, cleanup, auth
src/api/            typed API client, Zod schemas, error assertions
src/data/           faker factories
src/scripts/        seed script
tests/api/          API tests
tests/hybrid/       hybrid tests
tests/auth.setup.ts signs in once for the UI suite
docker/             Dockerfiles and nginx config for the app under test
```

## What I'd do next

[TBD]
