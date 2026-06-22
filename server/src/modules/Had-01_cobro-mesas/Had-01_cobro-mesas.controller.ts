import fs from 'fs';
import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../../lib/prisma';
import { broadcastTablesUpdate } from '../Hme-01_mapa-mesas/Hme-01_mapa-mesas.controller';
import { generateReceiptPdf } from '../../shared/services/pdf.service';
import { formatTableLabel } from '../../shared/utils/table-label';

const RESTAURANT_NAME = 'Cevichería Belsy';

const processPaymentSchema = z.object({
  receivedAmount: z.number().positive('El monto recibido debe ser positivo'),
  orderItemIds: z.array(z.string()).min(1, 'Seleccione al menos un ítem a cobrar'),
  documentType: z.enum(['BOLETA', 'FACTURA']),
  customerDocument: z.string().optional(),
  customerName: z.string().optional(),
  isPartial: z.boolean().optional().default(false),
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

const UNPAID_STATUSES = ['PENDING', 'IN_PROGRESS', 'READY', 'DELIVERED'] as const;

type ActiveOrder = Awaited<ReturnType<typeof fetchActiveOrders>>[number];
type ActiveOrderItem = ActiveOrder['items'][number];
type OrdersWithItems = Array<{ items: ActiveOrderItem[]; total: ActiveOrder['total'] }>;

async function fetchActiveOrders(tableId: number) {
  return prisma.order.findMany({
    where: { tableId, status: { in: [...UNPAID_STATUSES] } },
    include: {
      items: {
        include: { menuItem: { select: { name: true } } },
        orderBy: { createdAt: 'asc' },
      },
      table: { select: { number: true } },
    },
    orderBy: { createdAt: 'asc' },
  });
}

async function fetchActiveTakeawayOrders() {
  return prisma.order.findMany({
    where: { isTakeaway: true, tableId: null, status: { in: [...UNPAID_STATUSES] } },
    include: {
      items: {
        include: { menuItem: { select: { name: true } } },
        orderBy: { createdAt: 'asc' },
      },
    },
    orderBy: { createdAt: 'asc' },
  });
}

function getUnpaidItems(orders: OrdersWithItems): ActiveOrderItem[] {
  return orders.flatMap((order) => order.items.filter((item) => item.paidAt === null));
}

function calculatePaidAmount(orders: OrdersWithItems): number {
  return orders
    .flatMap((order) => order.items)
    .filter((item) => item.paidAt !== null)
    .reduce((sum, item) => sum + Number(item.subtotal), 0);
}

function calculateRemainingBalance(orders: OrdersWithItems): number {
  return getUnpaidItems(orders).reduce((sum, item) => sum + Number(item.subtotal), 0);
}

function formatOrder(order: ActiveOrder) {
  return {
    id: order.id,
    code: order.code,
    status: order.status,
    isTakeaway: order.isTakeaway,
    notes: order.notes,
    total: Number(order.total),
    createdAt: order.createdAt,
    items: order.items.map((item) => ({
      id: item.id,
      name: item.menuItem.name,
      quantity: item.quantity,
      unitPrice: Number(item.unitPrice),
      subtotal: Number(item.subtotal),
      isTakeaway: item.isTakeaway,
      isPaid: item.paidAt !== null,
    })),
  };
}

function validateDocumentData(
  documentType: 'BOLETA' | 'FACTURA',
  customerDocument?: string,
  customerName?: string,
): string | null {
  const doc = (customerDocument ?? '').trim();
  if (documentType === 'BOLETA') {
    if (!/^\d{8}$/.test(doc)) return 'Ingrese un DNI válido de 8 dígitos para la boleta';
    return null;
  }
  if (!/^\d{11}$/.test(doc)) return 'Ingrese un RUC válido de 11 dígitos para la factura';
  if (!(customerName ?? '').trim()) return 'Ingrese la razón social para la factura';
  return null;
}

// ─── GET /api/payments/summary ─────────────────────────────────────────────────

export async function getPaymentTablesSummary(_req: Request, res: Response): Promise<void> {
  try {
    const tables = await prisma.diningTable.findMany({
      orderBy: { number: 'asc' },
      include: {
        mergedInto: { select: { number: true } },
        mergedSources: { select: { number: true }, orderBy: { number: 'asc' } },
      },
    });
    const tableSummaries = await Promise.all(
      tables.map(async (table) => {
        const mergedSourceNumbers = table.mergedSources.map((s) => s.number);
        const activeOrders = await fetchActiveOrders(table.id);
        if (activeOrders.length === 0) {
          return {
            id: table.id,
            number: table.number,
            status: table.status,
            mergedIntoNumber: table.mergedInto?.number ?? null,
            mergedSourceNumbers,
            hasActiveOrders: false,
            grandTotal: 0,
            paidAmount: 0,
            remainingBalance: 0,
          };
        }
        const grandTotal = activeOrders.reduce((sum, o) => sum + Number(o.total), 0);
        const paidAmount = calculatePaidAmount(activeOrders);
        const remainingBalance = calculateRemainingBalance(activeOrders);
        return {
          id: table.id,
          number: table.number,
          status: table.status,
          mergedIntoNumber: table.mergedInto?.number ?? null,
          mergedSourceNumbers,
          hasActiveOrders: true,
          grandTotal,
          paidAmount,
          remainingBalance,
        };
      }),
    );

    // Cada pedido para llevar se cobra POR SEPARADO: se devuelve la lista de
    // pedidos para llevar activos, etiquetados "Pedido para llevar N" (ordenados
    // por fecha de creación), cada uno con su propio saldo.
    const takeawayOrders = await fetchActiveTakeawayOrders();
    const takeawayList = takeawayOrders.map((order, index) => ({
      id: order.id,
      label: `Pedido para llevar ${index + 1}`,
      code: order.code,
      createdAt: order.createdAt,
      grandTotal: Number(order.total),
      paidAmount: calculatePaidAmount([order]),
      remainingBalance: calculateRemainingBalance([order]),
    }));

    // Totales agregados (compatibilidad y métricas globales).
    const takeaway = {
      hasActiveOrders: takeawayList.length > 0,
      orderCount: takeawayList.length,
      grandTotal: takeawayList.reduce((s, t) => s + t.grandTotal, 0),
      paidAmount: takeawayList.reduce((s, t) => s + t.paidAmount, 0),
      remainingBalance: takeawayList.reduce((s, t) => s + t.remainingBalance, 0),
    };

    res.json({ tables: tableSummaries, takeaway, takeawayOrders: takeawayList });
  } catch {
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}

// ─── GET /api/payments/receipt/:paymentId ─────────────────────────────────────

export async function downloadReceipt(req: Request, res: Response): Promise<void> {
  try {
    const paymentId = req.params['paymentId'] as string;
    const payment = await prisma.payment.findUnique({ where: { id: paymentId } });
    if (!payment?.pdfPath || !fs.existsSync(payment.pdfPath)) {
      res.status(404).json({ error: 'Comprobante no encontrado' });
      return;
    }
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="comprobante-${paymentId}.pdf"`);
    fs.createReadStream(payment.pdfPath).pipe(res);
  } catch {
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}

// ─── GET /api/payments/tables/:tableId/bill ────────────────────────────────────

export async function getTableBill(req: Request, res: Response): Promise<void> {
  try {
    const tableId = parseInt(req.params['tableId'] as string, 10);
    if (isNaN(tableId)) {
      res.status(400).json({ error: 'ID de mesa inválido' });
      return;
    }

    const table = await prisma.diningTable.findUnique({
      where: { id: tableId },
      include: { mergedSources: { select: { number: true }, orderBy: { number: 'asc' } } },
    });
    if (!table) {
      res.status(404).json({ error: 'Mesa no encontrada' });
      return;
    }

    const activeOrders = await fetchActiveOrders(tableId);
    if (activeOrders.length === 0) {
      res.status(404).json({ error: 'No hay pedidos activos en esta mesa' });
      return;
    }

    const grandTotal = activeOrders.reduce((sum, o) => sum + Number(o.total), 0);
    const paidAmount = calculatePaidAmount(activeOrders);
    const remainingBalance = calculateRemainingBalance(activeOrders);

    res.json({
      tableNumber: table.number,
      tableLabel: formatTableLabel(table),
      tableId: table.id,
      isTakeaway: false,
      orders: activeOrders.map(formatOrder),
      grandTotal,
      paidAmount,
      remainingBalance,
    });
  } catch {
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}

// ─── GET /api/payments/takeaway/bill ──────────────────────────────────────────

export async function getTakeawayBill(_req: Request, res: Response): Promise<void> {
  try {
    const activeOrders = await fetchActiveTakeawayOrders();
    if (activeOrders.length === 0) {
      res.status(404).json({ error: 'No hay pedidos para llevar activos' });
      return;
    }

    const grandTotal = activeOrders.reduce((sum, o) => sum + Number(o.total), 0);
    const paidAmount = calculatePaidAmount(activeOrders);
    const remainingBalance = calculateRemainingBalance(activeOrders);

    res.json({
      tableNumber: null,
      tableId: null,
      isTakeaway: true,
      orders: activeOrders.map((o) => formatOrder(o as ActiveOrder)),
      grandTotal,
      paidAmount,
      remainingBalance,
    });
  } catch {
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}

// ─── GET /api/payments/takeaway/:orderId/bill ─────────────────────────────────
// Cuenta de UN único pedido para llevar (cada pedido se cobra por separado).
export async function getTakeawayOrderBill(req: Request, res: Response): Promise<void> {
  try {
    const orderId = req.params['orderId'] as string;
    const activeOrders = await fetchActiveTakeawayOrders();
    const index = activeOrders.findIndex((o) => o.id === orderId);
    if (index === -1) {
      res.status(404).json({ error: 'Pedido para llevar no encontrado o ya cobrado' });
      return;
    }
    const order = activeOrders[index]!;

    res.json({
      tableNumber: null,
      tableId: null,
      isTakeaway: true,
      takeawayOrderId: order.id,
      takeawayLabel: `Pedido para llevar ${index + 1}`,
      orders: [formatOrder(order as ActiveOrder)],
      grandTotal: Number(order.total),
      paidAmount: calculatePaidAmount([order]),
      remainingBalance: calculateRemainingBalance([order]),
    });
  } catch {
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}

// ─── Core payment logic (shared between table and takeaway) ───────────────────

async function executePayment(
  req: Request,
  res: Response,
  tableId: number | null,
  isTakeaway: boolean,
  activeOrders: ActiveOrder[],
  tableNumber: number | null,
): Promise<void> {
  const parsed = processPaymentSchema.safeParse(req.body);
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    res.status(400).json({ error: firstIssue?.message ?? 'Datos de pago inválidos' });
    return;
  }
  const {
    receivedAmount,
    orderItemIds,
    documentType,
    customerDocument,
    customerName,
    isPartial,
  } = parsed.data;

  const docError = validateDocumentData(documentType, customerDocument, customerName);
  if (docError) {
    res.status(400).json({ error: docError });
    return;
  }

  const unpaidItems = getUnpaidItems(activeOrders);
  const unpaidById = new Map(unpaidItems.map((item) => [item.id, item]));
  const selectedItems = orderItemIds.map((id) => unpaidById.get(id)).filter(Boolean) as ActiveOrderItem[];

  if (selectedItems.length !== orderItemIds.length) {
    res.status(400).json({ error: 'Uno o más ítems seleccionados no están disponibles para cobro' });
    return;
  }

  const amount = selectedItems.reduce((sum, item) => sum + Number(item.subtotal), 0);
  if (amount <= 0) {
    res.status(400).json({ error: 'Seleccione al menos un ítem con monto pendiente' });
    return;
  }

  if (receivedAmount < amount - 0.001) {
    res.status(400).json({ error: 'El monto recibido es menor al monto a pagar' });
    return;
  }

  const changeAmount = Math.max(0, receivedAmount - amount);
  const remainingBefore = calculateRemainingBalance(activeOrders);
  const isFullyPaid = Math.abs(amount - remainingBefore) < 0.001;
  const paymentMode = isPartial && !isFullyPaid ? 'PARTIAL' : 'FULL';

  const payment = await prisma.payment.create({
    data: {
      tableId,
      receivedById: req.user!.userId,
      amount,
      receivedAmount,
      changeAmount,
      method: 'CASH',
      mode: paymentMode,
      documentType,
      customerDocument: customerDocument ?? null,
      customerName: customerName ?? null,
      isTakeaway,
    },
  });

  const paidAt = new Date();
  await prisma.orderItem.updateMany({
    where: { id: { in: selectedItems.map((item) => item.id) } },
    data: { paidAt },
  });

  if (isFullyPaid) {
    // Marcar como PAID únicamente los pedidos que se están cobrando en esta
    // operación (los recibidos en activeOrders). Para mesa son todos los pedidos
    // de la mesa; para llevar es solo el pedido individual seleccionado.
    await prisma.order.updateMany({
      where: { id: { in: activeOrders.map((o) => o.id) }, status: { in: [...UNPAID_STATUSES] } },
      data: { status: 'PAID', paidAt },
    });

    if (!isTakeaway && tableId !== null) {
      // Table moves to PAID (awaiting manual release by admin) instead of freeing automatically
      await prisma.diningTable.update({
        where: { id: tableId },
        data: { status: 'PAID' },
      });
    }

    await broadcastTablesUpdate();
  }

  const receiptItems = selectedItems.map((item) => ({
    name: item.menuItem.name,
    quantity: item.quantity,
    unitPrice: Number(item.unitPrice),
    subtotal: Number(item.subtotal),
    isTakeaway: item.isTakeaway,
  }));

  let pdfPath: string | null = null;
  try {
    pdfPath = await generateReceiptPdf({
      receiptId: payment.id,
      tableNumber,
      isTakeaway,
      documentType,
      customerDocument: customerDocument ?? null,
      customerName: customerName ?? null,
      items: receiptItems,
      grandTotal: amount,
      amountPaid: receivedAmount,
      changeAmount,
      createdAt: paidAt,
    });

    await prisma.payment.update({ where: { id: payment.id }, data: { pdfPath } });

  } catch (pdfErr) {
    console.error('[pdf-service]', pdfErr);
  }

  const paidAmount = calculatePaidAmount(activeOrders) + amount;
  const remainingBalance = Math.max(0, remainingBefore - amount);

  res.status(201).json({
    payment: { id: payment.id, amount, receivedAmount, changeAmount, mode: payment.mode },
    isFullyPaid,
    paidAmount,
    remainingBalance,
    pdfPath,
  });
}

// ─── POST /api/payments/tables/:tableId ───────────────────────────────────────

export async function processTablePayment(req: Request, res: Response): Promise<void> {
  try {
    const tableId = parseInt(req.params['tableId'] as string, 10);
    if (isNaN(tableId)) {
      res.status(400).json({ error: 'ID de mesa inválido' });
      return;
    }

    const table = await prisma.diningTable.findUnique({ where: { id: tableId } });
    if (!table) {
      res.status(404).json({ error: 'Mesa no encontrada' });
      return;
    }

    const activeOrders = await fetchActiveOrders(tableId);
    if (activeOrders.length === 0) {
      res.status(404).json({ error: 'No hay pedidos activos en esta mesa' });
      return;
    }

    await executePayment(req, res, tableId, false, activeOrders, table.number);
  } catch (err) {
    console.error('[payment-controller]', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}

// ─── POST /api/payments/takeaway ──────────────────────────────────────────────

export async function processTakeawayPayment(req: Request, res: Response): Promise<void> {
  try {
    const activeOrders = await fetchActiveTakeawayOrders();
    if (activeOrders.length === 0) {
      res.status(404).json({ error: 'No hay pedidos para llevar activos' });
      return;
    }

    await executePayment(req, res, null, true, activeOrders as ActiveOrder[], null);
  } catch (err) {
    console.error('[payment-controller]', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}

// ─── POST /api/payments/takeaway/:orderId ─────────────────────────────────────
// Cobra UN único pedido para llevar de forma independiente.
export async function processTakeawayOrderPayment(req: Request, res: Response): Promise<void> {
  try {
    const orderId = req.params['orderId'] as string;
    const activeOrders = await fetchActiveTakeawayOrders();
    const order = activeOrders.find((o) => o.id === orderId);
    if (!order) {
      res.status(404).json({ error: 'Pedido para llevar no encontrado o ya cobrado' });
      return;
    }
    await executePayment(req, res, null, true, [order] as ActiveOrder[], null);
  } catch (err) {
    console.error('[payment-controller]', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}

// ─── PATCH /api/payments/tables/:tableId/release ──────────────────────────────
// Admin releases a fully-paid table (PAID → FREE), notifying mesero in real time
export async function releaseTable(req: Request, res: Response): Promise<void> {
  try {
    const tableId = parseInt(req.params['tableId'] as string, 10);
    if (isNaN(tableId)) {
      res.status(400).json({ error: 'ID de mesa inválido' });
      return;
    }

    const table = await prisma.diningTable.findUnique({ where: { id: tableId } });
    if (!table) {
      res.status(404).json({ error: 'Mesa no encontrada' });
      return;
    }
    if (table.status !== 'PAID') {
      res.status(400).json({ error: 'Solo se pueden liberar mesas totalmente cobradas' });
      return;
    }

    await prisma.diningTable.update({ where: { id: tableId }, data: { status: 'FREE' } });
    // Release all tables that were merged into this one
    await prisma.diningTable.updateMany({
      where: { mergedIntoId: tableId },
      data: { status: 'FREE', mergedIntoId: null },
    });
    await broadcastTablesUpdate();

    res.json({ ok: true, tableId, tableNumber: table.number });
  } catch {
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}
