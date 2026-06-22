-- Had-09: Añade valor CANCELLED a los enums de estado y crea tabla incidents

-- 1. Extend OrderStatus enum
ALTER TYPE "OrderStatus" ADD VALUE IF NOT EXISTS 'CANCELLED';

-- 2. Extend OrderItemStatus enum
ALTER TYPE "OrderItemStatus" ADD VALUE IF NOT EXISTS 'CANCELLED';

-- 3. Create incidents table
CREATE TABLE "incidents" (
  "id"            TEXT          NOT NULL,
  "tableId"       INTEGER,
  "tableNumber"   INTEGER,
  "orderId"       TEXT,
  "orderItemId"   TEXT,
  "lostAmount"    DECIMAL(10,2) NOT NULL,
  "reason"        TEXT,
  "itemsSnapshot" JSONB,
  "releasedById"  TEXT          NOT NULL,
  "createdAt"     TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "incidents_pkey" PRIMARY KEY ("id")
);

-- 4. Foreign key: incidents → dining_tables (SET NULL on delete)
ALTER TABLE "incidents"
  ADD CONSTRAINT "incidents_tableId_fkey"
  FOREIGN KEY ("tableId")
  REFERENCES "dining_tables"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- 5. Foreign key: incidents → users (RESTRICT on delete)
ALTER TABLE "incidents"
  ADD CONSTRAINT "incidents_releasedById_fkey"
  FOREIGN KEY ("releasedById")
  REFERENCES "users"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- -NUEVOv6
