import { NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { MockHcmService } from '../mock-hcm/mock-hcm.service';
import { BalancesService } from './balances.service';

type BalanceUpsertArg = {
  where: {
    employeeId_locationId: {
      employeeId: string;
      locationId: string;
    };
  };
  update: {
    balanceUnits: number;
  };
  create: {
    employeeId: string;
    locationId: string;
    balanceUnits: number;
  };
};

describe('BalancesService', () => {
  const balanceFindUnique = jest.fn();
  const balanceUpsert = jest.fn<Promise<unknown>, [BalanceUpsertArg]>();
  const aggregate = jest.fn();
  const transaction = jest.fn();
  const listBalances = jest.fn();
  const prisma = {
    balance: {
      findUnique: balanceFindUnique,
      upsert: balanceUpsert,
    },
    timeOffRequest: {
      aggregate,
    },
    $transaction: transaction,
  } as unknown as PrismaService;
  const mockHcmService = {
    listBalances,
  } as unknown as MockHcmService;
  const service = new BalancesService(prisma, mockHcmService);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns local synced balance minus pending reservations', async () => {
    const syncedAt = new Date('2026-04-28T00:00:00.000Z');
    balanceFindUnique.mockResolvedValue({
      employeeId: 'emp_001',
      locationId: 'loc_ny',
      balanceUnits: 1000,
      lastSyncedAt: syncedAt,
    });
    aggregate.mockResolvedValue({
      _sum: {
        requestedUnits: 250,
      },
    });

    await expect(service.getBalance('emp_001', 'loc_ny')).resolves.toEqual({
      employeeId: 'emp_001',
      locationId: 'loc_ny',
      syncedBalanceDays: 10,
      syncedBalanceUnits: 1000,
      pendingReservedDays: 2.5,
      pendingReservedUnits: 250,
      availableDays: 7.5,
      availableUnits: 750,
      lastSyncedAt: syncedAt.toISOString(),
    });
  });

  it('throws when local balance has not been synced yet', async () => {
    balanceFindUnique.mockResolvedValue(null);

    await expect(service.getBalance('missing', 'loc_ny')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('syncs the full HCM balance corpus into local balances', async () => {
    const hcmBalances = [
      {
        employeeId: 'emp_001',
        locationId: 'loc_ny',
        balanceDays: 10,
        balanceUnits: 1000,
      },
    ];
    const syncedAt = new Date('2026-04-28T00:00:00.000Z');
    listBalances.mockResolvedValue(hcmBalances);
    balanceUpsert.mockResolvedValue({
      employeeId: 'emp_001',
      locationId: 'loc_ny',
      balanceUnits: 1000,
      lastSyncedAt: syncedAt,
    });
    transaction.mockResolvedValue(undefined);
    balanceFindUnique.mockResolvedValue({
      employeeId: 'emp_001',
      locationId: 'loc_ny',
      balanceUnits: 1000,
      lastSyncedAt: syncedAt,
    });
    aggregate.mockResolvedValue({
      _sum: {
        requestedUnits: null,
      },
    });

    const result = await service.syncFromHcm();

    expect(transaction).toHaveBeenCalledWith([expect.any(Promise)]);
    expect(balanceUpsert).toHaveBeenCalledTimes(1);
    const [upsertArg] = balanceUpsert.mock.calls[0];
    expect(upsertArg.where.employeeId_locationId).toEqual({
      employeeId: 'emp_001',
      locationId: 'loc_ny',
    });
    expect(upsertArg.update.balanceUnits).toBe(1000);
    expect(upsertArg.create.balanceUnits).toBe(1000);
    expect(result.syncedCount).toBe(1);
    expect(result.balances[0]).toMatchObject({
      employeeId: 'emp_001',
      locationId: 'loc_ny',
      availableDays: 10,
    });
  });
});
