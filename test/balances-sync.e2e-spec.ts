import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';
import { PrismaService } from '../src/database/prisma.service';
import { applyInitialSchema, resetDatabase } from './database-test-utils';

type BalanceResponse = {
  employeeId: string;
  locationId: string;
  balanceDays?: number;
  balanceUnits?: number;
  syncedBalanceDays?: number;
  pendingReservedDays?: number;
  availableDays?: number;
  syncedCount?: number;
  balances?: BalanceResponse[];
};

describe('Mock HCM and balance sync (e2e)', () => {
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

  it('updates mock HCM balances and exposes realtime and batch reads', async () => {
    const updateResponse = await request(server)
      .patch('/api/mock-hcm/balances/emp_001/loc_ny')
      .send({ balanceDays: 12.5 });
    const updateBody = updateResponse.body as BalanceResponse;

    expect(updateResponse.status).toBe(200);
    expect(updateBody).toMatchObject({
      employeeId: 'emp_001',
      locationId: 'loc_ny',
      balanceDays: 12.5,
      balanceUnits: 1250,
    });

    const realtimeResponse = await request(server).get(
      '/api/mock-hcm/balances/emp_001/loc_ny',
    );
    const realtimeBody = realtimeResponse.body as BalanceResponse;

    expect(realtimeResponse.status).toBe(200);
    expect(realtimeBody.balanceDays).toBe(12.5);

    const batchResponse = await request(server).get('/api/mock-hcm/balances');
    const batchBody = batchResponse.body as BalanceResponse[];

    expect(batchResponse.status).toBe(200);
    expect(batchBody).toHaveLength(1);
    expect(batchBody[0]).toMatchObject({
      employeeId: 'emp_001',
      locationId: 'loc_ny',
    });
  });

  it('syncs mock HCM balances into local balances', async () => {
    await request(server)
      .patch('/api/mock-hcm/balances/emp_001/loc_ny')
      .send({ balanceDays: 10 });

    const syncResponse = await request(server).post('/api/balances/sync');
    const syncBody = syncResponse.body as BalanceResponse;

    expect(syncResponse.status).toBe(201);
    expect(syncBody.syncedCount).toBe(1);
    expect(syncBody.balances?.[0]).toMatchObject({
      employeeId: 'emp_001',
      locationId: 'loc_ny',
      syncedBalanceDays: 10,
      pendingReservedDays: 0,
      availableDays: 10,
    });

    const localResponse = await request(server).get(
      '/api/balances/emp_001/loc_ny',
    );
    const localBody = localResponse.body as BalanceResponse;

    expect(localResponse.status).toBe(200);
    expect(localBody).toMatchObject({
      employeeId: 'emp_001',
      locationId: 'loc_ny',
      syncedBalanceDays: 10,
      availableDays: 10,
    });
  });

  it('keeps pending local reservations when batch sync refreshes HCM balance', async () => {
    await request(server)
      .patch('/api/mock-hcm/balances/emp_001/loc_ny')
      .send({ balanceDays: 10 });
    await request(server).post('/api/balances/sync');

    await prisma.timeOffRequest.create({
      data: {
        employeeId: 'emp_001',
        locationId: 'loc_ny',
        startDate: new Date('2026-05-10T00:00:00.000Z'),
        endDate: new Date('2026-05-11T00:00:00.000Z'),
        requestedUnits: 200,
        status: 'PENDING_APPROVAL',
      },
    });

    await request(server)
      .patch('/api/mock-hcm/balances/emp_001/loc_ny')
      .send({ balanceDays: 15 });
    await request(server).post('/api/balances/sync');

    const localResponse = await request(server).get(
      '/api/balances/emp_001/loc_ny',
    );
    const localBody = localResponse.body as BalanceResponse;

    expect(localBody).toMatchObject({
      syncedBalanceDays: 15,
      pendingReservedDays: 2,
      availableDays: 13,
    });
  });

  it('rejects invalid mock HCM balance payloads', async () => {
    const response = await request(server)
      .patch('/api/mock-hcm/balances/emp_001/loc_ny')
      .send({ balanceDays: -1 });

    expect(response.status).toBe(400);
  });
});
