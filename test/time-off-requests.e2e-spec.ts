import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';
import { PrismaService } from '../src/database/prisma.service';
import { TIME_OFF_REQUEST_STATUS } from '../src/time-off-requests/time-off-request-status';
import { applyInitialSchema, resetDatabase } from './database-test-utils';

type TimeOffRequestResponse = {
  id: string;
  employeeId: string;
  locationId: string;
  requestedDays: number;
  requestedUnits: number;
  status: string;
};

type BalanceResponse = {
  availableDays: number;
  pendingReservedDays: number;
};

describe('Time-off request creation (e2e)', () => {
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

  async function syncMockHcmBalance(balanceDays: number) {
    await request(server)
      .patch('/api/mock-hcm/balances/emp_001/loc_ny')
      .send({ balanceDays });
    await request(server).post('/api/balances/sync');
  }

  it('creates a pending request and reserves local balance', async () => {
    await syncMockHcmBalance(10);

    const createResponse = await request(server)
      .post('/api/time-off-requests')
      .send({
        employeeId: 'emp_001',
        locationId: 'loc_ny',
        startDate: '2026-05-10',
        endDate: '2026-05-11',
        requestedDays: 2,
        idempotencyKey: 'emp_001-2026-05-10-2026-05-11',
      });
    const requestBody = createResponse.body as TimeOffRequestResponse;

    expect(createResponse.status).toBe(201);
    expect(requestBody).toMatchObject({
      employeeId: 'emp_001',
      locationId: 'loc_ny',
      requestedDays: 2,
      requestedUnits: 200,
      status: TIME_OFF_REQUEST_STATUS.PENDING_APPROVAL,
    });

    const balanceResponse = await request(server).get(
      '/api/balances/emp_001/loc_ny',
    );
    const balanceBody = balanceResponse.body as BalanceResponse;

    expect(balanceBody).toMatchObject({
      pendingReservedDays: 2,
      availableDays: 8,
    });
  });

  it('returns the same request for a repeated idempotency key', async () => {
    await syncMockHcmBalance(10);

    const payload = {
      employeeId: 'emp_001',
      locationId: 'loc_ny',
      startDate: '2026-05-10',
      endDate: '2026-05-11',
      requestedDays: 2,
      idempotencyKey: 'same-key',
    };

    const firstResponse = await request(server)
      .post('/api/time-off-requests')
      .send(payload);
    const secondResponse = await request(server)
      .post('/api/time-off-requests')
      .send(payload);
    const firstBody = firstResponse.body as TimeOffRequestResponse;
    const secondBody = secondResponse.body as TimeOffRequestResponse;

    expect(secondBody.id).toBe(firstBody.id);

    const balanceResponse = await request(server).get(
      '/api/balances/emp_001/loc_ny',
    );
    const balanceBody = balanceResponse.body as BalanceResponse;

    expect(balanceBody.pendingReservedDays).toBe(2);
    expect(balanceBody.availableDays).toBe(8);
  });

  it('rejects idempotency key reuse with a different payload', async () => {
    await syncMockHcmBalance(10);

    const payload = {
      employeeId: 'emp_001',
      locationId: 'loc_ny',
      startDate: '2026-05-10',
      endDate: '2026-05-11',
      requestedDays: 2,
      idempotencyKey: 'same-key',
    };

    await request(server).post('/api/time-off-requests').send(payload);

    const conflictResponse = await request(server)
      .post('/api/time-off-requests')
      .send({
        ...payload,
        requestedDays: 3,
      });

    expect(conflictResponse.status).toBe(409);
  });

  it('rejects requests that exceed local available balance', async () => {
    await syncMockHcmBalance(1);

    const response = await request(server).post('/api/time-off-requests').send({
      employeeId: 'emp_001',
      locationId: 'loc_ny',
      startDate: '2026-05-10',
      endDate: '2026-05-11',
      requestedDays: 2,
    });

    expect(response.status).toBe(409);
  });

  it('rejects creation before local balance sync', async () => {
    const response = await request(server).post('/api/time-off-requests').send({
      employeeId: 'emp_001',
      locationId: 'loc_ny',
      startDate: '2026-05-10',
      endDate: '2026-05-11',
      requestedDays: 2,
    });

    expect(response.status).toBe(404);
  });

  it('rejects invalid request dates', async () => {
    await syncMockHcmBalance(10);

    const response = await request(server).post('/api/time-off-requests').send({
      employeeId: 'emp_001',
      locationId: 'loc_ny',
      startDate: '2026-05-12',
      endDate: '2026-05-10',
      requestedDays: 2,
    });

    expect(response.status).toBe(400);
  });

  it('returns a created request by id', async () => {
    await syncMockHcmBalance(10);

    const createResponse = await request(server)
      .post('/api/time-off-requests')
      .send({
        employeeId: 'emp_001',
        locationId: 'loc_ny',
        startDate: '2026-05-10',
        endDate: '2026-05-11',
        requestedDays: 2,
      });
    const createBody = createResponse.body as TimeOffRequestResponse;

    const getResponse = await request(server).get(
      `/api/time-off-requests/${createBody.id}`,
    );
    const getBody = getResponse.body as TimeOffRequestResponse;

    expect(getResponse.status).toBe(200);
    expect(getBody.id).toBe(createBody.id);
  });
});
