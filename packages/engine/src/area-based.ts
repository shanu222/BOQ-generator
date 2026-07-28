/**
 * Area-based residential estimate adapter.
 * Converts covered area (sft) into measurement entries for the existing
 * calculateEstimate() pipeline — does not replace module formulas.
 */
import type { EstimateResult, MeasurementEntry, ProjectState } from '@boq/shared';
import { createEntry, calculateEstimate } from './calculate';
import { round } from './constants';

export const SFT_TO_M2 = 0.092903045;
export const M2_TO_SFT = 1 / SFT_TO_M2;

export type CalculatorMode = 'simple' | 'advanced';

export const DURATION_OPTIONS = [
  { value: 3, label: '3 Months' },
  { value: 6, label: '6 Months' },
  { value: 9, label: '9 Months' },
  { value: 12, label: '12 Months' },
  { value: 18, label: '18 Months' },
  { value: 24, label: '24 Months' },
] as const;

/** Materials shown on Advanced + result screens (rate DB ids) */
export const AREA_ADVANCE_MATERIALS = [
  { id: 'cement', label: 'Cement', unit: 'bag' },
  { id: 'sand', label: 'Sand', unit: 'm3' },
  { id: 'crush', label: 'Aggregate', unit: 'm3' },
  { id: 'steel-deformed', label: 'Steel', unit: 'kg' },
  { id: 'paint', label: 'Paint', unit: 'ltr' },
  { id: 'bricks', label: 'Bricks', unit: 'nos' },
  { id: 'floor-tiles', label: 'Flooring', unit: 'm2' },
  { id: 'aluminium-window', label: 'Windows', unit: 'm2' },
  { id: 'door-shutter', label: 'Doors', unit: 'm2' },
] as const;

/**
 * Typical Pakistan single-storey covered-area thumb rules → module entries.
 * Geometry is not used; dimensions are derived from sqrt(area).
 */
export function buildEntriesFromCoveredArea(areaSft: number): MeasurementEntry[] {
  const area = Math.max(areaSft, 100);
  const areaM2 = area * SFT_TO_M2;
  const side = Math.sqrt(areaM2);
  const L = round(side, 2);
  const W = round(side, 2);
  const H = 3.05; // ~10 ft storey
  const perimeter = 2 * (L + W);

  const footingWidth = 0.9;
  const footingLen = round(perimeter, 2);
  const doorNos = Math.max(4, Math.round(area / 200));
  const windowArea = round(areaM2 * 0.15, 2);
  const wallThk = 0.23;
  const wallAreaGross = perimeter * H;
  const openings = doorNos * 2.1 + windowArea;
  const plasterArea = round(Math.max(wallAreaGross * 2 - openings, areaM2 * 2.5), 2);
  const paintArea = round(plasterArea * 1.05 + areaM2, 2);

  let order = 0;
  const entries: MeasurementEntry[] = [];
  const push = (
    moduleId: MeasurementEntry['moduleId'],
    fields: Record<string, number | string>,
    label: string,
  ) => {
    entries.push(createEntry(moduleId, fields, label, order));
    order += 1;
  };

  push(
    'foundation',
    {
      length: footingLen,
      width: footingWidth,
      depth: 1.2,
      pccThickness: 0.075,
      rccThickness: 0.23,
      quantity: 1,
      mix: '1:2:4',
    },
    '[Area] Foundation / footings',
  );

  push(
    'columns',
    {
      length: 0.23,
      width: 0.23,
      height: H,
      quantity: Math.max(8, Math.round(area / 120)),
      mix: '1:1.5:3',
    },
    '[Area] RCC Columns',
  );

  push(
    'beams',
    {
      width: 0.23,
      depth: 0.38,
      length: perimeter * 0.55,
      quantity: 1,
      mix: '1:2:4',
    },
    '[Area] RCC Beams',
  );

  push(
    'slabs',
    {
      length: L,
      width: W,
      thickness: 0.125,
      quantity: 1,
      mix: '1:2:4',
    },
    '[Area] RCC Roof Slab',
  );

  push(
    'masonry',
    {
      length: perimeter,
      height: H,
      thickness: wallThk,
      quantity: 1,
      openings: openings,
    },
    '[Area] External / internal brickwork',
  );

  push(
    'plaster',
    {
      length: plasterArea / H,
      height: H,
      thickness: 12,
      sides: 1,
      openings: 0,
      quantity: 1,
    },
    '[Area] Cement plaster',
  );

  push(
    'floor-tiles',
    {
      length: L,
      width: W,
      quantity: 1,
    },
    '[Area] Floor tiling',
  );

  push(
    'paint',
    {
      length: paintArea / H,
      height: H,
      coats: 2,
      openings: 0,
      quantity: 1,
    },
    '[Area] Emulsion painting',
  );

  push(
    'doors',
    {
      width: 0.9,
      height: 2.1,
      quantity: doorNos,
    },
    '[Area] Doors',
  );

  push(
    'windows',
    {
      width: Math.sqrt(windowArea) || 1.2,
      height: Math.sqrt(windowArea) || 1.2,
      quantity: 1,
    },
    '[Area] Windows',
  );

  // Force window area via width*height*qty ≈ windowArea
  const last = entries[entries.length - 1];
  if (last.moduleId === 'windows') {
    last.fields = {
      width: round(windowArea / 1.2, 2),
      height: 1.2,
      quantity: 1,
    };
  }

  push(
    'waterproofing',
    {
      length: L,
      width: W,
      quantity: 1,
    },
    '[Area] Roof waterproofing',
  );

  push(
    'ceiling',
    {
      length: L,
      width: W,
      quantity: 1,
    },
    '[Area] Ceiling (optional allowance)',
  );

  return entries;
}

