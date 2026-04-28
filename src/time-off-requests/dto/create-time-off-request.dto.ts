import { Type } from 'class-transformer';
import {
  IsDateString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateTimeOffRequestDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  employeeId: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  locationId: string;

  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  requestedDays: number;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  idempotencyKey?: string;
}
