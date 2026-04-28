export type TimeOffRequestResponse = {
  id: string;
  employeeId: string;
  locationId: string;
  startDate: string;
  endDate: string;
  requestedDays: number;
  requestedUnits: number;
  status: string;
  idempotencyKey: string | null;
  hcmTransactionId: string | null;
  failureReason: string | null;
  createdAt: string;
  updatedAt: string;
};