export interface AreaMaterialRow {
  id: string;
  label: string;
  quantity: number;
  unit: string;
  rate: number;
  amount: number;
}

export interface AreaWorkRow {
  work: string;
  amount: number;
  unit: string;
}

export interface AreaEstimatePresentation {
  areaSft: number;
  areaM2: number;
  costPerSft: number;
  durationMonths: number;
  mode: CalculatorMode;
  /** Simple mode headline = area × rate; Advanced = engine grand total */
  estimatedCost: number;
  engineGrandTotal: number;
  materials: AreaMaterialRow[];
  totalMaterialCost: number;
  works: AreaWorkRow[];
  designEngineering: number;
  labour: number;
  material: number;
  equipment: number;
  contractorProfit: number;
  contingency: number;
  grandTotal: number;
}

function materialRow(
  estimate: EstimateResult,
  id: string,
  label: string,
  fallbackUnit: string,
): AreaMaterialRow {
  const line = estimate.materials.find((m) => m.materialId === id);
  return {
    id,
    label,
    quantity: round(line?.quantity ?? 0, 2),
    unit: line?.unit ?? fallbackUnit,
    rate: line?.rate ?? 0,
    amount: round(line?.amount ?? 0, 2),
  };
}

function sumBoqByCategory(estimate: EstimateResult, match: (cat: string, desc: string) => boolean) {
  return round(
    estimate.boq
      .filter((b) => match(b.category.toLowerCase(), b.description.toLowerCase()))
      .reduce((s, b) => s + b.amount, 0),
    2,
  );
}

