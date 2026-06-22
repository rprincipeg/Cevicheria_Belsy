import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { RECEIPTS_DIR } from '../config/storage';

export interface ReceiptItem {
  name: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  isTakeaway: boolean;
}

export interface ReceiptData {
  receiptId: string;
  tableNumber: number | null;
  isTakeaway: boolean;
  documentType: string;
  customerDocument: string | null;
  customerName: string | null;
  items: ReceiptItem[];
  grandTotal: number;
  amountPaid: number;
  changeAmount: number;
  createdAt: Date;
}

const RESTAURANT_NAME = 'Cevichería Belsy';
const RESTAURANT_SUBTITLE = 'Restaurante de Mariscos';

export async function generateReceiptPdf(data: ReceiptData): Promise<string> {
  const dateStr = data.createdAt.toISOString().split('T')[0];
  const storageDir = path.join(RECEIPTS_DIR, dateStr as string);
  fs.mkdirSync(storageDir, { recursive: true });

  const filePath = path.join(storageDir, `${data.receiptId}.pdf`);

  await new Promise<void>((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A5', margin: 40 });
    const stream = fs.createWriteStream(filePath);
    doc.pipe(stream);

    // ── Header ──────────────────────────────────────────────
    doc.fontSize(18).font('Helvetica-Bold').text(RESTAURANT_NAME, { align: 'center' });
    doc.fontSize(10).font('Helvetica').text(RESTAURANT_SUBTITLE, { align: 'center' });
    doc.moveDown(0.5);

    const docLabel = data.documentType === 'FACTURA' ? 'FACTURA DE VENTA' : 'BOLETA DE VENTA';
    doc.fontSize(13).font('Helvetica-Bold').text(docLabel, { align: 'center' });
    doc.moveDown(0.5);

    // ── Info block ───────────────────────────────────────────
    const dtStr = data.createdAt.toLocaleString('es-PE', { timeZone: 'America/Lima' });
    doc.fontSize(9).font('Helvetica');
    doc.text(`Fecha: ${dtStr}`);
    doc.text(data.isTakeaway ? 'Modalidad: Para Llevar' : `Mesa: ${data.tableNumber}`);
    if (data.customerName) doc.text(`Cliente: ${data.customerName}`);
    if (data.customerDocument) {
      const idLabel = data.documentType === 'FACTURA' ? 'RUC' : 'DNI';
      doc.text(`${idLabel}: ${data.customerDocument}`);
    }
    doc.moveDown(0.5);

    // ── Items table header ───────────────────────────────────
    const col = { desc: 40, qty: 220, price: 265, sub: 320 };
    doc.fontSize(9).font('Helvetica-Bold');
    const headerY = doc.y;
    doc.text('Descripción', col.desc, headerY, { width: 175 });
    doc.text('Cant.', col.qty, headerY, { width: 40, align: 'right' });
    doc.text('P.Unit', col.price, headerY, { width: 50, align: 'right' });
    doc.text('Subtotal', col.sub, headerY, { width: 60, align: 'right' });

    doc.moveTo(40, doc.y + 2).lineTo(390, doc.y + 2).lineWidth(0.5).stroke();
    doc.moveDown(0.4);

    // ── Items rows ───────────────────────────────────────────
    doc.fontSize(9).font('Helvetica');
    for (const item of data.items) {
      const rowY = doc.y;
      const label = item.name + (item.isTakeaway ? ' (llevar)' : '');
      doc.text(label, col.desc, rowY, { width: 175 });
      doc.text(String(item.quantity), col.qty, rowY, { width: 40, align: 'right' });
      doc.text(`S/ ${item.unitPrice.toFixed(2)}`, col.price, rowY, { width: 50, align: 'right' });
      doc.text(`S/ ${item.subtotal.toFixed(2)}`, col.sub, rowY, { width: 60, align: 'right' });
      doc.moveDown(0.1);
    }

    doc.moveTo(40, doc.y + 2).lineTo(390, doc.y + 2).lineWidth(0.5).stroke();
    doc.moveDown(0.5);

    // ── Totals ───────────────────────────────────────────────
    doc.fontSize(10).font('Helvetica-Bold');
    doc.text(`Total a pagar: S/ ${data.grandTotal.toFixed(2)}`, { align: 'right' });
    doc.fontSize(9).font('Helvetica');
    doc.text(`Monto recibido: S/ ${data.amountPaid.toFixed(2)}`, { align: 'right' });
    doc.text(`Vuelto: S/ ${data.changeAmount.toFixed(2)}`, { align: 'right' });

    doc.moveDown(1);
    doc.fontSize(10).font('Helvetica').text('¡Gracias por su visita!', { align: 'center' });

    doc.end();
    stream.on('finish', resolve);
    stream.on('error', reject);
  });

  return filePath;
}
