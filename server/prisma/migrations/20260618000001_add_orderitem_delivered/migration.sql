-- Entrega por ítem: añade valor DELIVERED al enum OrderItemStatus

ALTER TYPE "OrderItemStatus" ADD VALUE IF NOT EXISTS 'DELIVERED';

-- -EDITADOv7
