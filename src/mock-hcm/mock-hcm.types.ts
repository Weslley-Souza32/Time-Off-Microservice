export type MockHcmBalanceResponse = {
  employeeId: string;
  locationId: string;
  balanceDays: number;
  balanceUnits: number;
};

export type SubmitMockHcmUsageCommand = {
  employeeId: string;
  locationId: string;
  requestedUnits: number;
  idempotencyKey: string;
};

export type MockHcmUsageResponse = {
  transactionId: string;
  employeeId: string;
  locationId: string;
  requestedDays: number;
  requestedUnits: number;
  remainingBalanceDays: number;
  remainingBalanceUnits: number;
  idempotencyKey: string;
};
