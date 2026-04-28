import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';

type HealthResponse = {
  status: string;
  database: string;
  timestamp: unknown;
};

describe('Health endpoint (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('/api/health (GET)', async () => {
    const server = app.getHttpServer() as Parameters<typeof request>[0];
    const response = await request(server).get('/api/health');
    const body = response.body as HealthResponse;

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      status: 'ok',
      database: 'ok',
    });
    expect(body.timestamp).toEqual(expect.any(String));
  });
});
