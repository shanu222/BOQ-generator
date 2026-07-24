import type {
  EquipmentLine,
  LabourLine,
  MaterialLine,
  MaterialRate,
  LabourRate,
  EquipmentRate,
  MeasurementEntry,
  QuantityLine,
  BOQItem,
  Unit,
  MaterialCategory,
} from '@boq/shared';
import { round } from './constants';

let seq = 0;
export function uid(prefix = 'id'): string {
  seq += 1;
  return `${prefix}_${Date.now().toString(36)}_${seq}`;
}

export interface CalcContext {
  materials: MaterialRate[];
  labour: LabourRate[];
  equipment: EquipmentRate[];
}

export interface ModuleOutput {
  quantities: QuantityLine[];
  materials: Array<
    Omit<MaterialLine, 'id' | 'amount' | 'rate'> & {
      materialId: string;
      quantity: number;
    }
  >;
  labour: Array<{ labourId: string; quantity: number }>;
  equipment: Array<{ equipmentId: string; quantity: number }>;
  boq: Array<Omit<BOQItem, 'id' | 'itemNo' | 'rate' | 'amount' | 'editable'>>;
}

export function emptyOutput(): ModuleOutput {
  return {
    quantities: [],
    materials: [],
    labour: [],
    equipment: [],
    boq: [],
  };
}

export function qty(
  entry: MeasurementEntry,
  description: string,
  unit: Unit,
  quantity: number,
  category: string,
): QuantityLine {
  return {
    id: uid('qty'),
    moduleId: entry.moduleId,
    entryId: entry.id,
    description,
    unit,
    quantity: round(quantity),
    category,
  };
}

export function mat(
  materialId: string,
  name: string,
  category: MaterialCategory,
  unit: Unit,
  quantity: number,
  entryId: string,
): ModuleOutput['materials'][number] {
  return {
    materialId,
    name,
    category,
    unit,
    quantity: round(quantity, 4),
    sourceEntryIds: [entryId],
  };
}

export function resolveMaterial(
  ctx: CalcContext,
  id: string,
): MaterialRate | undefined {
  return ctx.materials.find((m) => m.id === id);
}

export function resolveLabour(ctx: CalcContext, id: string): LabourRate | undefined {
  return ctx.labour.find((l) => l.id === id);
}

export function resolveEquipment(
  ctx: CalcContext,
  id: string,
): EquipmentRate | undefined {
  return ctx.equipment.find((e) => e.id === id);
}

export function mergeMaterials(
  lines: ModuleOutput['materials'][],
  rates: MaterialRate[],
): MaterialLine[] {
  const map = new Map<string, MaterialLine>();
  for (const group of lines) {
    for (const line of group) {
      const rate = rates.find((r) => r.id === line.materialId)?.rate ?? 0;
      const existing = map.get(line.materialId);
      if (existing) {
        existing.quantity = round(existing.quantity + line.quantity, 4);
        existing.amount = round(existing.quantity * existing.rate, 2);
        existing.sourceEntryIds = [
          ...new Set([...existing.sourceEntryIds, ...line.sourceEntryIds]),
        ];
      } else {
        map.set(line.materialId, {
          id: uid('mat'),
          materialId: line.materialId,
          name: line.name,
          category: line.category,
          unit: line.unit,
          quantity: line.quantity,
          rate,
          amount: round(line.quantity * rate, 2),
          sourceEntryIds: [...line.sourceEntryIds],
        });
      }
    }
  }
  return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
}

export function mergeLabour(
  lines: ModuleOutput['labour'][],
  rates: LabourRate[],
): LabourLine[] {
  const map = new Map<string, LabourLine>();
  for (const group of lines) {
    for (const line of group) {
      const lr = rates.find((r) => r.id === line.labourId);
      if (!lr) continue;
      const existing = map.get(line.labourId);
      if (existing) {
        existing.quantity = round(existing.quantity + line.quantity, 4);
        existing.amount = round(existing.quantity * existing.rate, 2);
      } else {
        map.set(line.labourId, {
          id: uid('lab'),
          labourId: line.labourId,
          name: lr.name,
          unit: lr.unit,
          quantity: line.quantity,
          rate: lr.rate,
          amount: round(line.quantity * lr.rate, 2),
        });
      }
    }
  }
  return Array.from(map.values());
}

export function mergeEquipment(
  lines: ModuleOutput['equipment'][],
  rates: EquipmentRate[],
): EquipmentLine[] {
  const map = new Map<string, EquipmentLine>();
  for (const group of lines) {
    for (const line of group) {
      const er = rates.find((r) => r.id === line.equipmentId);
      if (!er) continue;
      const existing = map.get(line.equipmentId);
      if (existing) {
        existing.quantity = round(existing.quantity + line.quantity, 4);
        existing.amount = round(existing.quantity * existing.rate, 2);
      } else {
        map.set(line.equipmentId, {
          id: uid('eq'),
          equipmentId: line.equipmentId,
          name: er.name,
          unit: er.unit,
          quantity: line.quantity,
          rate: er.rate,
          amount: round(line.quantity * er.rate, 2),
        });
      }
    }
  }
  return Array.from(map.values());
}
