import { Controller, Get, Param, Post } from '@nestjs/common';
import { BalancesService } from './balances.service';
import { BalanceResponse, BalanceSyncResponse } from './balances.types';

@Controller('balances')
export class BalancesController {
  constructor(private readonly balancesService: BalancesService) {}

  @Get(':employeeId/:locationId')
  getBalance(
    @Param('employeeId') employeeId: string,
    @Param('locationId') locationId: string,
  ): Promise<BalanceResponse> {
    return this.balancesService.getBalance(employeeId, locationId);
  }

  @Post('sync')
  syncFromHcm(): Promise<BalanceSyncResponse> {
    return this.balancesService.syncFromHcm();
  }
}
