# Sprint 1-2 — Had-02 & Hme-03: Cambios de implementación

## Historias implementadas

| ID | Historia | Criterios cubiertos |
|----|----------|---------------------|
| **Had-02** | Administración del menú | 1–8 (backend); imagen en cloud = POR HACER |
| **Hme-03** | Visualización de notificaciones y entrega de pedidos | 1–10 (backend) |

---

## NUEVO (archivos creados)

| Archivo | Historia | Descripción |
|---------|----------|-------------|
| `server/prisma/migrations/20260529000001_add_order_delivery/migration.sql` | Hme-03 | Añade `deliveredAt` y `deliveredById` a la tabla `orders` |
| `server/src/middlewares/upload.middleware.ts` | Had-02 | Middleware multer para subida de imágenes JPG/PNG ≤ 2 MB |
| `server/uploads/.gitkeep` | Had-02 | Carpeta local para imágenes subidas |
| `client/Admin/Had-02_administracion-menu.html` | Had-02 | Panel HTML de gestión del menú (categorías + platos, toggle stock, subida de imagen) |
| `client/Admin/js/Had-02_administracion-menu.js` | Had-02 | Lógica JS: carga categorías, CRUD, stock e imagen, con `menu:updated` |
| `client/Mesero/Monitor_mesero.html` | Hme-03 | **POR HACER** — placeholder con documentación de endpoints y eventos |
| `client/Mesero/js/monitor_mesero.js` | Hme-03 | **POR HACER** — placeholder |

---

## EDITADO (archivos modificados)

| Archivo | Historia | Qué cambió |
|---------|----------|------------|
| `server/prisma/schema.prisma` | Hme-03 | Añadidos `deliveredAt`, `deliveredById`, relación `deliveredBy` en `Order`; relación `deliveredOrders` en `User`; relación `createdBy` renombrada a named relation |
| `server/src/modules/Had-02_administracion-menu/Had-02_administracion-menu.controller.ts` | Had-02 | Agregadas funciones admin: `getAdminCategories`, `createCategory`, `updateCategory`, `deleteCategory`, `createMenuItem`, `updateMenuItem`, `deleteMenuItem`, `setMenuItemStock`, `uploadMenuItemImage`, `deleteMenuItemImage`; modificado `getCategories` para devolver todos los platos con su stockStatus |
| `server/src/modules/Had-02_administracion-menu/Had-02_administracion-menu.routes.ts` | Had-02 | Agregadas rutas admin de categorías e ítems |
| `server/src/controllers/auth.controller.ts` | Had-02 | Eliminado bloque que impedía login del rol ADMIN |
| `server/src/app.ts` | Had-02 | Añadido `express.static` para `/uploads` |
| `server/src/controllers/orders.controller.ts` | Hme-03 | Añadidas funciones `getActiveOrders` y `deliverOrder` |
| `server/src/routes/orders.routes.ts` | Hme-03 | Añadidas rutas `GET /active` y `PATCH /:orderId/deliver` |
| `server/package.json` | Had-02 | Añadidos `multer` y `@types/multer` |

---

## POR HACER (pendiente)

| Archivo / Tarea | Historia | Descripción |
|-----------------|----------|-------------|
| `client/Mesero/Monitor_mesero.html` | Hme-03 | Vista del mesero: lista de pedidos activos, alertas de pedidos READY, botón "Entregar" |
| `client/Mesero/js/monitor_mesero.js` | Hme-03 | Lógica JS: escuchar `orders:ready` / `orders:delivered`, llamar `PATCH /deliver` |
| Almacenamiento externo de imágenes | Had-02 | En Railway el filesystem es efímero; migrar a S3, Cloudinary o similar para producción |
| `npm install` en `/server` | Had-02 | Ejecutar después de agregar `multer` al `package.json` |
| `npm run db:migrate` en `/server` | Hme-03 | Aplicar migración `20260529000001_add_order_delivery` y regenerar el cliente Prisma |

---

## Comandos necesarios para activar los cambios

```bash
# En directorio /server:

# 1. Instalar multer (Had-02)
npm install

# 2. Aplicar migración de BD y regenerar tipos Prisma (Hme-03)
npm run db:migrate

# 3. Reiniciar el servidor
npm run dev
```

---

## API Reference — nuevos endpoints

### Had-02 — Administración del menú (`/api/menu`)

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| `GET` | `/admin/categories` | ADMIN | Todas las categorías con todos sus platos |
| `POST` | `/admin/categories` | ADMIN | Crear categoría `{ name, sortOrder?, isActive? }` |
| `PATCH` | `/admin/categories/:id` | ADMIN | Editar categoría |
| `DELETE` | `/admin/categories/:id` | ADMIN | Eliminar (falla si tiene platos) |
| `POST` | `/admin/items` | ADMIN | Crear plato `{ name, price, categoryId, description?, isPreparable? }` |
| `PATCH` | `/admin/items/:id` | ADMIN | Editar plato |
| `DELETE` | `/admin/items/:id` | ADMIN | Eliminar plato (falla si tiene pedidos) |
| `PATCH` | `/admin/items/:id/stock` | ADMIN | Cambiar disponibilidad `{ stockStatus: "AVAILABLE" \| "OUT_OF_STOCK" }` |
| `PATCH` | `/admin/items/:id/image` | ADMIN | Subir imagen (multipart, campo `image`) |
| `DELETE` | `/admin/items/:id/image` | ADMIN | Quitar imagen |

### Hme-03 — Notificaciones y entrega (`/api/orders`)

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| `GET` | `/active` | MESERO | Todos los pedidos activos (PENDING/IN_PROGRESS/READY) |
| `PATCH` | `/:orderId/deliver` | MESERO | Marcar pedido como DELIVERED (solo si está en READY) |

### Socket.io — nuevos eventos

| Evento | Dirección | Room | Payload |
|--------|-----------|------|---------|
| `menu:updated` | server → client | todos | *(vacío — el cliente re-fetch)* |
| `orders:delivered` | server → client | `waiters` | `{ orderId, tableNumber, isTakeaway, deliveredAt, deliveredByUsername }` |

El evento `orders:ready` ya existía y es emitido desde `kitchen.controller.ts` al room `waiters`.
