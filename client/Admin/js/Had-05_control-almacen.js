// -POR HACERv5
// Had-05 & Had-06 — Lógica JS: gestión de almacén, insumos y recetas
//
// Ver Had-05_control-almacen.html para la documentación completa de endpoints y eventos.
//
// Flujo esperado:
// 1. Al cargar: GET /api/inventory/categories  y  GET /api/inventory/supplies
// 2. Escuchar socket 'inventory:low_stock' y 'inventory:out_of_stock' para mostrar alertas
// 3. Escuchar 'menu:updated' para refrescar la vista si se están mostrando recetas
// 4. Al registrar mercadería: PATCH /api/inventory/supplies/:id/stock { quantity }
// 5. Al gestionar receta de un plato: GET/PUT/DELETE /api/menu/admin/items/:id/recipe
