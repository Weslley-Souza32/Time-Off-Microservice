import { BadRequestException } from '@nestjs/common';

export const DAY_UNIT_SCALE = 100;

export function daysToUnits(days: number): number {
  if (!Number.isFinite(days) || days < 0) {
    throw new BadRequestException('days must be a non-negative finite number');
  }

  const units = Math.round(days * DAY_UNIT_SCALE);

  if (Math.abs(units / DAY_UNIT_SCALE - days) > Number.EPSILON * 100) {
    throw new BadRequestException('days cannot have more than two decimals');
  }

  return units;
}

export function unitsToDays(units: number): number {
  return units / DAY_UNIT_SCALE;
}