export function buildAreaPresentation(
  state: ProjectState,
  estimate: EstimateResult,
  opts: {
    areaSft: number;
    costPerSft: number;
    durationMonths: number;
    mode: CalculatorMode;
  },
): AreaEstimatePresentation {
  const areaSft = opts.areaSft;
  const areaM2 = round(areaSft * SFT_TO_M2, 2);
  const engineGrandTotal = estimate.costs.grandTotal;
  const simpleTotal = round(areaSft * opts.costPerSft, 2);
  const estimatedCost = opts.mode === 'simple' ? simpleTotal : engineGrandTotal;

  const materials = AREA_ADVANCE_MATERIALS.map((m) =>
    materialRow(estimate, m.id, m.label, m.unit),
  );
  const totalMaterialCost = round(
    materials.reduce((s, m) => s + m.amount, 0),
    2,
  );

  const works: AreaWorkRow[] = [
    {
      work: 'Excavation',
      amount: sumBoqByCategory(estimate, (c, d) => c.includes('earth') || d.includes('excav')),
      unit: 'job',
    },
    {
      work: 'PCC',
      amount: sumBoqByCategory(estimate, (c, d) => d.includes('pcc') || d.includes('plain')),
      unit: 'm3',
    },
    {
      work: 'RCC',
      amount: sumBoqByCategory(
        estimate,
        (c, d) =>
          (c.includes('concrete') || d.includes('rcc') || d.includes('column') || d.includes('beam') || d.includes('slab')) &&
          !d.includes('pcc') &&
          !d.includes('plain'),
      ),
      unit: 'm3',
    },
    {
      work: 'Brickwork',
      amount: sumBoqByCategory(estimate, (c, d) => c.includes('mason') || d.includes('brick')),
      unit: 'm3',
    },
    {
      work: 'Plaster',
      amount: sumBoqByCategory(estimate, (c, d) => d.includes('plaster')),
      unit: 'm2',
    },
    {
      work: 'Flooring',
      amount: sumBoqByCategory(estimate, (c, d) => d.includes('tile') || d.includes('floor')),
      unit: 'm2',
    },
    {
      work: 'Paint',
      amount: sumBoqByCategory(estimate, (c, d) => d.includes('paint') || c.includes('finish')),
      unit: 'm2',
    },
    {
      work: 'Electrical',
      amount: round(estimatedCost * 0.06, 2),
      unit: 'job',
    },
    {
      work: 'Plumbing',
      amount: round(estimatedCost * 0.05, 2),
      unit: 'job',
    },
    {
      work: 'Doors',
      amount: sumBoqByCategory(estimate, (c, d) => d.includes('door') || c.includes('wood')),
      unit: 'nos',
    },
    {
      work: 'Windows',
      amount: sumBoqByCategory(estimate, (c, d) => d.includes('window') || c.includes('opening')),
      unit: 'm2',
    },
    {
      work: 'Miscellaneous',
      amount: round(
        estimate.costs.transportation +
          estimate.costs.loadingUnloading +
          estimate.costs.waste +
          estimate.costs.overhead,
        2,
      ),
      unit: 'job',
    },
  ];

  const designEngineering = round(estimatedCost * 0.02, 2);

  return {
    areaSft,
    areaM2,
    costPerSft: opts.costPerSft,
    durationMonths: opts.durationMonths,
    mode: opts.mode,
    estimatedCost,
    engineGrandTotal,
    materials,
    totalMaterialCost,
    works,
    designEngineering,
    labour: estimate.costs.labour,
    material: estimate.costs.material,
    equipment: estimate.costs.equipment,
    contractorProfit: estimate.costs.contractorProfit,
    contingency: estimate.costs.contingency ?? 0,
    grandTotal:
      opts.mode === 'simple'
        ? estimatedCost
        : round(engineGrandTotal + designEngineering, 2),
  };
}

export function applyAreaToProject(
  project: ProjectState,
  areaSft: number,
): ProjectState {
  return {
    ...project,
    entries: buildEntriesFromCoveredArea(areaSft),
  };
}

export function runAreaEstimate(
  project: ProjectState,
  opts: {
    areaSft: number;
    costPerSft: number;
    durationMonths: number;
    mode: CalculatorMode;
  },
): { project: ProjectState; estimate: EstimateResult; presentation: AreaEstimatePresentation } {
  const next = applyAreaToProject(project, opts.areaSft);
  const estimate = calculateEstimate(next);
  return {
    project: next,
    estimate,
    presentation: buildAreaPresentation(next, estimate, opts),
  };
}
