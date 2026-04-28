# Delivery Checklist

This document maps the take-home exercise requirements to the submitted
solution.

## Requirement Coverage

| Exercise Requirement               | Solution Coverage                                                                                                                                  |
| ---------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| Build a Time-Off Microservice      | NestJS service with dedicated balance, request lifecycle, mock HCM, database, and health modules.                                                  |
| Manage time-off request lifecycle  | `POST /api/time-off-requests`, `GET /api/time-off-requests/:id`, `POST /api/time-off-requests/:id/approve`, `reject`, and `cancel`.                |
| Maintain balance integrity         | Pending requests reserve local balance; approvals submit usage to HCM; local balances are refreshed from HCM after approval and batch sync.        |
| HCM remains source of truth        | HCM mock owns canonical balances; local balances are treated as synchronized snapshots.                                                            |
| HCM can change independently       | `PATCH /api/mock-hcm/balances/:employeeId/:locationId` simulates external HCM balance changes; `POST /api/balances/sync` refreshes local balances. |
| Realtime HCM API                   | `GET /api/mock-hcm/balances/:employeeId/:locationId` and `POST /api/mock-hcm/time-off-usages`.                                                     |
| Batch HCM endpoint                 | `GET /api/mock-hcm/balances` returns the full HCM balance corpus; `POST /api/balances/sync` consumes it.                                           |
| Defensive HCM behavior             | Invalid dimensions return `422`; insufficient balances return `409`; failed approval transitions are persisted as `APPROVAL_FAILED`.               |
| Per-employee per-location balances | Database uniqueness constraints and API paths use `employeeId` plus `locationId`.                                                                  |
| NestJS and SQLite                  | NestJS, Prisma, and SQLite are used throughout the implementation.                                                                                 |
| TRD                                | `docs/TRD.md` documents requirements, assumptions, design, alternatives, risks, security, observability, and implementation plan.                  |
| Tests and coverage proof           | `docs/TESTING.md` documents test strategy and coverage; Jest enforces 80% global coverage thresholds.                                              |

## Final Validation

Run the full validation command before packaging:

```bash
npm run validate
```

Equivalent expanded commands:

```bash
npm run build
npm run lint
npm test
npm run test:e2e
npm run test:cov
```

Latest local validation results:

| Check      | Result                                                             |
| ---------- | ------------------------------------------------------------------ |
| Build      | Passed                                                             |
| Lint       | Passed                                                             |
| Unit tests | 12 suites, 47 tests passed                                         |
| E2E tests  | 4 suites, 23 tests passed                                          |
| Coverage   | 96.75% statements, 88.46% branches, 93.84% functions, 96.38% lines |

## Packaging

Create the final zip from the latest committed revision:

```bash
npm run package:zip
```

The packaging command uses `git archive`, so only tracked repository files are
included. This intentionally excludes local-only folders and files such as:

- `node_modules`
- `dist`
- `coverage`
- `.env`
- local SQLite database files

The generated file is:

```text
time-off-microservice.zip
```
