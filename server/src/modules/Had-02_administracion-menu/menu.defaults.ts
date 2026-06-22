import type { PrismaClient } from '../../generated/prisma/client';

export type DefaultMenuCategory = {
  name: string;
  sortOrder: number;
  items: DefaultMenuItem[];
};

export type DefaultMenuItem = {
  name: string;
  price: number;
  description: string;
  isPreparable: boolean;
};

export const DEFAULT_MENU: DefaultMenuCategory[] = [
  {
    name: 'Entradas',
    sortOrder: 1,
    items: [
      { name: 'Leche de Tigre', price: 18, description: 'Caldo marinado con ají, limón y mariscos frescos', isPreparable: true },
      { name: 'Chicharrón de Calamar', price: 28, description: 'Aros de calamar fritos y crujientes con salsa tártara', isPreparable: true },
      { name: 'Choritos a la Chalaca', price: 22, description: 'Mejillones con salsa criolla de tomate y choclo', isPreparable: true },
      { name: 'Causa Rellena de Cangrejo', price: 25, description: 'Papa amarilla con ají, rellena de cangrejo y palta', isPreparable: true },
      { name: 'Conchitas a la Parmesana', price: 32, description: 'Conchitas de abanico gratinadas con queso parmesano', isPreparable: true },
      { name: 'Tequeños Rellenos de Mariscos', price: 20, description: 'Tequeños rellenos de mariscos y queso crema', isPreparable: true },
    ],
  },
  {
    name: 'Platos de Fondo',
    sortOrder: 2,
    items: [
      { name: 'Ceviche', price: 32, description: 'Pescado y mariscos en leche de tigre con camote y choclo', isPreparable: true },
      { name: 'Arroz con Mariscos', price: 38, description: 'Arroz cremoso con mezcla de mariscos frescos', isPreparable: true },
      { name: 'Chicharrón de Pescado', price: 30, description: 'Trozos de pescado fritos con yuca y salsa criolla', isPreparable: true },
      { name: 'Sudado', price: 42, description: 'Caldo marinado con pescado, mariscos y chicha de jora', isPreparable: true },
      { name: 'Arroz Chaufa de Mariscos', price: 36, description: 'Arroz salteado al wok con mariscos y sillao', isPreparable: true },
      { name: 'Parihuela', price: 45, description: 'Sopa de mariscos con pan de yema y aliños criollos', isPreparable: true },
      { name: 'Chupe de Camarones', price: 48, description: 'Chowder espeso de camarones con arroz y crema', isPreparable: true },
      { name: 'Pescado Frito', price: 28, description: 'Filete entero de pescado frito con guarnición criolla', isPreparable: true },
    ],
  },
  {
    name: 'Bebidas',
    sortOrder: 3,
    items: [
      { name: 'Chicha en Jarra 1L', price: 12, description: 'Bebida tradicional de maíz morado, natural y sin azúcar', isPreparable: false },
      { name: 'Limonada en Jarra 1L', price: 12, description: 'Limonada fresca de limón sutil con hierbabuena', isPreparable: false },
      { name: 'Maracuyá en Jarra 1L', price: 12, description: 'Refresco natural de maracuyá sin preservantes', isPreparable: false },
      { name: 'Agua Mineral 500ml', price: 5, description: 'Agua mineral sin gas', isPreparable: false },
      { name: 'Inca Kola 500ml', price: 6, description: 'Gaseosa amarilla peruana', isPreparable: false },
      { name: 'Coca Cola 500ml', price: 6, description: 'Gaseosa clásica', isPreparable: false },
      { name: 'Cerveza Cusqueña', price: 10, description: 'Cerveza rubia premium peruana 620ml', isPreparable: false },
    ],
  },
];

export async function seedDefaultMenu(prisma: PrismaClient): Promise<void> {
  for (const categorySeed of DEFAULT_MENU) {
    const category = await prisma.category.upsert({
      where: { name: categorySeed.name },
      update: { sortOrder: categorySeed.sortOrder, isActive: true },
      create: { name: categorySeed.name, sortOrder: categorySeed.sortOrder, isActive: true },
    });

    for (const itemSeed of categorySeed.items) {
      await prisma.menuItem.upsert({
        where: { name: itemSeed.name },
        update: {
          price: itemSeed.price,
          description: itemSeed.description,
          isPreparable: itemSeed.isPreparable,
          categoryId: category.id,
        },
        create: {
          name: itemSeed.name,
          price: itemSeed.price,
          description: itemSeed.description,
          isPreparable: itemSeed.isPreparable,
          stockStatus: 'AVAILABLE',
          categoryId: category.id,
        },
      });
    }
  }
}

export async function ensureDefaultMenu(prisma: PrismaClient): Promise<void> {
  const categoryCount = await prisma.category.count();
  if (categoryCount === 0) {
    await seedDefaultMenu(prisma);
  }
}
