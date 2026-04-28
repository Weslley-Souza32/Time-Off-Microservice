export type BalanceResponse = {
  employeeId: string;
  locationId: string;
  syncedBalanceDays: number;
  syncedBalanceUnits: number;
  pendingReservedDays: number;
  pendingReservedUnits: number;
  availableDays: number;
  availableUnits: number;
  lastSyncedAt: string;
};

export type BalanceSyncResponse = {
  syncedCount: number;
  balances: BalanceResponse[];
};
