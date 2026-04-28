import { Module } from '@nestjs/common';
import { TimeOffRequestsController } from './time-off-requests.controller';
import { TimeOffRequestsService } from './time-off-requests.service';

@Module({
  controllers: [TimeOffRequestsController],
  providers: [TimeOffRequestsService],
})
export class TimeOffRequestsModule {}
