-- Soft-delete para platos del menú: permite "eliminar" platos con historial de
-- pedidos sin violar la llave foránea de order_items (se ocultan en lugar de borrarse).
ALTER TABLE "menu_items" ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true;
