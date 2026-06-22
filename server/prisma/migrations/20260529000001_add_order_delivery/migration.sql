-- AlterTable: add delivery tracking fields to orders (Hme-03)
ALTER TABLE "orders"
ADD COLUMN "deliveredAt"   TIMESTAMP(3),
ADD COLUMN "deliveredById" TEXT;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_deliveredById_fkey"
  FOREIGN KEY ("deliveredById") REFERENCES "users"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- -NUEVOv2
