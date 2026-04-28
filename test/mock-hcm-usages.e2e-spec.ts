import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';
import { PrismaService } from '../src/database/prisma.service';
import { applyInitialSchema, resetDatabase } from './database-test-utils';

type MockHcmUsageResponse = {
  transactionId: string;
  requestedDays: number;
  remainingBalanceDays: number;
  idempotencyKey: string;
};

type MockHcmBalanceResponse = {
  balanceDays: number;
};

describe('Mock HCM usage submission (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let server: Parameters<typeof request>[0];

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    configureApp(app);
    await app.init();

    prisma = app.get(PrismaService);
    server = app.getHttpServer() as Parameters<typeof request>[0];
    await applyInitialSchema(prisma);
  });

  beforeEach(async () => {
    await resetDatabase(prisma);
  });

  afterAll(async () => {
    await app.close();
  });

  async function createMockHcmBalance(balanceDays: number) {
    await request(server)
      .patch('/api/mock-hcm/balances/emp_001/loc_ny')
      .send({ balanceDays });
  }

  it('submits usage idempotently without double debiting HCM balance', async () => {
    await createMockHcmBalance(5);
    const payload = {
      employeeId: 'emp_001',
      locationId: 'loc_ny',
      requestedDays: 2,
      idempotencyKey: 'manual-usage-key',
    };

    const firstResponse = await request(server)
      .post('/api/mock-hcm/time-off-usages')
      .send(payload);
    const firstBody = firstResponse.body as MockHcmUsageResponse;

    expect(firstResponse.status).toBe(201);
    expect(firstBody).toMatchObject({
      requestedDays: 2,
      remainingBalanceDays: 3,
      idempotencyKey: 'manual-usage-key',
    });

    const retryResponse = await request(server)
      .post('/api/mock-hcm/time-off-usages')
      .send(payload);
    const retryBody = retryResponse.body as MockHcmUsageResponse;

    expect(retryResponse.status).toBe(201);
    expect(retryBody.transactionId).toBe(firstBody.transactionId);
    expect(retryBody.remainingBalanceDays).toBe(3);

    const balanceResponse = await request(server).get(
      '/api/mock-hcm/balances/emp_001/loc_ny',
    );
    const balanceBody = balanceResponse.body as MockHcmBalanceResponse;

    expect(balanceBody.balanceDays).toBe(3);
  });

  it('rejects idempotency key reuse with different usage payloads', async () => {
    await createMockHcmBalance(5);

    await request(server).post('/api/mock-hcm/time-off-usages').send({
      employeeId: 'emp_001',
      locationId: 'loc_ny',
      requestedDays: 2,
      idempotencyKey: 'manual-usage-key',
    });

    const conflictResponse = await request(server)
      .post('/api/mock-hcm/time-off-usages')
      .send({
        employeeId: 'emp_001',
        locationId: 'loc_ny',
        requestedDays: 3,
        idempotencyKey: 'manual-usage-key',
      });

    expect(conflictResponse.status).toBe(409);
  });

  it('rejects usage for invalid HCM dimensions', async () => {
    const response = await request(server)
      .post('/api/mock-hcm/time-off-usages')
      .send({
        employeeId: 'missing',
        locationId: 'loc_ny',
        requestedDays: 1,
        idempotencyKey: 'invalid-dimension',
      });

    expect(response.status).toBe(422);
  });

  it('rejects usage when HCM balance is insufficient', async () => {
    await createMockHcmBalance(1);

    const response = await request(server)
      .post('/api/mock-hcm/time-off-usages')
      .send({
        employeeId: 'emp_001',
        locationId: 'loc_ny',
        requestedDays: 2,
        idempotencyKey: 'insufficient-balance',
      });

    expect(response.status).toBe(409);
  });
});
