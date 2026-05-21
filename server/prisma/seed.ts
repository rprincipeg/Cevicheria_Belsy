import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const ENTRADAS: { name: string; price: number; description: string }[] = [
  { name: 'Leche de Tigre',                  price: 18, description: 'Caldo marinado con ají, limón y mariscos frescos' },
  { name: 'Chicharrón de Calamar',            price: 28, description: 'Aros de calamar fritos y crujientes con salsa tártara' },
  { name: 'Choritos a la Chalaca',            price: 22, description: 'Mejillones con salsa criolla de tomate y choclo' },
  { name: 'Causa Rellena de Cangrejo',        price: 25, description: 'Papa amarilla con ají, rellena de cangrejo y palta' },
  { name: 'Conchitas a la Parmesana',         price: 32, description: 'Conchitas de abanico gratinadas con queso parmesano' },
  { name: 'Tequeños Rellenos de Mariscos',    price: 20, description: 'Tequeños rellenos de mariscos y queso crema' },
  { name: 'Pulpo al Olivo',                   price: 35, description: 'Pulpo cocido en salsa de aceituna negra y mayonesa' },
  { name: 'Tiradito de Pescado',              price: 28, description: 'Láminas de pescado en crema de ají amarillo' },
  { name: 'Yuquitas Fritas con Salsa Huancaína', price: 15, description: 'Yuca frita dorada con salsa de queso y ají amarillo' },
];

const FONDOS: { name: string; price: number; description: string }[] = [
  { name: 'Ceviche',                  price: 32, description: 'Pescado y mariscos en leche de tigre con camote y choclo' },
  { name: 'Arroz con Mariscos',       price: 38, description: 'Arroz cremoso con mezcla de mariscos frescos' },
  { name: 'Chicharrón de Pescado',    price: 30, description: 'Trozos de pescado fritos con yuca y salsa criolla' },
  { name: 'Sudado',                   price: 42, description: 'Caldo marinado con pescado, mariscos y chicha de jora' },
  { name: 'Arroz Chaufa de Mariscos', price: 36, description: 'Arroz salteado al wok con mariscos y sillao' },
  { name: 'Parihuela',                price: 45, description: 'Sopa de mariscos con pan de yema y aliños criollos' },
  { name: 'Chupe de Camarones',       price: 48, description: 'Chowder espeso de camarones con arroz y crema' },
  { name: 'Pescado Frito',            price: 28, description: 'Filete entero de pescado frito con guarnición criolla' },
];

const BEBIDAS: { name: string; price: number; description: string }[] = [
  { name: 'Chicha en Jarra 1L',    price: 12, description: 'Bebida tradicional de maíz morado, natural y sin azúcar' },
  { name: 'Limonada en Jarra 1L',  price: 12, description: 'Limonada fresca de limón sutil con hierbabuena' },
  { name: 'Maracuyá en Jarra 1L',  price: 12, description: 'Refresco natural de maracuyá sin preservantes' },
  { name: 'Agua Mineral 500ml',     price:  5, description: 'Agua mineral sin gas' },
  { name: 'Inca Kola 500ml',        price:  6, description: 'Gaseosa amarilla peruana' },
  { name: 'Coca Cola 500ml',        price:  6, description: 'Gaseosa clásica' },
  { name: 'Cerveza Cusqueña',       price: 10, description: 'Cerveza rubia premium peruana 620ml' },
];

async function upsertCategory(name: string, sortOrder: number) {
  return prisma.category.upsert({
    where: { name },
    update: {},
    create: { name, sortOrder, isActive: true },
  });
}

async function upsertMenuItem(
  name: string,
  categoryId: string,
  price: number,
  description: string,
  isPreparable: boolean,
) {
  return prisma.menuItem.upsert({
    where: { name },
    update: { price, description, isPreparable, categoryId },
    create: { name, price, description, isPreparable, stockStatus: 'AVAILABLE', categoryId },
  });
}

async function upsertUser(username: string, password: string, role: 'ADMIN' | 'MESERO' | 'COCINERO') {
  const passwordHash = await bcrypt.hash(password, 10);
  return prisma.user.upsert({
    where: { username },
    update: { passwordHash, role, status: 'ACTIVE' },
    create: { username, passwordHash, role, status: 'ACTIVE' },
  });
}

async function main() {
  console.log('Seeding database...');

  const entradas = await upsertCategory('Entradas', 1);
  const fondos   = await upsertCategory('Platos de Fondo', 2);
  const bebidas  = await upsertCategory('Bebidas', 3);

  for (const item of ENTRADAS) await upsertMenuItem(item.name, entradas.id, item.price, item.description, true);
  for (const item of FONDOS)   await upsertMenuItem(item.name, fondos.id,   item.price, item.description, true);
  for (const item of BEBIDAS)  await upsertMenuItem(item.name, bebidas.id,  item.price, item.description, false);

  await upsertUser('admin',    '12345', 'ADMIN');
  await upsertUser('cocinero', '12345', 'COCINERO');
  await upsertUser('mesero',   '12345', 'MESERO');
  await upsertUser('mesero2',  '12345', 'MESERO');

  for (let i = 1; i <= 10; i++) {
    await prisma.diningTable.upsert({
      where: { number: i },
      update: {},
      create: { number: i, status: 'FREE' },
    });
  }

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
