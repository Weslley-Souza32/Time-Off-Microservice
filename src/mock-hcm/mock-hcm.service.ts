import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../database/prisma.service';
import { daysToUnits, unitsToDays } from '../common/utils/day-units';
import { SubmitMockHcmUsageDto } from './dto/submit-mock-hcm-usage.dto';
import { UpsertMockHcmBalanceDto } from './dto/upsert-mock-hcm-balance.dto';
import {
  MockHcmBalanceResponse,
  MockHcmUsageResponse,
  SubmitMockHcmUsageCommand,
} from './mock-hcm.types';

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

  submitUsage(dto: SubmitMockHcmUsageDto): Promise<MockHcmUsageResponse> {
    return this.submitUsageUnits({
      employeeId: dto.employeeId,
      locationId: dto.locationId,
      requestedUnits: daysToUnits(dto.requestedDays),
      idempotencyKey: dto.idempotencyKey,
    });
  }

  async submitUsageUnits(
    command: SubmitMockHcmUsageCommand,
  ): Promise<MockHcmUsageResponse> {
    return this.prisma.$transaction(async (tx) => {
      const existingUsage = await tx.hcmMockUsage.findUnique({
        where: {
          idempotencyKey: command.idempotencyKey,
        },
      });

      if (existingUsage) {
        this.assertUsageReplayMatches(existingUsage, command);

        const currentBalance = await tx.hcmMockBalance.findUnique({
          where: {
            employeeId_locationId: {
              employeeId: existingUsage.employeeId,
              locationId: existingUsage.locationId,
            },
          },
        });

        return this.toUsageResponse(
          existingUsage,
          currentBalance?.balanceUnits ?? 0,
        );
      }

      const balance = await tx.hcmMockBalance.findUnique({
        where: {
          employeeId_locationId: {
            employeeId: command.employeeId,
            locationId: command.locationId,
          },
        },
      });

      if (!balance) {
        throw new UnprocessableEntityException(
          'HCM balance dimension is invalid',
        );
      }

      if (command.requestedUnits > balance.balanceUnits) {
        throw new ConflictException('HCM balance is insufficient');
      }

      const remainingBalanceUnits =
        balance.balanceUnits - command.requestedUnits;

      await tx.hcmMockBalance.update({
        where: {
          employeeId_locationId: {
            employeeId: command.employeeId,
            locationId: command.locationId,
          },
        },
        data: {
          balanceUnits: remainingBalanceUnits,
        },
      });

      const usage = await tx.hcmMockUsage.create({
        data: {
          employeeId: command.employeeId,
          locationId: command.locationId,
          requestedUnits: command.requestedUnits,
          idempotencyKey: command.idempotencyKey,
          transactionId: `hcm_${randomUUID()}`,
        },
      });

      return this.toUsageResponse(usage, remainingBalanceUnits);
    });
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

  private assertUsageReplayMatches(
    existingUsage: {
      employeeId: string;
      locationId: string;
      requestedUnits: number;
    },
    command: SubmitMockHcmUsageCommand,
  ) {
    const matches =
      existingUsage.employeeId === command.employeeId &&
      existingUsage.locationId === command.locationId &&
      existingUsage.requestedUnits === command.requestedUnits;

    if (!matches) {
      throw new ConflictException(
        'HCM usage idempotency key was already used with a different payload',
      );
    }
  }

  private toUsageResponse(
    usage: {
      transactionId: string;
      employeeId: string;
      locationId: string;
      requestedUnits: number;
      idempotencyKey: string;
    },
    remainingBalanceUnits: number,
  ): MockHcmUsageResponse {
    return {
      transactionId: usage.transactionId,
      employeeId: usage.employeeId,
      locationId: usage.locationId,
      requestedDays: unitsToDays(usage.requestedUnits),
      requestedUnits: usage.requestedUnits,
      remainingBalanceDays: unitsToDays(remainingBalanceUnits),
      remainingBalanceUnits,
      idempotencyKey: usage.idempotencyKey,
    };
  }
}
