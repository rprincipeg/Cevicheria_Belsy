-- Had-03: add fullName to users (nullable to preserve existing rows)
ALTER TABLE "users" ADD COLUMN "fullName" TEXT;

-- Had-04: daily closure table
CREATE TABLE "daily_closures" (
  "id"           TEXT        NOT NULL,
  "date"         TEXT        NOT NULL,
  "totalSales"   DECIMAL(10,2) NOT NULL,
  "totalOrders"  INTEGER     NOT NULL,
  "tablesServed" INTEGER     NOT NULL,
  "closedById"   TEXT        NOT NULL,
  "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "daily_closures_pkey" PRIMARY KEY ("id")
);

-- One closure per calendar day (YYYY-MM-DD UTC)
CREATE UNIQUE INDEX "daily_closures_date_key" ON "daily_closures"("date");

ALTER TABLE "daily_closures"
  ADD CONSTRAINT "daily_closures_closedById_fkey"
  FOREIGN KEY ("closedById") REFERENCES "users"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- -NUEVOv3
