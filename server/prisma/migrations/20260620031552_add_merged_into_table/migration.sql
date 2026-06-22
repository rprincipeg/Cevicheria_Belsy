-- AlterTable
ALTER TABLE "dining_tables" ADD COLUMN     "mergedIntoId" INTEGER;

-- AddForeignKey
ALTER TABLE "dining_tables" ADD CONSTRAINT "dining_tables_mergedIntoId_fkey" FOREIGN KEY ("mergedIntoId") REFERENCES "dining_tables"("id") ON DELETE SET NULL ON UPDATE CASCADE;
