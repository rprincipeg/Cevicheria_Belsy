import fs from 'fs';
import path from 'path';
import { Request, Response } from 'express';
import ExcelJS from 'exceljs';
import { prisma } from '../../lib/prisma';

// ─── HELPERS ──────────────────────────────────────────────────────────────────

function parseDateParam(raw: unknown): { start: Date; end: Date; dateLabel: string } {
  if (typeof raw === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    const [y, m, d] = raw.split('-').map(Number);
    return {
      start: new Date(y, m - 1, d,  0,  0,  0,   0),
      end:   new Date(y, m - 1, d, 23, 59, 59, 999),
      dateLabel: raw,
    };
  }
  const now = new Date();
  const y = now.getFullYear(), m = now.getMonth(), d = now.getDate();
  return {
    start:     new Date(y, m, d,  0,  0,  0,   0),
    end:       new Date(y, m, d, 23, 59, 59, 999),
    dateLabel: `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
  };
}

async function fetchPaidOrders(start: Date, end: Date) {
  return prisma.order.findMany({
    where: { status: 'PAID', paidAt: { gte: start, lte: end } },
    include: {
      table: { select: { number: true } },
      items: {
        include: {
          menuItem: {
            select: {
              id: true,
              name: true,
              category: { select: { name: true } },
            },
          },
        },
        orderBy: { createdAt: 'asc' },
      },
    },
    orderBy: { paidAt: 'asc' },
  });
}

type PaidOrders = Awaited<ReturnType<typeof fetchPaidOrders>>;

async function getLastClosureCreatedAt(): Promise<Date | null> {
  const last = await (prisma as any).dailyClosure.findFirst({
    orderBy: { createdAt: 'desc' },
    select: { createdAt: true },
  });
  return last?.createdAt ?? null;
}

function getTodayLabel(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function buildSummary(orders: PaidOrders, dateLabel: string) {
  const totalSales = orders.reduce((s, o) => s + Number(o.total), 0);
  const tablesServed = new Set(orders.filter((o) => o.tableId !== null).map((o) => o.tableId)).size;

  // Aggregate items
  const itemMap = new Map<string, { name: string; qty: number; revenue: number }>();
  for (const order of orders) {
    for (const item of order.items) {
      const key = item.menuItem.id;
      const existing = itemMap.get(key);
      if (existing) {
        existing.qty += item.quantity;
        existing.revenue += Number(item.subtotal);
      } else {
        itemMap.set(key, {
          name: item.menuItem.name,
          qty: item.quantity,
          revenue: Number(item.subtotal),
        });
      }
    }
  }

  const topItems = Array.from(itemMap.values())
    .sort((a, b) => b.qty - a.qty)
    .slice(0, 5)
    .map(({ name, qty, revenue }) => ({ name, totalQuantity: qty, totalRevenue: revenue }));

  return {
    date: dateLabel,
    totalSales,
    totalOrders: orders.length,
    tablesServed,
    topItems,
    orders: orders.map((o) => ({
      id: o.id,
      code: o.code,
      tableNumber: o.table?.number ?? null,
      isTakeaway: o.isTakeaway,
      notes: o.notes,
      total: Number(o.total),
      paidAt: o.paidAt,
      createdAt: o.createdAt,
      items: o.items.map((i) => ({
        name: i.menuItem.name,
        quantity: i.quantity,
        unitPrice: Number(i.unitPrice),
        subtotal: Number(i.subtotal),
        isTakeaway: i.isTakeaway,
      })),
    })),
  };
}

// ─── buildDayDetails ─────────────────────────────────────────────────────────
// Aggregates per-day metrics not covered by buildSummary:
//   itemsByCategory, takeaway count, partial payments, avg order rounds/table.

function buildDayDetails(
  orders: PaidOrders,
  partialPayments: { orderId: string | null }[],
) {
  // 1. Items grouped by category, sorted by qty desc within each category
  const catMap = new Map<string, Map<string, { name: string; qty: number; revenue: number }>>();
  for (const order of orders) {
    for (const item of order.items) {
      const catName = item.menuItem.category.name;
      if (!catMap.has(catName)) catMap.set(catName, new Map());
      const catItems = catMap.get(catName)!;
      const prev = catItems.get(item.menuItem.id);
      if (prev) {
        prev.qty     += item.quantity;
        prev.revenue += Number(item.subtotal);
      } else {
        catItems.set(item.menuItem.id, {
          name: item.menuItem.name,
          qty: item.quantity,
          revenue: Number(item.subtotal),
        });
      }
    }
  }
  const itemsByCategory = Array.from(catMap.entries())
    .sort(([a], [b]) => a.localeCompare(b, 'es'))
    .map(([categoryName, itemsMap]) => ({
      categoryName,
      items: Array.from(itemsMap.values()).sort((a, b) => b.qty - a.qty),
    }));

  // 2. Takeaway orders count
  const takeawayOrdersCount = orders.filter((o) => o.isTakeaway).length;

  // 3. Partial payments: total count and average per order that had any
  const partialByOrder = new Map<string, number>();
  for (const pp of partialPayments) {
    if (pp.orderId) partialByOrder.set(pp.orderId, (partialByOrder.get(pp.orderId) ?? 0) + 1);
  }
  const ordersWithPartialCount = partialByOrder.size;
  const totalPartials = Array.from(partialByOrder.values()).reduce((s, v) => s + v, 0);
  const avgPartialPaymentsPerOrder =
    ordersWithPartialCount > 0
      ? Math.round((totalPartials / ordersWithPartialCount) * 10) / 10
      : 0;

  // 4. Average order rounds per table (how many times items were added to a table)
  //    Each separate Order on the same tableId = one round.
  const roundsPerTable = new Map<number, number>();
  for (const order of orders) {
    if (order.tableId !== null) {
      roundsPerTable.set(order.tableId, (roundsPerTable.get(order.tableId) ?? 0) + 1);
    }
  }
  const roundsArr = Array.from(roundsPerTable.values());
  const avgOrderRoundsPerTable =
    roundsArr.length > 0
      ? Math.round((roundsArr.reduce((s, v) => s + v, 0) / roundsArr.length) * 10) / 10
      : 0;

  return {
    itemsByCategory,
    takeawayOrdersCount,
    partialPaymentsCount: totalPartials,
    ordersWithPartialCount,
    avgPartialPaymentsPerOrder,
    avgOrderRoundsPerTable,
  };
}

// ─── GET /api/reports/daily?date=YYYY-MM-DD ──────────────────────────────────
// Criterion 1-2: live report for the specified day (defaults to today)
export async function getDailyReport(req: Request, res: Response): Promise<void> {
  try {
    const { start, end, dateLabel } = parseDateParam(req.query['date']);
    let effectiveStart = start;
    if (dateLabel === getTodayLabel()) {
      const lastClosed = await getLastClosureCreatedAt();
      if (lastClosed && lastClosed > start) effectiveStart = lastClosed;
    }
    const [orders, partialPayments] = await Promise.all([
      fetchPaidOrders(effectiveStart, end),
      prisma.payment.findMany({
        where: { createdAt: { gte: effectiveStart, lte: end }, mode: 'PARTIAL' },
        select: { orderId: true },
      }),
    ]);
    const summary = buildSummary(orders, dateLabel);
    const details = buildDayDetails(orders, partialPayments);
    res.json({ ...summary, details });
  } catch {
    res.status(500).json({ error: 'Error interno del servidor' });
  }
} // -NUEVOv3

// ─── Excel builder (shared by export endpoint and auto-save on closure) ──────
async function buildDailyExcelBuffer(
  summary: ReturnType<typeof buildSummary>,
  reporterName: string,
  generatedAt: Date,
): Promise<Buffer> {
  const fechaGen = generatedAt.toLocaleDateString('es-PE');
  const horaGen  = generatedAt.toLocaleTimeString('es-PE');

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Cevichería Belsy';
  workbook.created = generatedAt;

  const sheet = workbook.addWorksheet('Reporte de Ventas');

  sheet.mergeCells('A1:G1');
  sheet.getCell('A1').value = `Reporte de Ventas — ${summary.date}`;
  sheet.getCell('A1').font = { bold: true, size: 14 };
  sheet.getCell('A1').alignment = { horizontal: 'center' };
  sheet.addRow([]);

  sheet.addRow(['Total de ventas:', `S/ ${summary.totalSales.toFixed(2)}`]);
  sheet.addRow(['Pedidos pagados:', summary.totalOrders]);
  sheet.addRow(['Mesas atendidas:', summary.tablesServed]);
  sheet.addRow(['Generado el:',    `${fechaGen} ${horaGen}`]);
  sheet.addRow(['Generado por:',   reporterName]);
  sheet.addRow([]);

  if (summary.topItems.length > 0) {
    sheet.addRow(['Ítems más vendidos']);
    sheet.getRow(sheet.rowCount).font = { bold: true };
    sheet.addRow(['Ítem', 'Unidades vendidas', 'Ingreso total']);
    for (const item of summary.topItems) {
      sheet.addRow([item.name, item.totalQuantity, `S/ ${item.totalRevenue.toFixed(2)}`]);
    }
    sheet.addRow([]);
  }

  const headerRow = sheet.addRow([
    'Mesa', 'Código Pedido', 'Ítem', 'Modalidad', 'Precio Unit.', 'Hora Pedido', 'Hora Pago',
  ]);
  headerRow.font = { bold: true };
  headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9EAD3' } };

  sheet.columns = [
    { key: 'mesa',       width: 10 },
    { key: 'codigo',     width: 18 },
    { key: 'item',       width: 28 },
    { key: 'modalidad',  width: 14 },
    { key: 'precioUnit', width: 13 },
    { key: 'horaPedido', width: 18 },
    { key: 'horaPago',   width: 18 },
  ];

  for (const order of summary.orders) {
    const mesa = order.isTakeaway ? 'Para llevar' : `Mesa ${order.tableNumber ?? '?'}`;
    const horaPago   = order.paidAt ? new Date(order.paidAt).toLocaleTimeString('es-PE') : '';
    const horaPedido = new Date(order.createdAt).toLocaleTimeString('es-PE');
    for (const item of order.items) {
      sheet.addRow([
        mesa, order.code, item.name,
        item.isTakeaway ? 'Para llevar' : 'En mesa',
        item.unitPrice, horaPedido, horaPago,
      ]);
    }
  }

  return Buffer.from(await workbook.xlsx.writeBuffer() as ArrayBuffer);
}

// ─── GET /api/reports/daily/export?date=YYYY-MM-DD ───────────────────────────
export async function exportDailyReport(req: Request, res: Response): Promise<void> {
  try {
    const { start, end, dateLabel } = parseDateParam(req.query['date']);
    let effectiveStart = start;
    if (dateLabel === getTodayLabel()) {
      const lastClosed = await getLastClosureCreatedAt();
      if (lastClosed && lastClosed > start) effectiveStart = lastClosed;
    }
    const [orders, reporter] = await Promise.all([
      fetchPaidOrders(effectiveStart, end),
      prisma.user.findUnique({
        where: { id: req.user!.userId },
        select: { fullName: true, username: true },
      }),
    ]);
    const summary      = buildSummary(orders, dateLabel);
    const reporterName = reporter?.fullName ?? reporter?.username ?? req.user!.username;
    const buffer       = await buildDailyExcelBuffer(summary, reporterName, new Date());

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="reporte_${dateLabel}.xlsx"`);
    res.end(buffer);
  } catch {
    res.status(500).json({ error: 'Error interno del servidor' });
  }
} // -NUEVOv3

