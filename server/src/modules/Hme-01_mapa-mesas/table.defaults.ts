import { PrismaClient } from '../../generated/prisma/client';

export async function seedDefaultTables(prisma: PrismaClient): Promise<void> {
  for (let i = 1; i <= 10; i++) {
    await prisma.diningTable.upsert({
      where: { number: i },
      update: {},
      create: { number: i, status: 'FREE' },
    });
  }
}

export async function ensureDefaultTables(prisma: PrismaClient): Promise<void> {
  const tableCount = await prisma.diningTable.count();
  if (tableCount === 0) {
    await seedDefaultTables(prisma);
  }
}
