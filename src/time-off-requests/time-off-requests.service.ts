import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { TimeOffRequest } from '@prisma/client';
import { daysToUnits, unitsToDays } from '../common/utils/day-units';
import { PrismaService } from '../database/prisma.service';
import { MockHcmService } from '../mock-hcm/mock-hcm.service';
import { CreateTimeOffRequestDto } from './dto/create-time-off-request.dto';
import { TIME_OFF_REQUEST_STATUS } from './time-off-request-status';
import { TimeOffRequestResponse } from './time-off-requests.types';

type TransactionClient = Parameters<
  Parameters<PrismaService['$transaction']>[0]
>[0];

@Injectable()
export class TimeOffRequestsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mockHcmService: MockHcmService,
  ) {}

  async create(dto: CreateTimeOffRequestDto): Promise<TimeOffRequestResponse> {
    const startDate = this.parseDate(dto.startDate, 'startDate');
    const endDate = this.parseDate(dto.endDate, 'endDate');

    if (endDate < startDate) {
      throw new BadRequestException('endDate must not be before startDate');
    }

    const requestedUnits = daysToUnits(dto.requestedDays);

    if (dto.idempotencyKey) {
      const existing = await this.prisma.timeOffRequest.findUnique({
        where: {
          idempotencyKey: dto.idempotencyKey,
        },
      });

      if (existing) {
        this.assertIdempotentReplayMatches(existing, dto, {
          startDate,
          endDate,
          requestedUnits,
        });

        return this.toResponse(existing);
      }
    }

    const request = await this.prisma.$transaction(async (tx) => {
      const balance = await tx.balance.findUnique({
        where: {
          employeeId_locationId: {
            employeeId: dto.employeeId,
            locationId: dto.locationId,
          },
        },
      });

      if (!balance) {
        throw new NotFoundException('Local balance was not found');
      }

      const pendingReservedUnits = await this.getPendingReservedUnits(
        tx,
        dto.employeeId,
        dto.locationId,
      );
      const availableUnits = balance.balanceUnits - pendingReservedUnits;

      if (requestedUnits > availableUnits) {
        throw new ConflictException('Insufficient local balance');
      }

      return tx.timeOffRequest.create({
        data: {
          employeeId: dto.employeeId,
          locationId: dto.locationId,
          startDate,
          endDate,
          requestedUnits,
          status: TIME_OFF_REQUEST_STATUS.PENDING_APPROVAL,
          idempotencyKey: dto.idempotencyKey,
        },
      });
    });

    return this.toResponse(request);
  }

  async getById(id: string): Promise<TimeOffRequestResponse> {
    const request = await this.prisma.timeOffRequest.findUnique({
      where: {
        id,
      },
    });

    if (!request) {
      throw new NotFoundException('Time-off request was not found');
    }

    return this.toResponse(request);
  }

  async approve(id: string): Promise<TimeOffRequestResponse> {
    const request = await this.findRequestOrThrow(id);

    if (request.status === TIME_OFF_REQUEST_STATUS.APPROVED) {
      return this.toResponse(request);
    }

    this.assertPendingTransition(request, 'approve');

    const hcmUsage = await this.submitUsageOrMarkFailed(request);

    const approved = await this.prisma.$transaction(async (tx) => {
      await tx.balance.update({
        where: {
          employeeId_locationId: {
            employeeId: request.employeeId,
            locationId: request.locationId,
          },
        },
        data: {
          balanceUnits: hcmUsage.remainingBalanceUnits,
          lastSyncedAt: new Date(),
        },
      });

      return tx.timeOffRequest.update({
        where: {
          id: request.id,
        },
        data: {
          status: TIME_OFF_REQUEST_STATUS.APPROVED,
          hcmTransactionId: hcmUsage.transactionId,
          failureReason: null,
        },
      });
    });

    return this.toResponse(approved);
  }

  private async submitUsageOrMarkFailed(request: TimeOffRequest) {
    try {
      return await this.mockHcmService.submitUsageUnits({
        employeeId: request.employeeId,
        locationId: request.locationId,
        requestedUnits: request.requestedUnits,
        idempotencyKey: this.approvalIdempotencyKey(request.id),
      });
    } catch (error: unknown) {
      await this.markApprovalFailed(request.id, this.failureReason(error));
      throw error;
    }
  }

  async reject(id: string): Promise<TimeOffRequestResponse> {
    const request = await this.findRequestOrThrow(id);

    if (request.status === TIME_OFF_REQUEST_STATUS.REJECTED) {
      return this.toResponse(request);
    }

    this.assertPendingTransition(request, 'reject');

    const rejected = await this.prisma.timeOffRequest.update({
      where: {
        id,
      },
      data: {
        status: TIME_OFF_REQUEST_STATUS.REJECTED,
        failureReason: null,
      },
    });

    return this.toResponse(rejected);
  }

  async cancel(id: string): Promise<TimeOffRequestResponse> {
    const request = await this.findRequestOrThrow(id);

    if (request.status === TIME_OFF_REQUEST_STATUS.CANCELLED) {
      return this.toResponse(request);
    }

    this.assertPendingTransition(request, 'cancel');

    const cancelled = await this.prisma.timeOffRequest.update({
      where: {
        id,
      },
      data: {
        status: TIME_OFF_REQUEST_STATUS.CANCELLED,
        failureReason: null,
      },
    });

    return this.toResponse(cancelled);
  }

  private async getPendingReservedUnits(
    tx: TransactionClient,
    employeeId: string,
    locationId: string,
  ): Promise<number> {
    const aggregate = await tx.timeOffRequest.aggregate({
      where: {
        employeeId,
        locationId,
        status: TIME_OFF_REQUEST_STATUS.PENDING_APPROVAL,
      },
      _sum: {
        requestedUnits: true,
      },
    });

    return aggregate._sum.requestedUnits ?? 0;
  }

  private async findRequestOrThrow(id: string): Promise<TimeOffRequest> {
    const request = await this.prisma.timeOffRequest.findUnique({
      where: {
        id,
      },
    });

    if (!request) {
      throw new NotFoundException('Time-off request was not found');
    }

    return request;
  }

  private parseDate(value: string, fieldName: string): Date {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException(`${fieldName} must be a valid date`);
    }

    return date;
  }

  private assertIdempotentReplayMatches(
    existing: TimeOffRequest,
    dto: CreateTimeOffRequestDto,
    normalized: {
      startDate: Date;
      endDate: Date;
      requestedUnits: number;
    },
  ) {
    const matches =
      existing.employeeId === dto.employeeId &&
      existing.locationId === dto.locationId &&
      existing.startDate.getTime() === normalized.startDate.getTime() &&
      existing.endDate.getTime() === normalized.endDate.getTime() &&
      existing.requestedUnits === normalized.requestedUnits;

    if (!matches) {
      throw new ConflictException(
        'Idempotency key was already used with a different request payload',
      );
    }
  }

  private assertPendingTransition(request: TimeOffRequest, action: string) {
    if (request.status !== TIME_OFF_REQUEST_STATUS.PENDING_APPROVAL) {
      throw new ConflictException(
        `Cannot ${action} a request in ${request.status} status`,
      );
    }
  }

  private approvalIdempotencyKey(requestId: string): string {
    return `time-off-approval:${requestId}`;
  }

  private async markApprovalFailed(id: string, failureReason: string) {
    await this.prisma.timeOffRequest.update({
      where: {
        id,
      },
      data: {
        status: TIME_OFF_REQUEST_STATUS.APPROVAL_FAILED,
        failureReason,
      },
    });
  }

  private failureReason(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }

    return 'HCM approval failed';
  }

  private toResponse(request: TimeOffRequest): TimeOffRequestResponse {
    return {
      id: request.id,
      employeeId: request.employeeId,
      locationId: request.locationId,
      startDate: request.startDate.toISOString(),
      endDate: request.endDate.toISOString(),
      requestedDays: unitsToDays(request.requestedUnits),
      requestedUnits: request.requestedUnits,
      status: request.status,
      idempotencyKey: request.idempotencyKey,
      hcmTransactionId: request.hcmTransactionId,
      failureReason: request.failureReason,
      createdAt: request.createdAt.toISOString(),
      updatedAt: request.updatedAt.toISOString(),
    };
  }
}
