import { Controller, Get } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

type HealthResponse = {
  status: 'ok';
  database: 'ok';
  timestamp: string;
};

@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async check(): Promise<HealthResponse> {
    await this.prisma.$queryRaw`SELECT 1`;

    return {
      status: 'ok',
      database: 'ok',
      timestamp: new Date().toISOString(),
    };
  }
}
