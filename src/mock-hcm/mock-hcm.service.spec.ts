import {
  ConflictException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
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

type MockHcmUsageRecord = {
  transactionId: string;
  employeeId: string;
  locationId: string;
  requestedUnits: number;
  idempotencyKey: string;
};

type MockHcmTransaction = {
  hcmMockUsage: {
    findUnique: jest.Mock<Promise<MockHcmUsageRecord | null>, [unknown]>;
    create: jest.Mock<Promise<MockHcmUsageRecord>, [unknown]>;
  };
  hcmMockBalance: {
    findUnique: jest.Mock<
      Promise<{
        employeeId?: string;
        locationId?: string;
        balanceUnits: number;
      } | null>,
      [unknown]
    >;
    update: jest.Mock<Promise<unknown>, [unknown]>;
  };
};

describe('MockHcmService', () => {
  const findMany = jest.fn();
  const findUnique = jest.fn();
  const upsert = jest.fn<Promise<unknown>, [MockHcmUpsertArg]>();
  const usageFindUnique = jest.fn<
    Promise<MockHcmUsageRecord | null>,
    [unknown]
  >();
  const usageCreate = jest.fn<Promise<MockHcmUsageRecord>, [unknown]>();
  const balanceFindUnique = jest.fn<
    Promise<{
      employeeId?: string;
      locationId?: string;
      balanceUnits: number;
    } | null>,
    [unknown]
  >();
  const balanceUpdate = jest.fn<Promise<unknown>, [unknown]>();
  const transaction = jest.fn<
    Promise<unknown>,
    [(tx: MockHcmTransaction) => Promise<unknown>]
  >();
  const tx: MockHcmTransaction = {
    hcmMockUsage: {
      findUnique: usageFindUnique,
      create: usageCreate,
    },
    hcmMockBalance: {
      findUnique: balanceFindUnique,
      update: balanceUpdate,
    },
  };
  const prisma = {
    hcmMockBalance: {
      findMany,
      findUnique,
      upsert,
    },
    $transaction: transaction,
  } as unknown as PrismaService;
  const service = new MockHcmService(prisma);

  beforeEach(() => {
    jest.resetAllMocks();
    transaction.mockImplementation((callback) => callback(tx));
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

  it('submits HCM usage and debits canonical balance', async () => {
    usageFindUnique.mockResolvedValue(null);
    balanceFindUnique.mockResolvedValue({
      employeeId: 'emp_001',
      locationId: 'loc_ny',
      balanceUnits: 1000,
    });
    usageCreate.mockResolvedValue({
      transactionId: 'hcm_txn',
      employeeId: 'emp_001',
      locationId: 'loc_ny',
      requestedUnits: 200,
      idempotencyKey: 'approval-key',
    });

    await expect(
      service.submitUsageUnits({
        employeeId: 'emp_001',
        locationId: 'loc_ny',
        requestedUnits: 200,
        idempotencyKey: 'approval-key',
      }),
    ).resolves.toMatchObject({
      transactionId: 'hcm_txn',
      requestedDays: 2,
      remainingBalanceDays: 8,
    });
    expect(balanceUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { balanceUnits: 800 },
      }),
    );
  });

  it('returns existing usage for repeated idempotent submissions', async () => {
    usageFindUnique.mockResolvedValue({
      transactionId: 'hcm_txn',
      employeeId: 'emp_001',
      locationId: 'loc_ny',
      requestedUnits: 200,
      idempotencyKey: 'approval-key',
    });
    balanceFindUnique.mockResolvedValue({
      balanceUnits: 800,
    });

    await expect(
      service.submitUsageUnits({
        employeeId: 'emp_001',
        locationId: 'loc_ny',
        requestedUnits: 200,
        idempotencyKey: 'approval-key',
      }),
    ).resolves.toMatchObject({
      transactionId: 'hcm_txn',
      remainingBalanceDays: 8,
    });
    expect(balanceUpdate).not.toHaveBeenCalled();
    expect(usageCreate).not.toHaveBeenCalled();
  });

  it('rejects HCM usage when dimensions are invalid', async () => {
    usageFindUnique.mockResolvedValue(null);
    balanceFindUnique.mockResolvedValue(null);

    await expect(
      service.submitUsageUnits({
        employeeId: 'missing',
        locationId: 'loc_ny',
        requestedUnits: 200,
        idempotencyKey: 'approval-key',
      }),
    ).rejects.toThrow(UnprocessableEntityException);
  });

  it('rejects HCM usage when canonical balance is insufficient', async () => {
    usageFindUnique.mockResolvedValue(null);
    balanceFindUnique.mockResolvedValue({
      balanceUnits: 100,
    });

    await expect(
      service.submitUsageUnits({
        employeeId: 'emp_001',
        locationId: 'loc_ny',
        requestedUnits: 200,
        idempotencyKey: 'approval-key',
      }),
    ).rejects.toThrow(ConflictException);
  });
});
