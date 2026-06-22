-- Had-05: Control de almacén e insumos
-- Had-06: Vinculación de insumos a platos

-- CreateEnum
CREATE TYPE "SupplyUnit" AS ENUM ('KG', 'G', 'L', 'ML', 'UNITS');

-- CreateTable: categorías de insumos
CREATE TABLE "supply_categories" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "supply_categories_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "supply_categories_name_key" ON "supply_categories"("name");

-- CreateTable: insumos
CREATE TABLE "supplies" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "unit" "SupplyUnit" NOT NULL,
    "currentStock" DECIMAL(12,3) NOT NULL DEFAULT 0,
    "minStock" DECIMAL(12,3) NOT NULL DEFAULT 0,
    "categoryId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "supplies_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "supplies_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "supply_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "supplies_name_key" ON "supplies"("name");

-- CreateTable: receta (ingredientes por plato)
CREATE TABLE "recipe_items" (
    "id" TEXT NOT NULL,
    "menuItemId" TEXT NOT NULL,
    "supplyId" TEXT NOT NULL,
    "quantity" DECIMAL(12,3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "recipe_items_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "recipe_items_menuItemId_fkey" FOREIGN KEY ("menuItemId") REFERENCES "menu_items"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "recipe_items_supplyId_fkey" FOREIGN KEY ("supplyId") REFERENCES "supplies"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "recipe_items_menuItemId_supplyId_key" ON "recipe_items"("menuItemId", "supplyId");

-- -NUEVOv5
