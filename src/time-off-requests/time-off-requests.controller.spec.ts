import { CreateTimeOffRequestDto } from './dto/create-time-off-request.dto';
import { TimeOffRequestsController } from './time-off-requests.controller';
import { TimeOffRequestsService } from './time-off-requests.service';

describe('TimeOffRequestsController', () => {
  const create = jest.fn();
  const getById = jest.fn();
  const service = {
    create,
    getById,
  } as unknown as TimeOffRequestsService;
  const controller = new TimeOffRequestsController(service);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('delegates request creation to the service', async () => {
    const dto: CreateTimeOffRequestDto = {
      employeeId: 'emp_001',
      locationId: 'loc_ny',
      startDate: '2026-05-10',
      endDate: '2026-05-11',
      requestedDays: 2,
      idempotencyKey: 'request-key',
    };
    const response = {
      id: 'request_001',
    };
    create.mockResolvedValue(response);

    await expect(controller.create(dto)).resolves.toBe(response);
    expect(create).toHaveBeenCalledWith(dto);
  });

  it('delegates request lookup to the service', async () => {
    const response = {
      id: 'request_001',
    };
    getById.mockResolvedValue(response);

    await expect(controller.getById('request_001')).resolves.toBe(response);
    expect(getById).toHaveBeenCalledWith('request_001');
  });
});
