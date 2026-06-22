// -POR HACERv6
// Had-09 — Cancelación de cobro por incidencia: lógica JS
//
// Este módulo se integra con dos vistas:
//
// 1. PANEL DE COBRO (admin_cobro / cajero):
//    - Botón "Liberar mesa forzosamente":
//        → Mostrar modal de confirmación: "¿Confirmar liberación sin cobro? Esto se registrará como pérdida."
//        → Input opcional para motivo (reason).
//        → Al confirmar: POST /api/incidents/tables/:tableId con { reason }
//        → Al recibir respuesta: actualizar UI de cobro y mapa de mesas.
//        → Mostrar monto de pérdida en un toast/aviso.
//
//    - Botón "Cancelar ítem" por cada ítem:
//        → Mostrar modal: "¿Cancelar [nombre del ítem] sin cobrar? (S/ x.xx)"
//        → Al confirmar: POST /api/incidents/items/:orderItemId con { reason }
//        → Si tableFreed === true: redirigir al mapa de mesas.
//        → Si no: actualizar el total mostrado con newOrderTotal.
//
// 2. HISTORIAL DE PÉRDIDAS (Had-09_cancelacion-cobro.html):
//    - Llamar GET /api/incidents (con filtros opcionales de fecha).
//    - Renderizar tabla: tableNumber, fecha, monto perdido, motivo, registrado por.
//    - Expandir fila para ver itemsSnapshot (detalle de ítems perdidos).
//    - Mostrar totalLost del período en una tarjeta.
//
// SOCKET LISTENERS:
//    socket.on('incident:table_released', (data) => {
//      // Actualizar mapa de mesas, mostrar notificación de pérdida
//    });
//    socket.on('incident:item_released', (data) => {
//      // Actualizar total del pedido activo, mostrar badge de ítem cancelado
//      // Si data.tableFreed === true: refrescar mapa de mesas
//    });
