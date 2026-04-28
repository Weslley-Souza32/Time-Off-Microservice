import { NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { MockHcmService } from './mock-hcm.service';

type MockHcmUpsertArg = {
  update: {
    balanceUnits: number;
  };
  create: {
    balanceUnits: number;
  };
};

describe('MockHcmService', () => {
  const findMany = jest.fn();
  const findUnique = jest.fn();
  const upsert = jest.fn<Promise<unknown>, [MockHcmUpsertArg]>();
  const prisma = {
    hcmMockBalance: {
      findMany,
      findUnique,
      upsert,
    },
  } as unknown as PrismaService;
  const service = new MockHcmService(prisma);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns all mock HCM balances as days and units', async () => {
    findMany.mockResolvedValue([
      {
        employeeId: 'emp_001',
        locationId: 'loc_ny',
        balanceUnits: 1000,
      },
    ]);

    await expect(service.listBalances()).resolves.toEqual([
      {
        employeeId: 'emp_001',
        locationId: 'loc_ny',
        balanceDays: 10,
        balanceUnits: 1000,
      },
    ]);
  });

  it('returns one mock HCM balance', async () => {
    findUnique.mockResolvedValue({
      employeeId: 'emp_001',
      locationId: 'loc_ny',
      balanceUnits: 750,
    });

    await expect(service.getBalance('emp_001', 'loc_ny')).resolves.toEqual({
      employeeId: 'emp_001',
      locationId: 'loc_ny',
      balanceDays: 7.5,
      balanceUnits: 750,
    });
  });

  it('throws when the HCM dimension is unknown', async () => {
    findUnique.mockResolvedValue(null);

    await expect(service.getBalance('missing', 'loc_ny')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('upserts a mock HCM balance using integer day units', async () => {
    upsert.mockResolvedValue({
      employeeId: 'emp_001',
      locationId: 'loc_ny',
      balanceUnits: 1250,
    });

    await expect(
      service.upsertBalance('emp_001', 'loc_ny', { balanceDays: 12.5 }),
    ).resolves.toEqual({
      employeeId: 'emp_001',
      locationId: 'loc_ny',
      balanceDays: 12.5,
      balanceUnits: 1250,
    });
    expect(upsert).toHaveBeenCalledTimes(1);
    const [upsertArg] = upsert.mock.calls[0];
    expect(upsertArg.update.balanceUnits).toBe(1250);
    expect(upsertArg.create.balanceUnits).toBe(1250);
  });
});
