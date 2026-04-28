# Testing Strategy

This project uses a layered test strategy focused on balance integrity, lifecycle
rules, idempotency, and HCM integration behavior.

## Test Layers

### Unit Tests

Unit tests cover deterministic service and controller behavior:

- Balance synchronization and available-balance calculation.
- Time-off request creation rules.
- Request lifecycle transitions.
- Mock HCM usage submission and idempotency rules.
- DTO validation support through NestJS pipes.
- Structured HTTP exception responses.

Run them with:

```bash
npm test
```

### End-to-End Tests

End-to-end tests boot the NestJS application, apply the SQLite schema to a test
database, call the HTTP API with Supertest, and reset persisted data between
tests.

The e2e suite covers:

- Health endpoint availability.
- Mock HCM balance creation and reads.
- Batch balance sync from Mock HCM into local balances.
- Pending request creation and local balance reservation.
- Idempotent request creation.
- Local insufficient-balance rejection.
- Concurrent request creation that must not over-reserve the same balance.
- Approval through Mock HCM usage submission.
- Approval retry without double-debiting HCM.
- Reject and cancel flows releasing local reservations.
- Approval failure when the HCM balance changes externally.
- Invalid lifecycle transitions after approval.
- Direct Mock HCM usage submission idempotency and conflict handling.
- Invalid HCM dimensions and insufficient HCM balance handling.

Run them with:

```bash
npm run test:e2e
```

## Coverage

Coverage is enforced through Jest global thresholds in `package.json`:

- 80% statements
- 80% branches
- 80% functions
- 80% lines

Generate coverage with:

```bash
npm run test:cov
```

Latest local coverage run on 2026-04-28:

| Metric     | Result |
| ---------- | ------ |
| Statements | 96.75% |
| Branches   | 88.46% |
| Functions  | 93.84% |
| Lines      | 96.38% |

The latest local run passed 12 unit test suites with 47 tests.

## Full Validation

Before packaging or submitting the exercise, run:

```bash
npm run build
npm run lint
npm test
npm run test:e2e
npm run test:cov
```

The latest local e2e run passed 4 suites with 23 tests.
