/*
  Warnings:

  - The `stockStatus` column on the `menu_items` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the column `isTakeaway` on the `order_items` table. All the data in the column will be lost.
  - You are about to drop the column `notes` on the `order_items` table. All the data in the column will be lost.
  - The `status` column on the `order_items` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `status` column on the `orders` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `role` column on the `users` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `status` column on the `users` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('MESERO', 'COCINERO', 'ADMIN');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "StockStatus" AS ENUM ('AVAILABLE', 'OUT_OF_STOCK');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'READY', 'DELIVERED', 'PAID');

-- CreateEnum
CREATE TYPE "OrderItemStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'READY');

-- DropForeignKey
ALTER TABLE "orders" DROP CONSTRAINT "orders_tableId_fkey";

-- AlterTable
ALTER TABLE "dining_tables" ALTER COLUMN "status" SET DEFAULT 'FREE';

-- AlterTable
ALTER TABLE "menu_items" DROP COLUMN "stockStatus",
ADD COLUMN     "stockStatus" "StockStatus" NOT NULL DEFAULT 'AVAILABLE';

-- AlterTable
ALTER TABLE "order_items" DROP COLUMN "isTakeaway",
DROP COLUMN "notes",
DROP COLUMN "status",
ADD COLUMN     "status" "OrderItemStatus" NOT NULL DEFAULT 'PENDING';

-- AlterTable
ALTER TABLE "orders" ALTER COLUMN "tableId" DROP NOT NULL,
DROP COLUMN "status",
ADD COLUMN     "status" "OrderStatus" NOT NULL DEFAULT 'PENDING';

-- AlterTable
ALTER TABLE "users" DROP COLUMN "role",
ADD COLUMN     "role" "UserRole" NOT NULL DEFAULT 'MESERO',
DROP COLUMN "status",
ADD COLUMN     "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE';

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_tableId_fkey" FOREIGN KEY ("tableId") REFERENCES "dining_tables"("id") ON DELETE SET NULL ON UPDATE CASCADE;
