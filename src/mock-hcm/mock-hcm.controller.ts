import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { SubmitMockHcmUsageDto } from './dto/submit-mock-hcm-usage.dto';
import { UpsertMockHcmBalanceDto } from './dto/upsert-mock-hcm-balance.dto';
import { MockHcmService } from './mock-hcm.service';
import { MockHcmBalanceResponse, MockHcmUsageResponse } from './mock-hcm.types';

@Controller('mock-hcm')
export class MockHcmController {
  constructor(private readonly mockHcmService: MockHcmService) {}

  @Get('balances')
  listBalances(): Promise<MockHcmBalanceResponse[]> {
    return this.mockHcmService.listBalances();
  }

  @Get('balances/:employeeId/:locationId')
  getBalance(
    @Param('employeeId') employeeId: string,
    @Param('locationId') locationId: string,
  ): Promise<MockHcmBalanceResponse> {
    return this.mockHcmService.getBalance(employeeId, locationId);
  }

  @Patch('balances/:employeeId/:locationId')
  upsertBalance(
    @Param('employeeId') employeeId: string,
    @Param('locationId') locationId: string,
    @Body() dto: UpsertMockHcmBalanceDto,
  ): Promise<MockHcmBalanceResponse> {
    return this.mockHcmService.upsertBalance(employeeId, locationId, dto);
  }

  @Post('time-off-usages')
  submitUsage(
    @Body() dto: SubmitMockHcmUsageDto,
  ): Promise<MockHcmUsageResponse> {
    return this.mockHcmService.submitUsage(dto);
  }
}
