import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { TimeOffRequest } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { CreateTimeOffRequestDto } from './dto/create-time-off-request.dto';
import { TIME_OFF_REQUEST_STATUS } from './time-off-request-status';
import { TimeOffRequestsService } from './time-off-requests.service';

type TransactionMock = {
  balance: {
    findUnique: jest.Mock<Promise<{ balanceUnits: number } | null>, [unknown]>;
  };
  timeOffRequest: {
    aggregate: jest.Mock<
      Promise<{ _sum: { requestedUnits: number | null } }>,
      [unknown]
    >;
    create: jest.Mock<Promise<TimeOffRequest>, [unknown]>;
  };
};

const baseDto: CreateTimeOffRequestDto = {
  employeeId: 'emp_001',
  locationId: 'loc_ny',
  startDate: '2026-05-10',
  endDate: '2026-05-11',
  requestedDays: 2,
  idempotencyKey: 'request-key',
};

function makeRequest(overrides: Partial<TimeOffRequest> = {}): TimeOffRequest {
  const now = new Date('2026-04-28T00:00:00.000Z');

  return {
    id: 'request_001',
    employeeId: 'emp_001',
    locationId: 'loc_ny',
    startDate: new Date('2026-05-10T00:00:00.000Z'),
    endDate: new Date('2026-05-11T00:00:00.000Z'),
    requestedUnits: 200,
    status: TIME_OFF_REQUEST_STATUS.PENDING_APPROVAL,
    idempotencyKey: 'request-key',
    hcmTransactionId: null,
    failureReason: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

describe('TimeOffRequestsService', () => {
  const findUnique = jest.fn<Promise<TimeOffRequest | null>, [unknown]>();
  const transaction = jest.fn<
    Promise<TimeOffRequest>,
    [(tx: TransactionMock) => Promise<TimeOffRequest>]
  >();
  const txBalanceFindUnique = jest.fn<
    Promise<{ balanceUnits: number } | null>,
    [unknown]
  >();
  const txTimeOffRequestAggregate = jest.fn<
    Promise<{ _sum: { requestedUnits: number | null } }>,
    [unknown]
  >();
  const txTimeOffRequestCreate = jest.fn<Promise<TimeOffRequest>, [unknown]>();
  const tx: TransactionMock = {
    balance: {
      findUnique: txBalanceFindUnique,
    },
    timeOffRequest: {
      aggregate: txTimeOffRequestAggregate,
      create: txTimeOffRequestCreate,
    },
  };
  const prisma = {
    timeOffRequest: {
      findUnique,
    },
    $transaction: transaction,
  } as unknown as PrismaService;
  const service = new TimeOffRequestsService(prisma);

  beforeEach(() => {
    jest.resetAllMocks();
    findUnique.mockResolvedValue(null);
    transaction.mockImplementation((callback) => callback(tx));
  });

  it('creates a pending request when local balance is available', async () => {
    tx.balance.findUnique.mockResolvedValue({ balanceUnits: 1000 });
    tx.timeOffRequest.aggregate.mockResolvedValue({
      _sum: { requestedUnits: 250 },
    });
    tx.timeOffRequest.create.mockResolvedValue(makeRequest());

    const response = await service.create(baseDto);

    expect(response).toMatchObject({
      id: 'request_001',
      employeeId: 'emp_001',
      locationId: 'loc_ny',
      requestedDays: 2,
      requestedUnits: 200,
      status: TIME_OFF_REQUEST_STATUS.PENDING_APPROVAL,
    });
    expect(tx.timeOffRequest.create).toHaveBeenCalledTimes(1);
  });

  it('returns an existing request for a repeated idempotency key', async () => {
    findUnique.mockResolvedValue(makeRequest());

    const response = await service.create(baseDto);

    expect(response.id).toBe('request_001');
    expect(transaction).not.toHaveBeenCalled();
  });

  it('rejects idempotency key reuse with a different payload', async () => {
    findUnique.mockResolvedValue(makeRequest());

    await expect(
      service.create({
        ...baseDto,
        requestedDays: 3,
      }),
    ).rejects.toThrow(ConflictException);
    expect(transaction).not.toHaveBeenCalled();
  });

  it('rejects end dates before start dates', async () => {
    await expect(
      service.create({
        ...baseDto,
        startDate: '2026-05-12',
        endDate: '2026-05-10',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects requests when local balance has not been synced', async () => {
    tx.balance.findUnique.mockResolvedValue(null);

    await expect(service.create(baseDto)).rejects.toThrow(NotFoundException);
  });

  it('rejects requests that exceed locally available balance', async () => {
    tx.balance.findUnique.mockResolvedValue({ balanceUnits: 100 });
    tx.timeOffRequest.aggregate.mockResolvedValue({
      _sum: { requestedUnits: 0 },
    });

    await expect(service.create(baseDto)).rejects.toThrow(ConflictException);
  });

  it('returns an existing request by id', async () => {
    findUnique.mockResolvedValue(makeRequest());

    await expect(service.getById('request_001')).resolves.toMatchObject({
      id: 'request_001',
      requestedDays: 2,
    });
  });

  it('throws when a request id is unknown', async () => {
    findUnique.mockResolvedValue(null);

    await expect(service.getById('missing')).rejects.toThrow(NotFoundException);
  });
});
