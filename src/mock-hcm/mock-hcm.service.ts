import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { daysToUnits, unitsToDays } from '../common/utils/day-units';
import { UpsertMockHcmBalanceDto } from './dto/upsert-mock-hcm-balance.dto';
import { MockHcmBalanceResponse } from './mock-hcm.types';

@Injectable()
export class MockHcmService {
  constructor(private readonly prisma: PrismaService) {}

  async listBalances(): Promise<MockHcmBalanceResponse[]> {
    const balances = await this.prisma.hcmMockBalance.findMany({
      orderBy: [{ employeeId: 'asc' }, { locationId: 'asc' }],
    });

    return balances.map((balance) => this.toResponse(balance));
  }

  async getBalance(
    employeeId: string,
    locationId: string,
  ): Promise<MockHcmBalanceResponse> {
    const balance = await this.prisma.hcmMockBalance.findUnique({
      where: {
        employeeId_locationId: {
          employeeId,
          locationId,
        },
      },
    });

    if (!balance) {
      throw new NotFoundException('HCM balance dimension was not found');
    }

    return this.toResponse(balance);
  }

  async upsertBalance(
    employeeId: string,
    locationId: string,
    dto: UpsertMockHcmBalanceDto,
  ): Promise<MockHcmBalanceResponse> {
    const balanceUnits = daysToUnits(dto.balanceDays);
    const balance = await this.prisma.hcmMockBalance.upsert({
      where: {
        employeeId_locationId: {
          employeeId,
          locationId,
        },
      },
      update: {
        balanceUnits,
      },
      create: {
        employeeId,
        locationId,
        balanceUnits,
      },
    });

    return this.toResponse(balance);
  }

  private toResponse(balance: {
    employeeId: string;
    locationId: string;
    balanceUnits: number;
  }): MockHcmBalanceResponse {
    return {
      employeeId: balance.employeeId,
      locationId: balance.locationId,
      balanceDays: unitsToDays(balance.balanceUnits),
      balanceUnits: balance.balanceUnits,
    };
  }
}
