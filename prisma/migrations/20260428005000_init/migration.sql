-- CreateTable
CREATE TABLE IF NOT EXISTS "balances" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "employeeId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "balanceUnits" INTEGER NOT NULL,
    "lastSyncedAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "time_off_requests" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "employeeId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "startDate" DATETIME NOT NULL,
    "endDate" DATETIME NOT NULL,
    "requestedUnits" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "idempotencyKey" TEXT,
    "hcmTransactionId" TEXT,
    "failureReason" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "hcm_mock_balances" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "employeeId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "balanceUnits" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "hcm_mock_usages" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "employeeId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "requestedUnits" INTEGER NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "transactionId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "balances_employeeId_locationId_key" ON "balances"("employeeId", "locationId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "time_off_requests_idempotencyKey_key" ON "time_off_requests"("idempotencyKey");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "time_off_requests_employeeId_locationId_status_idx" ON "time_off_requests"("employeeId", "locationId", "status");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "hcm_mock_balances_employeeId_locationId_key" ON "hcm_mock_balances"("employeeId", "locationId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "hcm_mock_usages_idempotencyKey_key" ON "hcm_mock_usages"("idempotencyKey");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "hcm_mock_usages_transactionId_key" ON "hcm_mock_usages"("transactionId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "hcm_mock_usages_employeeId_locationId_idx" ON "hcm_mock_usages"("employeeId", "locationId");
