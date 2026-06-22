-- AlterTable: make orderId nullable on payments (payment is now at table level)
ALTER TABLE "payments" ALTER COLUMN "orderId" DROP NOT NULL;

-- AlterTable: add table-level payment tracking fields
ALTER TABLE "payments" ADD COLUMN "tableId" INTEGER;
ALTER TABLE "payments" ADD COLUMN "isTakeaway" BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE "payments" ADD COLUMN "pdfPath" TEXT;

-- AddForeignKey: link payment to dining table
ALTER TABLE "payments" ADD CONSTRAINT "payments_tableId_fkey"
  FOREIGN KEY ("tableId") REFERENCES "dining_tables"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
