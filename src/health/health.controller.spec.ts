import { PrismaService } from '../database/prisma.service';
import { HealthController } from './health.controller';

describe('HealthController', () => {
  it('checks the database and returns service health', async () => {
    const queryRaw = jest.fn().mockResolvedValue([{ ok: 1 }]);
    const prisma = {
      $queryRaw: queryRaw,
    } as unknown as PrismaService;
    const controller = new HealthController(prisma);

    const result = await controller.check();

    expect(queryRaw).toHaveBeenCalledTimes(1);
    expect(result).toMatchObject({
      status: 'ok',
      database: 'ok',
    });
    expect(typeof result.timestamp).toBe('string');
  });
});
