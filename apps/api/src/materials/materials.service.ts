import { Injectable } from '@nestjs/common';
import {
  DEFAULT_EQUIPMENT,
  DEFAULT_LABOUR,
  DEFAULT_MATERIALS,
  MODULE_DEFINITIONS,
} from '@boq/engine';
import { PrismaService } from '../prisma.service';

@Injectable()
export class MaterialsService {
  constructor(private readonly prisma: PrismaService) {}

  async listMaterials(q?: string) {
    try {
      const rows = await this.prisma.material.findMany({
        where: q
          ? {
              OR: [
                { name: { contains: q, mode: 'insensitive' } },
                { category: { contains: q, mode: 'insensitive' } },
              ],
            }
          : undefined,
        orderBy: { name: 'asc' },
      });
      if (rows.length) {
        return rows.map((m) => ({
          id: m.id,
          name: m.name,
          description: m.description,
          category: m.category,
          unit: m.unit,
          defaultRate: m.defaultRate,
          rate: m.defaultRate,
          consumptionNote: m.consumptionNote ?? undefined,
        }));
      }
    } catch {
      /* fallback */
    }
    const all = DEFAULT_MATERIALS.map((m: (typeof DEFAULT_MATERIALS)[number]) => ({ ...m }));
    if (!q) return all;
    const s = q.toLowerCase();
    return all.filter(
      (m: (typeof DEFAULT_MATERIALS)[number]) =>
        m.name.toLowerCase().includes(s) || m.category.toLowerCase().includes(s),
    );
  }

  async listLabour() {
    try {
      const rows = await this.prisma.labour.findMany({ orderBy: { name: 'asc' } });
      if (rows.length) {
        return rows.map((l) => ({
          id: l.id,
          name: l.name,
          description: l.description,
          unit: l.unit,
          defaultRate: l.defaultRate,
          rate: l.defaultRate,
        }));
      }
    } catch {
      /* fallback */
    }
    return DEFAULT_LABOUR.map((l: (typeof DEFAULT_LABOUR)[number]) => ({ ...l }));
  }

  async listEquipment() {
    try {
      const rows = await this.prisma.equipment.findMany({ orderBy: { name: 'asc' } });
      if (rows.length) {
        return rows.map((e) => ({
          id: e.id,
          name: e.name,
          description: e.description,
          unit: e.unit,
          defaultRate: e.defaultRate,
          rate: e.defaultRate,
        }));
      }
    } catch {
      /* fallback */
    }
    return DEFAULT_EQUIPMENT.map((e: (typeof DEFAULT_EQUIPMENT)[number]) => ({ ...e }));
  }

  async fullDatabase() {
    const [materials, labour, equipment] = await Promise.all([
      this.listMaterials(),
      this.listLabour(),
      this.listEquipment(),
    ]);
    return { materials, labour, equipment, region: 'Pakistan' };
  }

  listModules() {
    return MODULE_DEFINITIONS;
  }
}
