import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { CreateTimeOffRequestDto } from './dto/create-time-off-request.dto';
import { TimeOffRequestResponse } from './time-off-requests.types';
import { TimeOffRequestsService } from './time-off-requests.service';

@Controller('time-off-requests')
export class TimeOffRequestsController {
  constructor(
    private readonly timeOffRequestsService: TimeOffRequestsService,
  ) {}

  @Post()
  create(
    @Body() dto: CreateTimeOffRequestDto,
  ): Promise<TimeOffRequestResponse> {
    return this.timeOffRequestsService.create(dto);
  }

  @Get(':id')
  getById(@Param('id') id: string): Promise<TimeOffRequestResponse> {
    return this.timeOffRequestsService.getById(id);
  }
}
