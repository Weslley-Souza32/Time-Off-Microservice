import { Module } from '@nestjs/common';
import { MockHcmModule } from '../mock-hcm/mock-hcm.module';
import { TimeOffRequestsController } from './time-off-requests.controller';
import { TimeOffRequestsService } from './time-off-requests.service';

@Module({
  imports: [MockHcmModule],
  controllers: [TimeOffRequestsController],
  providers: [TimeOffRequestsService],
})
export class TimeOffRequestsModule {}
