import fs from 'fs';
import path from 'path';

/* Rutas de almacenamiento de archivos en disco (imágenes de platos y PDFs/Excel
   de comprobantes). Son configurables por variable de entorno para poder apuntar
   a un Volume persistente en producción (Railway), de modo que NO se borren en
   cada redeploy.

   Producción (Railway con Volume montado en /data):
     UPLOADS_DIR=/data/uploads
     RECEIPTS_DIR=/data/receipts

   Si no se definen, usan las carpetas por defecto dentro de server/ (igual que antes). */

// Raíz del backend (server/), tanto con ts-node (src) como compilado (dist).
// __dirname = server/src/shared/config (dev) | server/dist/shared/config (build)
const SERVER_ROOT = path.join(__dirname, '..', '..', '..');

export const UPLOADS_DIR = process.env.UPLOADS_DIR
  ? path.resolve(process.env.UPLOADS_DIR)
  : path.join(SERVER_ROOT, 'uploads');

export const RECEIPTS_DIR = process.env.RECEIPTS_DIR
  ? path.resolve(process.env.RECEIPTS_DIR)
  : path.join(SERVER_ROOT, 'receipts');

// Garantiza que las carpetas existan al arrancar (necesario en un Volume nuevo).
fs.mkdirSync(UPLOADS_DIR, { recursive: true });
fs.mkdirSync(RECEIPTS_DIR, { recursive: true });
