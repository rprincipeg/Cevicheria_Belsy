import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const ENTRADAS = [
  'Leche de Tigre',
  'Chicharrón de Calamar',
  'Choritos a la Chalaca',
  'Causa Rellena de Cangrejo',
  'Conchitas a la Parmesana',
  'Tequeños Rellenos de Mariscos',
  'Pulpo al Olivo',
  'Tiradito de Pescado',
  'Yuquitas Fritas con Salsa Huancaína',
];

const FONDOS = [
  'Ceviche',
  'Arroz con Mariscos',
  'Chicharrón de Pescado',
  'Sudado',
  'Arroz Chaufa de Mariscos',
  'Parihuela',
  'Chupe de Camarones',
  'Pescado Frito',
];

const BEBIDAS = [
  'Chicha en Jarra 1L',
  'Limonada en Jarra 1L',
  'Maracuyá en Jarra 1L',
  'Agua Mineral 500ml',
  'Inca Kola 500ml',
  'Coca Cola 500ml',
  'Cerveza Cusqueña',
];

async function upsertCategory(name: string, sortOrder: number) {
  return prisma.category.upsert({
    where: { name },
    update: {},
    create: { name, sortOrder, isActive: true },
  });
}

async function upsertMenuItem(name: string, categoryId: string) {
  return prisma.menuItem.upsert({
    where: { name },
    update: {},
    create: {
      name,
      price: 0.0,
      stockStatus: 'AVAILABLE',
      categoryId,
    },
  });
}

async function main() {
  console.log('Seeding database...');

  const entradas = await upsertCategory('Entradas', 1);
  const fondos = await upsertCategory('Platos de Fondo', 2);
  const bebidas = await upsertCategory('Bebidas', 3);

  for (const name of ENTRADAS) await upsertMenuItem(name, entradas.id);
  for (const name of FONDOS) await upsertMenuItem(name, fondos.id);
  for (const name of BEBIDAS) await upsertMenuItem(name, bebidas.id);

  const passwordHash = await bcrypt.hash('admin123', 10);
  await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      passwordHash,
      role: 'ADMIN',
      status: 'ACTIVE',
    },
  });

  console.log('Seed completed.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
