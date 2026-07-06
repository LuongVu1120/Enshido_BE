/*
  Warnings:

  - Added the required column `updatedAt` to the `inventory_items` table without a default value. This is not possible if the table is not empty.

*/
-- CreateTable
CREATE TABLE "suppliers" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "address" TEXT,
    "note" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_inventory_items" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "group" TEXT,
    "category" TEXT,
    "unit" TEXT,
    "currentStock" REAL NOT NULL DEFAULT 0,
    "minStock" REAL NOT NULL DEFAULT 0,
    "maxStock" REAL,
    "costPrice" REAL,
    "location" TEXT,
    "supplierId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'NORMAL',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "inventory_items_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "suppliers" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_inventory_items" ("category", "code", "costPrice", "createdAt", "currentStock", "id", "minStock", "name", "status", "unit") SELECT "category", "code", "costPrice", "createdAt", "currentStock", "id", "minStock", "name", "status", "unit" FROM "inventory_items";
DROP TABLE "inventory_items";
ALTER TABLE "new_inventory_items" RENAME TO "inventory_items";
CREATE UNIQUE INDEX "inventory_items_code_key" ON "inventory_items"("code");
CREATE INDEX "inventory_items_group_idx" ON "inventory_items"("group");
CREATE TABLE "new_inventory_transactions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "inventoryItemId" TEXT NOT NULL,
    "orderId" TEXT,
    "productionStepId" TEXT,
    "supplierId" TEXT,
    "performedById" TEXT,
    "quantity" REAL NOT NULL,
    "unitPrice" REAL,
    "fromGroup" TEXT,
    "toGroup" TEXT,
    "note" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "inventory_transactions_inventoryItemId_fkey" FOREIGN KEY ("inventoryItemId") REFERENCES "inventory_items" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "inventory_transactions_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "suppliers" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "inventory_transactions_performedById_fkey" FOREIGN KEY ("performedById") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_inventory_transactions" ("code", "createdAt", "id", "inventoryItemId", "orderId", "quantity", "type", "unitPrice") SELECT "code", "createdAt", "id", "inventoryItemId", "orderId", "quantity", "type", "unitPrice" FROM "inventory_transactions";
DROP TABLE "inventory_transactions";
ALTER TABLE "new_inventory_transactions" RENAME TO "inventory_transactions";
CREATE UNIQUE INDEX "inventory_transactions_code_key" ON "inventory_transactions"("code");
CREATE INDEX "inventory_transactions_inventoryItemId_idx" ON "inventory_transactions"("inventoryItemId");
CREATE INDEX "inventory_transactions_orderId_idx" ON "inventory_transactions"("orderId");
CREATE INDEX "inventory_transactions_type_idx" ON "inventory_transactions"("type");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "suppliers_code_key" ON "suppliers"("code");
