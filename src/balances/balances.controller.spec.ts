import { BalancesController } from './balances.controller';
import { BalancesService } from './balances.service';

describe('BalancesController', () => {
  const getBalance = jest.fn();
  const syncFromHcm = jest.fn();
  const service = {
    getBalance,
    syncFromHcm,
  } as unknown as BalancesService;
  const controller = new BalancesController(service);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('delegates local balance lookup to the service', async () => {
    const response = {
      employeeId: 'emp_001',
      locationId: 'loc_ny',
    };
    getBalance.mockResolvedValue(response);

    await expect(controller.getBalance('emp_001', 'loc_ny')).resolves.toBe(
      response,
    );
    expect(getBalance).toHaveBeenCalledWith('emp_001', 'loc_ny');
  });

  it('delegates HCM sync to the service', async () => {
    const response = {
      syncedCount: 1,
      balances: [],
    };
    syncFromHcm.mockResolvedValue(response);

    await expect(controller.syncFromHcm()).resolves.toBe(response);
    expect(syncFromHcm).toHaveBeenCalledTimes(1);
  });
});
