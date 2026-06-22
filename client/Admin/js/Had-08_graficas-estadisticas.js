// -POR HACERv6
// Had-08 — Gráficas de ventas y estadísticas: lógica JS del panel de dashboard
//
// Flujo esperado:
//   1. Al cargar: llamar GET /api/reports/dashboard, /weekly y /monthly (paralelo con Promise.all).
//   2. Renderizar tarjetas de KPIs: totalSoldToday, activeTables, ordersInKitchen.
//   3. Renderizar gráfica de barras semanal (7 días) con days[] de /weekly.
//      Usar Chart.js, ApexCharts o similar:
//        new Chart(ctx, { type: 'bar', data: { labels: days.map(d=>d.date), datasets: [{ data: days.map(d=>d.total) }] } })
//   4. Renderizar gráfica mensual con days[] de /monthly.
//   5. Mostrar weekTotal y monthTotal junto a sus gráficas.
//   6. Renderizar lowStockAlerts como badges/notificaciones:
//        alert === 'OUT'  → rojo
//        alert === 'LOW'  → amarillo
//   7. Tras confirmar cierre de caja (POST /api/reports/daily/close exitoso),
//      re-fetchear los 3 endpoints para refrescar las gráficas (criterio 4).
//   8. Escuchar socket event 'payment:confirmed' para actualización en tiempo real
//      cuando se añada ese evento en payment.controller (actualmente POR HACER).
