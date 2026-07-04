-- CreateTable
CREATE TABLE "production_batches" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "stepName" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "performedById" TEXT,
    "totalInputWeight" REAL,
    "totalOutputWeight" REAL,
    "totalLossWeight" REAL,
    "allowedLossPercent" REAL NOT NULL DEFAULT 3,
    "note" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt" DATETIME,
    CONSTRAINT "production_batches_performedById_fkey" FOREIGN KEY ("performedById") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_production_steps" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orderId" TEXT NOT NULL,
    "orderItemId" TEXT,
    "batchId" TEXT,
    "stepName" TEXT NOT NULL,
    "stepOrder" INTEGER NOT NULL,
    "assignedToId" TEXT,
    "performedById" TEXT,
    "status" TEXT NOT NULL DEFAULT 'NOT_STARTED',
    "startedAt" DATETIME,
    "completedAt" DATETIME,
    "inputQuantity" INTEGER,
    "completedQuantity" INTEGER,
    "defectQuantity" INTEGER,
    "inputWeight" REAL,
    "outputWeight" REAL,
    "lossWeight" REAL,
    "lossPercent" REAL,
    "reworkCount" INTEGER NOT NULL DEFAULT 0,
    "issueNote" TEXT,
    "version" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "production_steps_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "production_steps_orderItemId_fkey" FOREIGN KEY ("orderItemId") REFERENCES "order_items" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "production_steps_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "production_batches" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "production_steps_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "production_steps_performedById_fkey" FOREIGN KEY ("performedById") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_production_steps" ("assignedToId", "completedAt", "completedQuantity", "createdAt", "defectQuantity", "id", "inputQuantity", "inputWeight", "issueNote", "lossPercent", "lossWeight", "orderId", "orderItemId", "outputWeight", "performedById", "reworkCount", "startedAt", "status", "stepName", "stepOrder", "updatedAt", "version") SELECT "assignedToId", "completedAt", "completedQuantity", "createdAt", "defectQuantity", "id", "inputQuantity", "inputWeight", "issueNote", "lossPercent", "lossWeight", "orderId", "orderItemId", "outputWeight", "performedById", "reworkCount", "startedAt", "status", "stepName", "stepOrder", "updatedAt", "version" FROM "production_steps";
DROP TABLE "production_steps";
ALTER TABLE "new_production_steps" RENAME TO "production_steps";
CREATE INDEX "production_steps_orderId_idx" ON "production_steps"("orderId");
CREATE INDEX "production_steps_assignedToId_idx" ON "production_steps"("assignedToId");
CREATE INDEX "production_steps_performedById_idx" ON "production_steps"("performedById");
CREATE INDEX "production_steps_batchId_idx" ON "production_steps"("batchId");
CREATE INDEX "production_steps_stepName_status_idx" ON "production_steps"("stepName", "status");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "production_batches_code_key" ON "production_batches"("code");

-- CreateIndex
CREATE INDEX "production_batches_status_idx" ON "production_batches"("status");

-- CreateIndex
CREATE INDEX "production_batches_stepName_idx" ON "production_batches"("stepName");