// ─── POST /api/reports/daily/close ───────────────────────────────────────────
// Criterion 5-6: execute daily close — creates DailyClosure record
export async function createDailyClosure(req: Request, res: Response): Promise<void> {
  try {
    const { start, end, dateLabel } = parseDateParam(undefined); // always today
    // NOTA: el límite de "un cierre por día" está temporalmente deshabilitado
    // para permitir múltiples cierres durante las pruebas.
    const [lastClosed, reporter] = await Promise.all([
      getLastClosureCreatedAt(),
      prisma.user.findUnique({
        where: { id: req.user!.userId },
        select: { fullName: true, username: true },
      }),
    ]);
    const effectiveStart = lastClosed && lastClosed > start ? lastClosed : start;
    const orders = await fetchPaidOrders(effectiveStart, end);
    const summary = buildSummary(orders, dateLabel);

    const reporterName = reporter?.fullName ?? reporter?.username ?? req.user!.username;
    const generatedAt  = new Date();
    const excelBuffer  = await buildDailyExcelBuffer(summary, reporterName, generatedAt);

    const closuresDir = path.join(process.cwd(), 'receipts', 'cierres');
    fs.mkdirSync(closuresDir, { recursive: true });
    const filename  = `cierre_${dateLabel}_${generatedAt.getTime()}.xlsx`;
    const excelPath = path.join(closuresDir, filename);
    fs.writeFileSync(excelPath, excelBuffer);

    const closure = await (prisma as any).dailyClosure.create({
      data: {
        date: dateLabel,
        totalSales: summary.totalSales,
        totalOrders: summary.totalOrders,
        tablesServed: summary.tablesServed,
        closedById: req.user!.userId,
        excelPath,
      },
      include: {
        closedBy: { select: { id: true, username: true, fullName: true } },
      },
    });

    res.status(201).json({ closure, summary });
  } catch {
    res.status(500).json({ error: 'Error interno del servidor' });
  }
} // -NUEVOv3

