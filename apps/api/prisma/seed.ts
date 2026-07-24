import { PrismaClient } from '@prisma/client';
import { DEFAULT_EQUIPMENT, DEFAULT_LABOUR, DEFAULT_MATERIALS } from '@boq/engine';

const prisma = new PrismaClient();

async function main() {
  for (const m of DEFAULT_MATERIALS) {
    await prisma.material.upsert({
      where: { id: m.id },
      create: {
        id: m.id,
        name: m.name,
        description: m.description,
        category: m.category,
        unit: m.unit,
        defaultRate: m.defaultRate,
        consumptionNote: m.consumptionNote,
      },
      update: {
        name: m.name,
        description: m.description,
        category: m.category,
        unit: m.unit,
        defaultRate: m.defaultRate,
        consumptionNote: m.consumptionNote,
      },
    });
  }

  for (const l of DEFAULT_LABOUR) {
    await prisma.labour.upsert({
      where: { id: l.id },
      create: {
        id: l.id,
        name: l.name,
        description: l.description,
        unit: l.unit,
        defaultRate: l.defaultRate,
      },
      update: {
        name: l.name,
        description: l.description,
        unit: l.unit,
        defaultRate: l.defaultRate,
      },
    });
  }

  for (const e of DEFAULT_EQUIPMENT) {
    await prisma.equipment.upsert({
      where: { id: e.id },
      create: {
        id: e.id,
        name: e.name,
        description: e.description,
        unit: e.unit,
        defaultRate: e.defaultRate,
      },
      update: {
        name: e.name,
        description: e.description,
        unit: e.unit,
        defaultRate: e.defaultRate,
      },
    });
  }

  console.log('Seeded Pakistan cost database.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
