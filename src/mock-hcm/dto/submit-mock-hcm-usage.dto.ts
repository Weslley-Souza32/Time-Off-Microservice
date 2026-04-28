import { Type } from 'class-transformer';
import {
  IsNotEmpty,
  IsNumber,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class SubmitMockHcmUsageDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  employeeId: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  locationId: string;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  requestedDays: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  idempotencyKey: string;
}