// ─── GET /api/reports/closures/:id/export ─────────────────────────────────────
// Descarga el Excel archivado de un cierre de caja: es exactamente el mismo
// documento que se genera con "Exportar datos", guardado al ejecutar el cierre.
export async function downloadClosureExcel(req: Request, res: Response): Promise<void> {
  try {
    const id = req.params['id'] as string;
    const closure = await (prisma as any).dailyClosure.findUnique({ where: { id } });
    if (!closure?.excelPath || !fs.existsSync(closure.excelPath)) {
      res.status(404).json({ error: 'Archivo de cierre no encontrado' });
      return;
    }
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="cierre_${closure.date}.xlsx"`);
    fs.createReadStream(closure.excelPath).pipe(res);
  } catch {
    res.status(500).json({ error: 'Error interno del servidor' });
  }
} // -NUEVO

// ─── GET /api/reports/closures ────────────────────────────────────────────────
// Returns list of past daily closures for audit
export async function listClosures(_req: Request, res: Response): Promise<void> {
  try {
    const closures = await (prisma as any).dailyClosure.findMany({
      orderBy: { date: 'desc' },
      include: {
        closedBy: { select: { id: true, username: true, fullName: true } },
      },
    });
    res.json(closures);
  } catch {
    res.status(500).json({ error: 'Error interno del servidor' });
  }
} // -NUEVOv3

// ─── Had-07: Payment History ──────────────────────────────────────────────────

const MAX_HISTORY_DAYS = 90;

function parseDateRangeParams(rawStart: unknown, rawEnd: unknown): {
  start: Date; end: Date; startLabel: string; endLabel: string; error?: string;
} {
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (typeof rawStart !== 'string' || !dateRegex.test(rawStart) ||
      typeof rawEnd !== 'string' || !dateRegex.test(rawEnd)) {
    return { start: new Date(), end: new Date(), startLabel: '', endLabel: '',
      error: 'Se requieren startDate y endDate en formato YYYY-MM-DD' };
  }

  const [sy, sm, sd] = rawStart.split('-').map(Number);
  const [ey, em, ed] = rawEnd.split('-').map(Number);
  // Use local time so date boundaries match what the user sees on screen.
  const start = new Date(sy, sm - 1, sd,  0,  0,  0,   0);
  const end   = new Date(ey, em - 1, ed, 23, 59, 59, 999);

  if (end < start) {
    return { start, end, startLabel: rawStart, endLabel: rawEnd,
      error: 'La fecha de fin debe ser mayor o igual a la fecha de inicio' };
  }

  const today = new Date();
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const diffDays = Math.ceil((todayStart.getTime() - start.getTime()) / 86_400_000);
  if (diffDays > MAX_HISTORY_DAYS) {
    return { start, end, startLabel: rawStart, endLabel: rawEnd,
      error: `El rango máximo de consulta es de ${MAX_HISTORY_DAYS} días hacia atrás` };
  }

  return { start, end, startLabel: rawStart, endLabel: rawEnd };
}

async function fetchPaymentRecords(start: Date, end: Date) {
  return prisma.payment.findMany({
    where: { createdAt: { gte: start, lte: end } },
    include: {
      table:      { select: { number: true } },
      receivedBy: { select: { username: true, fullName: true } },
    },
    orderBy: { createdAt: 'asc' },
  });
}

type PaymentRecordList = Awaited<ReturnType<typeof fetchPaymentRecords>>;

function formatPaymentRecord(p: PaymentRecordList[number]) {
  return {
    id:             p.id,
    tableNumber:    p.table?.number ?? null,
    isTakeaway:     p.isTakeaway,
    amount:         Number(p.amount),
    receivedAmount: Number(p.receivedAmount),
    changeAmount:   Number(p.changeAmount),
    method:         p.method,
    mode:           p.mode,
    documentType:   p.documentType ?? null,
    customerName:   p.customerName ?? null,
    receivedBy:     p.receivedBy.fullName ?? p.receivedBy.username,
    createdAt:      p.createdAt,
  };
}

// ─── GET /api/reports/payments?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD ────────
// Had-07 Criterion 1-3: historial de pagos filtrado por rango de fechas
export async function getPaymentHistory(req: Request, res: Response): Promise<void> {
  try {
    const { start, end, startLabel, endLabel, error } = parseDateRangeParams(
      req.query['startDate'], req.query['endDate'],
    );
    if (error) { res.status(400).json({ error }); return; }

    const payments = await fetchPaymentRecords(start, end);
    const totalAmount = payments.reduce((sum, p) => sum + Number(p.amount), 0);

    res.json({
      startDate:     startLabel,
      endDate:       endLabel,
      totalAmount,
      totalPayments: payments.length,
      payments:      payments.map(formatPaymentRecord),
    });
  } catch {
    res.status(500).json({ error: 'Error interno del servidor' });
  }
} // -NUEVOv4

// ─── GET /api/reports/payments/export?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD ─
// Had-07 Criterion 4: exportar historial a Excel (mismo estilo que reporte diario)
export async function exportPaymentHistory(req: Request, res: Response): Promise<void> {
  try {
    const { start, end, startLabel, endLabel, error } = parseDateRangeParams(
      req.query['startDate'], req.query['endDate'],
    );
    if (error) { res.status(400).json({ error }); return; }

    const payments = await fetchPaymentRecords(start, end);
    const totalAmount = payments.reduce((sum, p) => sum + Number(p.amount), 0);

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Cevichería Belsy';
    workbook.created = new Date();

    const sheet = workbook.addWorksheet('Historial de Pagos');

    const METHOD_LABEL: Record<string, string> = { CASH: 'EFECTIVO', QR: 'QR', YAPE: 'YAPE' };
    const MODE_LABEL:   Record<string, string> = { FULL: 'TOTAL', PARTIAL: 'PARCIAL' };

    // Title
    sheet.mergeCells('A1:J1');
    sheet.getCell('A1').value = `Historial de Pagos — ${startLabel} al ${endLabel}`;
    sheet.getCell('A1').font = { bold: true, size: 14 };
    sheet.getCell('A1').alignment = { horizontal: 'center' };
    sheet.addRow([]);

    // Summary block
    sheet.addRow(['Total acumulado:', `S/ ${totalAmount.toFixed(2)}`]);
    sheet.addRow(['Total de pagos:', payments.length]);
    sheet.addRow([]);

    // Header row
    const headerRow = sheet.addRow([
      'ID Transacción', 'Mesa', 'Fecha', 'Hora',
      'Tipo Comprobante', 'Identificador Tributario',
      'Método', 'Modalidad', 'Cajero', 'Monto',
    ]);
    headerRow.font = { bold: true };
    headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9EAD3' } };

    sheet.columns = [
      { key: 'id',      width: 28 },
      { key: 'mesa',    width: 14 },
      { key: 'fecha',   width: 12 },
      { key: 'hora',    width: 10 },
      { key: 'tipoDoc', width: 18 },
      { key: 'idTrib',  width: 22 },
      { key: 'metodo',  width: 12 },
      { key: 'mod',     width: 10 },
      { key: 'cajero',  width: 20 },
      { key: 'monto',   width: 12 },
    ];

    for (const p of payments) {
      const mesa  = p.isTakeaway ? 'Para llevar' : `Mesa ${p.table?.number ?? '?'}`;
      const fecha = new Date(p.createdAt).toLocaleDateString('es-PE');
      const hora  = new Date(p.createdAt).toLocaleTimeString('es-PE');
      sheet.addRow([
        p.id,
        mesa, fecha, hora,
        p.documentType ?? '—',
        p.customerDocument ?? '—',
        METHOD_LABEL[p.method] ?? p.method,
        MODE_LABEL[p.mode]     ?? p.mode,
        p.receivedBy.fullName ?? p.receivedBy.username,
        Number(p.amount),
      ]);
    }

    // Totals row
    sheet.addRow([]);
    const totalsRow = sheet.addRow(['', '', '', '', '', '', '', '', 'TOTAL:', totalAmount]);
    totalsRow.font = { bold: true };
    totalsRow.getCell(9).alignment = { horizontal: 'right' };

    const buffer = await workbook.xlsx.writeBuffer();
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="pagos_${startLabel}_${endLabel}.xlsx"`);
    res.end(Buffer.from(buffer as ArrayBuffer));
  } catch {
    res.status(500).json({ error: 'Error interno del servidor' });
  }
} // -NUEVOv4

