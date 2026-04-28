# Time-Off Microservice

Backend service for managing employee time-off requests and synchronizing balances with an external HCM system.

The technical design is documented in [`docs/TRD.md`](docs/TRD.md).

## Tech Stack

- Node.js
- NestJS
- TypeScript
- SQLite
- Prisma
- Jest and Supertest

## Local Setup

Install dependencies:

```bash
npm install
```

Create a local environment file:

```bash
cp .env.example .env
```

Generate the Prisma Client:

```bash
npm run prisma:generate
```

Apply database migrations:

```bash
npm run prisma:migrate
```

If Prisma's migration engine is blocked in a constrained Windows environment,
apply the versioned initial SQL directly:

```bash
npm run db:apply-init
```

Start the service:

```bash
npm run start:dev
```

The health endpoint is available at:

```http
GET http://localhost:3000/api/health
```

## Sprint 2 API Flow

Create or update a mock HCM balance:

```http
PATCH http://localhost:3000/api/mock-hcm/balances/emp_001/loc_ny
Content-Type: application/json

{
  "balanceDays": 10
}
```

Read one mock HCM balance:

```http
GET http://localhost:3000/api/mock-hcm/balances/emp_001/loc_ny
```

Read the full mock HCM balance corpus:

```http
GET http://localhost:3000/api/mock-hcm/balances
```

Sync HCM balances into the local balance table:

```http
POST http://localhost:3000/api/balances/sync
```

Read the local synchronized balance:

```http
GET http://localhost:3000/api/balances/emp_001/loc_ny
```

## Sprint 3 API Flow

After syncing a local balance, create a pending time-off request:

```http
POST http://localhost:3000/api/time-off-requests
Content-Type: application/json

{
  "employeeId": "emp_001",
  "locationId": "loc_ny",
  "startDate": "2026-05-10",
  "endDate": "2026-05-11",
  "requestedDays": 2,
  "idempotencyKey": "emp_001-2026-05-10-2026-05-11"
}
```

Read the created request:

```http
GET http://localhost:3000/api/time-off-requests/{requestId}
```

Read the local synchronized balance again:

```http
GET http://localhost:3000/api/balances/emp_001/loc_ny
```

The pending request reserves local balance, so a 10-day synced balance with a
2-day pending request should return:

```json
{
  "syncedBalanceDays": 10,
  "pendingReservedDays": 2,
  "availableDays": 8
}
```

## Validation Commands

```bash
npm run build
npm test
npm run test:e2e
npm run lint
```

## Current Scope

Sprint 1 established the technical foundation:

- NestJS project structure
- Global validation pipe
- Structured HTTP exception filter
- Prisma and SQLite schema
- Initial database migration
- Health endpoint
- Baseline unit and e2e tests

Sprint 2 adds balance synchronization:

- Mock HCM realtime balance endpoint
- Mock HCM batch balance endpoint
- Test-only mock HCM balance mutation endpoint
- Local balance sync endpoint
- Local balance read endpoint
- Integer day-unit conversion to avoid floating-point balance errors

Sprint 3 adds pending time-off request creation:

- Create pending time-off requests
- Validate requested days and date ranges
- Reject requests before local balance sync
- Reject requests that exceed locally available balance
- Reserve local balance through `PENDING_APPROVAL` requests
- Return existing requests for repeated idempotency keys
- Reject idempotency key reuse with different payloads
