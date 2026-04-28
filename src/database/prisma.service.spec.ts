import { PrismaService } from './prisma.service';

describe('PrismaService', () => {
  it('connects and disconnects with the NestJS module lifecycle', async () => {
    const prisma = new PrismaService();
    const connectSpy = jest
      .spyOn(prisma, '$connect')
      .mockResolvedValue(undefined);
    const disconnectSpy = jest
      .spyOn(prisma, '$disconnect')
      .mockResolvedValue(undefined);

    await prisma.onModuleInit();
    await prisma.onModuleDestroy();

    expect(connectSpy).toHaveBeenCalledTimes(1);
    expect(disconnectSpy).toHaveBeenCalledTimes(1);
  });
});
