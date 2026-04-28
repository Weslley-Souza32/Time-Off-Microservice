import { BadRequestException } from '@nestjs/common';
import { daysToUnits, unitsToDays } from './day-units';

describe('day unit conversion', () => {
  it('converts day amounts to integer units', () => {
    expect(daysToUnits(10)).toBe(1000);
    expect(daysToUnits(0.5)).toBe(50);
    expect(daysToUnits(1.25)).toBe(125);
  });

  it('converts units back to day amounts', () => {
    expect(unitsToDays(1000)).toBe(10);
    expect(unitsToDays(50)).toBe(0.5);
  });

  it('rejects invalid day amounts', () => {
    expect(() => daysToUnits(-1)).toThrow(BadRequestException);
    expect(() => daysToUnits(Number.NaN)).toThrow(BadRequestException);
    expect(() => daysToUnits(1.234)).toThrow(BadRequestException);
  });
});
