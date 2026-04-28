import { Type } from 'class-transformer';
import { IsNumber, Min } from 'class-validator';

export class UpsertMockHcmBalanceDto {
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  balanceDays: number;
}
