import { UpsertMockHcmBalanceDto } from './dto/upsert-mock-hcm-balance.dto';
import { MockHcmController } from './mock-hcm.controller';
import { MockHcmService } from './mock-hcm.service';

describe('MockHcmController', () => {
  const listBalances = jest.fn();
  const getBalance = jest.fn();
  const upsertBalance = jest.fn();
  const submitUsage = jest.fn();
  const service = {
    listBalances,
    getBalance,
    upsertBalance,
    submitUsage,
  } as unknown as MockHcmService;
  const controller = new MockHcmController(service);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('delegates batch balance reads to the service', async () => {
    const response = [{ employeeId: 'emp_001' }];
    listBalances.mockResolvedValue(response);

    await expect(controller.listBalances()).resolves.toBe(response);
    expect(listBalances).toHaveBeenCalledTimes(1);
  });

  it('delegates realtime balance reads to the service', async () => {
    const response = { employeeId: 'emp_001', locationId: 'loc_ny' };
    getBalance.mockResolvedValue(response);

    await expect(controller.getBalance('emp_001', 'loc_ny')).resolves.toBe(
      response,
    );
    expect(getBalance).toHaveBeenCalledWith('emp_001', 'loc_ny');
  });

  it('delegates test balance mutations to the service', async () => {
    const dto: UpsertMockHcmBalanceDto = { balanceDays: 12.5 };
    const response = { employeeId: 'emp_001', locationId: 'loc_ny' };
    upsertBalance.mockResolvedValue(response);

    await expect(
      controller.upsertBalance('emp_001', 'loc_ny', dto),
    ).resolves.toBe(response);
    expect(upsertBalance).toHaveBeenCalledWith('emp_001', 'loc_ny', dto);
  });

  it('delegates usage submissions to the service', async () => {
    const dto = {
      employeeId: 'emp_001',
      locationId: 'loc_ny',
      requestedDays: 2,
      idempotencyKey: 'approval-key',
    };
    const response = { transactionId: 'hcm_txn' };
    submitUsage.mockResolvedValue(response);

    await expect(controller.submitUsage(dto)).resolves.toBe(response);
    expect(submitUsage).toHaveBeenCalledWith(dto);
  });
});
