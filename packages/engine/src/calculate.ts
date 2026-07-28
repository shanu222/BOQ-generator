import type {
  BOQItem,
  CostBreakdown,
  EngineeringWarning,
  EstimateResult,
  MeasurementEntry,
  ProjectState,
  RateAnalysisFactors,
} from '@boq/shared';
import { round } from './constants';
import { mergeEquipment, mergeLabour, mergeMaterials, uid, type CalcContext } from './helpers';
import { runModule } from './registry';
import { analyzeEngineering } from './advisor';
import { normalizeRateFactors } from './cost-classification';

function applyCostFactors(
  material: number,
  labour: number,
  equipment: number,
  factors: RateAnalysisFactors,
): CostBreakdown {
  const contingencyPercent = factors.contingencyPercent ?? 0;
  const base = material + labour + equipment;
  const transportation = round((base * factors.transportationPercent) / 100, 2);
  const loadingUnloading = round((base * factors.loadingUnloadingPercent) / 100, 2);
  const waste = round((material * factors.wastePercent) / 100, 2);
  const subBeforeOH = base + transportation + loadingUnloading + waste;
  const overhead = round((subBeforeOH * factors.overheadPercent) / 100, 2);
  const withOH = subBeforeOH + overhead;
  const contractorProfit = round((withOH * factors.contractorProfitPercent) / 100, 2);
  const subtotal = round(withOH + contractorProfit, 2);
  const contingency = round((subtotal * contingencyPercent) / 100, 2);
  const taxable = round(subtotal + contingency, 2);
  const tax = round((taxable * factors.taxPercent) / 100, 2);
  const grandTotal = round(taxable + tax, 2);
  return {
    material: round(material, 2),
    labour: round(labour, 2),
    equipment: round(equipment, 2),
    transportation,
    loadingUnloading,
    waste,
    overhead,
    contractorProfit,
    contingency,
    tax,
    subtotal,
    grandTotal,
  };
}

function numberBOQ(items: BOQItem[]): BOQItem[] {
  const byCategory = new Map<string, BOQItem[]>();
  for (const item of items) {
    const list = byCategory.get(item.category) ?? [];
    list.push(item);
    byCategory.set(item.category, list);
  }
  const result: BOQItem[] = [];
  let catIndex = 1;
  for (const [, list] of byCategory) {
    let i = 1;
    for (const item of list) {
      result.push({ ...item, itemNo: `${catIndex}.${i}` });
      i += 1;
    }
    catIndex += 1;
  }
  return result;
}

/** Deterministic engineering estimate from measurements + rates */
export function calculateEstimate(state: ProjectState): EstimateResult {
  const factors = normalizeRateFactors(state.rateFactors);
  const ctx: CalcContext = {
    materials: state.materialRates,
    labour: state.labourRates,
    equipment: state.equipmentRates,
  };

  const ordered = [...state.entries].sort((a, b) => a.order - b.order);
  const qtyAll = [];
  const matGroups = [];
  const labGroups = [];
  const eqGroups = [];
  const boqRaw: BOQItem[] = [];

  for (const entry of ordered) {
    const out = runModule(entry, ctx);
    qtyAll.push(...out.quantities);
    matGroups.push(out.materials);
    labGroups.push(out.labour);
    eqGroups.push(out.equipment);

    for (const b of out.boq) {
      const override = state.boqOverrides?.[b.entryId + ':' + b.description];
      const rateFromMats = estimateBOQRate(b.quantity, out, state);
      const rate = override?.rate ?? rateFromMats;
      const quantity = override?.quantity ?? b.quantity;
      const description = override?.description ?? b.description;
      const specification = override?.specification ?? b.specification;
      const remarks = override?.remarks ?? b.remarks;
      boqRaw.push({
        id: uid('boq'),
        itemNo: '',
        description,
        specification,
        unit: b.unit,
        quantity: round(quantity, 3),
        rate: round(rate, 2),
        amount: round(quantity * rate, 2),
        category: b.category,
        remarks,
        entryId: b.entryId,
        moduleId: b.moduleId,
        editable: true,
      });
    }
  }

  const materials = mergeMaterials(matGroups, state.materialRates);
  const labour = mergeLabour(labGroups, state.labourRates);
  const equipment = mergeEquipment(eqGroups, state.equipmentRates);

  const materialCost = materials.reduce((s, m) => s + m.amount, 0);
  const labourCost = labour.reduce((s, l) => s + l.amount, 0);
  const equipmentCost = equipment.reduce((s, e) => s + e.amount, 0);

  // Re-rate BOQ amounts proportionally if needed — already set per item
  const boq = numberBOQ(boqRaw);
  const costs = applyCostFactors(materialCost, labourCost, equipmentCost, factors);
  const warnings = analyzeEngineering(ordered, qtyAll);

  for (const m of materials) {
    if (m.missingRate || (m.quantity > 0 && m.rate <= 0)) {
      warnings.push({
        id: `rate-mat-${m.materialId}`,
        severity: 'warning',
        title: 'Missing material rate',
        message: `${m.name} has quantity ${m.quantity} ${m.unit} but no valid rate in the Pakistan rate database.`,
        suggestion: 'Open Rates → Materials, search this item, and enter a PKR unit rate.',
      });
    }
  }
  for (const l of labour) {
    if (l.missingRate || (l.quantity > 0 && l.rate <= 0)) {
      warnings.push({
        id: `rate-lab-${l.labourId}`,
        severity: 'warning',
        title: 'Missing labour rate',
        message: `${l.name} has quantity ${l.quantity} ${l.unit} but no valid labour rate.`,
        suggestion: 'Open Rates → Labour and set a unit or daily rate.',
      });
    }
  }
  for (const e of equipment) {
    if (e.missingRate || (e.quantity > 0 && e.rate <= 0)) {
      warnings.push({
        id: `rate-eq-${e.equipmentId}`,
        severity: 'warning',
        title: 'Missing equipment rate',
        message: `${e.name} has quantity ${e.quantity} ${e.unit} but no valid equipment rate.`,
        suggestion: 'Open Rates → Equipment and set an hourly/daily hire rate.',
      });
    }
  }

  return {
    quantities: qtyAll,
    materials,
    labour,
    equipment,
    boq,
    costs,
    warnings,
    generatedAt: new Date().toISOString(),
  };
}

function estimateBOQRate(
  quantity: number,
  out: ReturnType<typeof runModule>,
  state: ProjectState,
): number {
  if (quantity <= 0) return 0;
  let cost = 0;
  for (const m of out.materials) {
    const rate = state.materialRates.find((r) => r.id === m.materialId)?.rate ?? 0;
    cost += m.quantity * rate;
  }
  for (const l of out.labour) {
    const rate = state.labourRates.find((r) => r.id === l.labourId)?.rate ?? 0;
    cost += l.quantity * rate;
  }
  for (const e of out.equipment) {
    const rate = state.equipmentRates.find((r) => r.id === e.equipmentId)?.rate ?? 0;
    cost += e.quantity * rate;
  }
  // Distribute shared cost across BOQ lines of this output
  const lines = Math.max(out.boq.length, 1);
  return round(cost / lines / quantity, 2);
}

export function createEntry(
  moduleId: MeasurementEntry['moduleId'],
  fields: Record<string, number | string>,
  label: string,
  order: number,
): MeasurementEntry {
  const now = new Date().toISOString();
  return {
    id: uid('entry'),
    moduleId,
    label,
    fields,
    createdAt: now,
    updatedAt: now,
    order,
  };
}

export type { EngineeringWarning };