// ─── Had-08: Gráficas de ventas y estadísticas ────────────────────────────────

// Build an array of {date, total} for every calendar day in [start, end] UTC.
// Days with no payments return total=0 so the chart always has a full series.
async function buildDailySeries(start: Date, end: Date): Promise<{ date: string; total: number }[]> {
  const payments = await prisma.payment.findMany({
    where: { createdAt: { gte: start, lte: end } },
    select: { amount: true, createdAt: true },
  });

  // Group by date label YYYY-MM-DD (UTC)
  const map = new Map<string, number>();
  for (const p of payments) {
    const label = p.createdAt.toISOString().slice(0, 10);
    map.set(label, (map.get(label) ?? 0) + Number(p.amount));
  }

  // Fill every day in range (days with no payments = 0)
  const series: { date: string; total: number }[] = [];
  const cursor = new Date(start);
  while (cursor <= end) {
    const label = cursor.toISOString().slice(0, 10);
    series.push({ date: label, total: Number((map.get(label) ?? 0).toFixed(2)) });
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return series;
}

// ─── GET /api/reports/dashboard ───────────────────────────────────────────────
// Had-08 Criterion 1 + 6: indicadores del día + alertas de stock bajo.
export async function getDashboard(_req: Request, res: Response): Promise<void> {
  try {
    const now = new Date();
    const todayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0));
    const todayEnd   = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59, 999));

    const [paymentsToday, activeTables, ordersInKitchen, allSupplies] = await Promise.all([
      prisma.payment.findMany({
        where: { createdAt: { gte: todayStart, lte: todayEnd } },
        select: { amount: true },
      }),
      prisma.diningTable.count({ where: { status: 'OCCUPIED' } }),
      prisma.order.count({ where: { status: { in: ['PENDING', 'IN_PROGRESS'] } } }),
      // Supply model added in Had-05 (v5): use prisma as any until db:migrate is confirmed applied
      (prisma as any).supply.findMany({
        select: { id: true, name: true, unit: true, currentStock: true, minStock: true },
      }).catch(() => [] as unknown[]),
    ]);

    const totalSoldToday = paymentsToday.reduce((s, p) => s + Number(p.amount), 0);

    // Prisma does not support column-to-column comparisons in where, so filter in JS
    const lowStockAlerts = (allSupplies as Array<{
      id: string; name: string; unit: string; currentStock: unknown; minStock: unknown;
    }>)
      .filter((s) => Number(s.currentStock) <= Number(s.minStock))
      .map((s) => ({
        supplyId:     s.id,
        supplyName:   s.name,
        unit:         s.unit,
        currentStock: Number(s.currentStock),
        minStock:     Number(s.minStock),
        alert:        Number(s.currentStock) === 0 ? 'OUT' : 'LOW',
      }));

    res.json({
      totalSoldToday: Number(totalSoldToday.toFixed(2)),
      activeTables,
      ordersInKitchen,
      lowStockAlerts,
    });
  } catch (err) {
    console.error('[reports] getDashboard:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
} // -NUEVOv6

// ─── GET /api/reports/weekly ──────────────────────────────────────────────────
// Had-08 Criterion 2 + 5: ventas diarias de los últimos 7 días + total semanal.
export async function getWeeklySales(_req: Request, res: Response): Promise<void> {
  try {
    const now = new Date();
    const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59, 999));
    // Start = 6 days before today (7 days total including today)
    const startDay = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 6, 0, 0, 0, 0));

    const days = await buildDailySeries(startDay, end);
    const weekTotal = Number(days.reduce((s, d) => s + d.total, 0).toFixed(2));

    res.json({ weekTotal, days });
  } catch (err) {
    console.error('[reports] getWeeklySales:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
} // -NUEVOv6

// ─── GET /api/reports/monthly ─────────────────────────────────────────────────
// Had-08 Criterion 3 + 5: ventas por día del mes actual + total mensual.
export async function getMonthlySales(_req: Request, res: Response): Promise<void> {
  try {
    const now = new Date();
    const y   = now.getUTCFullYear();
    const m   = now.getUTCMonth();
    const start = new Date(Date.UTC(y, m, 1, 0, 0, 0, 0));
    // End = end of today: data only exists up to now within the current month
    const end   = new Date(Date.UTC(y, m, now.getUTCDate(), 23, 59, 59, 999));

    const days = await buildDailySeries(start, end);
    const monthTotal = Number(days.reduce((s, d) => s + d.total, 0).toFixed(2));
    const monthLabel = `${y}-${String(m + 1).padStart(2, '0')}`;

    res.json({ month: monthLabel, monthTotal, days });
  } catch (err) {
    console.error('[reports] getMonthlySales:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
} // -NUEVOv6
