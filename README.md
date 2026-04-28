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

## Validation Commands

```bash
npm run build
npm test
npm run test:e2e
npm run lint
```

## Current Scope

Sprint 1 establishes the technical foundation:

- NestJS project structure
- Global validation pipe
- Structured HTTP exception filter
- Prisma and SQLite schema
- Initial database migration
- Health endpoint
- Baseline unit and e2e tests
