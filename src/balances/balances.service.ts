import { Injectable, NotFoundException } from '@nestjs/common';
import { Balance } from '@prisma/client';
import { unitsToDays } from '../common/utils/day-units';
import { PrismaService } from '../database/prisma.service';
import { MockHcmService } from '../mock-hcm/mock-hcm.service';
import { BalanceResponse, BalanceSyncResponse } from './balances.types';

const PENDING_APPROVAL_STATUS = 'PENDING_APPROVAL';

@Injectable()
export class BalancesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mockHcmService: MockHcmService,
  ) {}

  async getBalance(
    employeeId: string,
    locationId: string,
  ): Promise<BalanceResponse> {
    const balance = await this.prisma.balance.findUnique({
      where: {
        employeeId_locationId: {
          employeeId,
          locationId,
        },
      },
    });

    if (!balance) {
      throw new NotFoundException('Local balance was not found');
    }

    const pendingReservedUnits = await this.getPendingReservedUnits(
      employeeId,
      locationId,
    );

    return this.toResponse(balance, pendingReservedUnits);
  }

  async syncFromHcm(): Promise<BalanceSyncResponse> {
    const hcmBalances = await this.mockHcmService.listBalances();
    const syncedAt = new Date();

    await this.prisma.$transaction(
      hcmBalances.map((balance) =>
        this.prisma.balance.upsert({
          where: {
            employeeId_locationId: {
              employeeId: balance.employeeId,
              locationId: balance.locationId,
            },
          },
          update: {
            balanceUnits: balance.balanceUnits,
            lastSyncedAt: syncedAt,
          },
          create: {
            employeeId: balance.employeeId,
            locationId: balance.locationId,
            balanceUnits: balance.balanceUnits,
            lastSyncedAt: syncedAt,
          },
        }),
      ),
    );

    const balances = await Promise.all(
      hcmBalances.map((balance) =>
        this.getBalance(balance.employeeId, balance.locationId),
      ),
    );

    return {
      syncedCount: hcmBalances.length,
      balances,
    };
  }

  private async getPendingReservedUnits(
    employeeId: string,
    locationId: string,
  ): Promise<number> {
    const aggregate = await this.prisma.timeOffRequest.aggregate({
      where: {
        employeeId,
        locationId,
        status: PENDING_APPROVAL_STATUS,
      },
      _sum: {
        requestedUnits: true,
      },
    });

    return aggregate._sum.requestedUnits ?? 0;
  }

  private toResponse(
    balance: Balance,
    pendingReservedUnits: number,
  ): BalanceResponse {
    const availableUnits = balance.balanceUnits - pendingReservedUnits;

    return {
      employeeId: balance.employeeId,
      locationId: balance.locationId,
      syncedBalanceDays: unitsToDays(balance.balanceUnits),
      syncedBalanceUnits: balance.balanceUnits,
      pendingReservedDays: unitsToDays(pendingReservedUnits),
      pendingReservedUnits,
      availableDays: unitsToDays(availableUnits),
      availableUnits,
      lastSyncedAt: balance.lastSyncedAt.toISOString(),
    };
  }
}
