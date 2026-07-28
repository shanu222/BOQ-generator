/**
 * Area-based residential estimate adapter.
 * Converts covered area (sft) into measurement entries for the existing
 * calculateEstimate() pipeline — does not replace module formulas.
 */
import type { EstimateResult, MeasurementEntry, ProjectState, WorkCategoryId } from '@boq/shared';
import { WORK_CATEGORY_LABELS } from '@boq/shared';
import { createEntry, calculateEstimate } from './calculate';
import { round } from './constants';
import { deriveResidentialProfile } from './residential-profile';
import { classifyWorkCategory } from './cost-classification';

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
 * Typical Pakistan residential thumb rules → module entries.
 * Geometry is derived from sqrt(area); MEP scaled from room profile.
 */
export function buildEntriesFromCoveredArea(areaSft: number): MeasurementEntry[] {
  const profile = deriveResidentialProfile(areaSft);
  const { areaM2, doorCount, windowAreaM2 } = profile;
  const side = Math.sqrt(areaM2);
  const L = round(side, 2);
  const W = round(side, 2);
  const H = 3.05;
  const perimeter = 2 * (L + W);
  const wallThk = 0.23;

  const doorOpeningVol = doorCount * 0.9 * 2.1 * wallThk;
  const windowOpeningVol = windowAreaM2 * wallThk;
  const openingsVol = round(doorOpeningVol + windowOpeningVol, 3);

  const externalWallLen = perimeter;
  const internalWallLen = round(perimeter * 0.85, 2);
  const plasterArea = round(
    (externalWallLen + internalWallLen) * H * 2 - windowAreaM2 - doorCount * 0.9 * 2.1,
    2,
  );
  const paintWallLen = round(profile.paintAreaM2 / H, 2);
  const ceilingArea = round(areaM2 * profile.ceilingCoverage, 2);
  const ceilSide = Math.sqrt(ceilingArea);

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
      length: round(perimeter, 2),
      width: 0.9,
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
      quantity: Math.max(8, Math.round(profile.areaSft / 120)),
      mix: '1:1.5:3',
    },
    '[Area] RCC Columns',
  );

  push(
    'beams',
    {
      width: 0.23,
      depth: 0.38,
      length: perimeter * 0.75,
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
      length: externalWallLen,
      height: H,
      thickness: wallThk,
      quantity: 1,
      openings: openingsVol * 0.55,
    },
    '[Area] External brickwork',
  );

  push(
    'masonry',
    {
      length: internalWallLen,
      height: H,
      thickness: wallThk,
      quantity: 1,
      openings: openingsVol * 0.45,
    },
    '[Area] Internal partition walls',
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
      length: Math.sqrt(profile.floorTileAreaM2),
      width: Math.sqrt(profile.floorTileAreaM2),
      quantity: 1,
    },
    '[Area] Floor tiling',
  );

  push(
    'wall-tiles',
    {
      length: Math.sqrt(profile.wallTileAreaM2),
      height: 1,
      quantity: 1,
    },
    '[Area] Wall tiles (bath & kitchen)',
  );

  push(
    'paint',
    {
      length: paintWallLen,
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
      quantity: doorCount,
    },
    '[Area] Doors',
  );

  push(
    'windows',
    {
      width: round(windowAreaM2 / 1.2, 2),
      height: 1.2,
      quantity: 1,
    },
    '[Area] Aluminium windows',
  );

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
    'roofing',
    {
      length: L,
      width: W,
      quantity: 1,
    },
    '[Area] Roof insulation & finish',
  );

  push(
    'ceiling',
    {
      length: ceilSide,
      width: ceilSide,
      quantity: 1,
    },
    '[Area] False ceiling',
  );

  push(
    'electrical-works',
    { areaSft: profile.areaSft },
    '[Area] Electrical works',
  );

  push(
    'plumbing-works',
    { areaSft: profile.areaSft, bathrooms: profile.bathrooms },
    '[Area] Plumbing works',
  );

  push(
    'fixtures',
    {
      bathrooms: profile.bathrooms,
      kitchens: profile.kitchens,
      wardrobes: profile.wardrobeCount,
    },
    '[Area] Fittings & fixtures',
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
  estimatedCost: number;
  engineGrandTotal: number;
  materials: AreaMaterialRow[];
  totalMaterialCost: number;
  works: AreaWorkRow[];
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

function sumBoqByModule(estimate: EstimateResult, moduleIds: string[]) {
  return round(
    estimate.boq
      .filter((b) => moduleIds.includes(b.moduleId))
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

  const greyModules = [
    'foundation',
    'columns',
    'beams',
    'slabs',
    'masonry',
    'plaster',
    'waterproofing',
    'roofing',
  ];
  const woodMetalModules = [
    'floor-tiles',
    'wall-tiles',
    'paint',
    'doors',
    'windows',
    'ceiling',
  ];

  const works: AreaWorkRow[] = [
    {
      work: 'Foundation & Structure',
      amount: sumBoqByModule(estimate, greyModules),
      unit: 'job',
    },
    {
      work: 'Electrical Works',
      amount: sumBoqByModule(estimate, ['electrical-works']),
      unit: 'job',
    },
    {
      work: 'Plumbing Works',
      amount: sumBoqByModule(estimate, ['plumbing-works']),
      unit: 'job',
    },
    {
      work: 'Wood, Metal & Tile',
      amount: sumBoqByModule(estimate, woodMetalModules),
      unit: 'job',
    },
    {
      work: 'Fittings & Fixtures',
      amount: sumBoqByModule(estimate, ['fixtures']),
      unit: 'job',
    },
    {
      work: 'External Development',
      amount: sumBoqByModule(estimate, [
        'boundary-wall',
        'water-tank',
        'septic-tank',
      ]),
      unit: 'job',
    },
    {
      work: 'Overheads & Profit',
      amount: round(
        estimate.costs.transportation +
          estimate.costs.loadingUnloading +
          estimate.costs.waste +
          estimate.costs.overhead +
          estimate.costs.contractorProfit +
          (estimate.costs.contingency ?? 0),
        2,
      ),
      unit: 'job',
    },
  ];

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
    labour: estimate.costs.labour,
    material: estimate.costs.material,
    equipment: estimate.costs.equipment,
    contractorProfit: estimate.costs.contractorProfit,
    contingency: estimate.costs.contingency ?? 0,
    grandTotal: estimatedCost,
  };
}

/** Floor / plot breakdown passed from the calculator UI */
export interface AreaBreakdown {
  /** Total covered (GF + FF + Mumty) — drives building quantities */
  coveredAreaSft: number;
  plotAreaSft?: number;
  openAreaSft?: number;
  groundCoveredSft?: number;
  firstCoveredSft?: number;
  mumtyCoveredSft?: number;
  balconySft?: number;
  terraceSft?: number;
  /** When true, generate optional external works from open area */
  includeExternalWorks?: boolean;
}

/**
 * External development from open (uncovered) plot area.
 * Does not inflate building quantities — only boundary, paving, tanks.
 */
export function buildEntriesFromOpenArea(openAreaSft: number): MeasurementEntry[] {
  const open = Math.max(openAreaSft, 0);
  if (open < 50) return [];

  const openM2 = open * SFT_TO_M2;
  const side = Math.sqrt(Math.max(openM2, 1));
  // Approximate plot perimeter from open + a typical covered footprint share
  const perimeter = round(4 * Math.sqrt(openM2 * 4), 2); // rough plot edge
  const wallLen = round(Math.max(perimeter * 0.55, 20), 2);
  const paveSide = round(Math.sqrt(openM2 * 0.45), 2);

  let order = 900;
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
    'boundary-wall',
    {
      length: wallLen,
      height: 2.1,
      thickness: 0.23,
      copingWidth: 0.3,
      copingThk: 0.05,
      quantity: 1,
    },
    '[Open] Boundary wall',
  );

  push(
    'floor-tiles',
    {
      length: paveSide,
      width: paveSide,
      quantity: 1,
    },
    '[Open] Driveway / pavers',
  );

  push(
    'water-tank',
    {
      length: 2.5,
      width: 2,
      height: 1.8,
      wallThickness: 0.15,
      baseThickness: 0.15,
      coverThickness: 0.1,
      quantity: 1,
      mix: '1:1.5:3',
    },
    '[Open] Underground / overhead water tank',
  );

  push(
    'septic-tank',
    {
      length: 2.4,
      width: 1.5,
      height: 1.5,
      wallThickness: 0.23,
      baseThickness: 0.15,
      coverThickness: 0.1,
      quantity: 1,
      mix: '1:2:4',
    },
    '[Open] Septic tank',
  );

  return entries;
}

export function applyAreaToProject(
  project: ProjectState,
  areaOrBreakdown: number | AreaBreakdown,
): ProjectState {
  const breakdown: AreaBreakdown =
    typeof areaOrBreakdown === 'number'
      ? { coveredAreaSft: areaOrBreakdown, includeExternalWorks: false }
      : areaOrBreakdown;

  const covered = Math.max(breakdown.coveredAreaSft, 100);
  const building = buildEntriesFromCoveredArea(covered);
  const external =
    breakdown.includeExternalWorks !== false && (breakdown.openAreaSft ?? 0) > 50
      ? buildEntriesFromOpenArea(breakdown.openAreaSft ?? 0)
      : [];

  return {
    ...project,
    entries: [...building, ...external],
  };
}

export function runAreaEstimate(
  project: ProjectState,
  opts: {
    areaSft: number;
    costPerSft: number;
    durationMonths: number;
    mode: CalculatorMode;
    openAreaSft?: number;
    includeExternalWorks?: boolean;
  },
): { project: ProjectState; estimate: EstimateResult; presentation: AreaEstimatePresentation } {
  const next = applyAreaToProject(project, {
    coveredAreaSft: opts.areaSft,
    openAreaSft: opts.openAreaSft,
    includeExternalWorks: opts.includeExternalWorks,
  });
  const estimate = calculateEstimate(next);
  return {
    project: next,
    estimate,
    presentation: buildAreaPresentation(next, estimate, opts),
  };
}

/** Summarize BOQ amounts into Zameen-style work categories */
export function summarizeWorkCategories(
  state: ProjectState,
  estimate: EstimateResult,
): { id: WorkCategoryId; label: string; amount: number; percent: number }[] {
  const totals: Record<WorkCategoryId, number> = {
    'foundation-structure': 0,
    electrical: 0,
    plumbing: 0,
    'wood-metal-tile': 0,
    'fittings-fixtures': 0,
  };

  for (const item of estimate.boq) {
    const cat = classifyWorkCategory(item.moduleId);
    totals[cat] = round(totals[cat] + item.amount, 2);
  }

  const overheadShare = round(
    estimate.costs.transportation +
      estimate.costs.loadingUnloading +
      estimate.costs.waste +
      estimate.costs.overhead +
      estimate.costs.contractorProfit +
      (estimate.costs.contingency ?? 0),
    2,
  );
  totals['foundation-structure'] = round(totals['foundation-structure'] + overheadShare * 0.35, 2);
  totals['wood-metal-tile'] = round(totals['wood-metal-tile'] + overheadShare * 0.25, 2);
  totals.electrical = round(totals.electrical + overheadShare * 0.15, 2);
  totals.plumbing = round(totals.plumbing + overheadShare * 0.15, 2);
  totals['fittings-fixtures'] = round(totals['fittings-fixtures'] + overheadShare * 0.1, 2);

  const grand = estimate.costs.grandTotal || 1;
  return (Object.keys(totals) as WorkCategoryId[]).map((id) => ({
    id,
    label: WORK_CATEGORY_LABELS[id],
    amount: totals[id],
    percent: round((totals[id] / grand) * 100, 1),
  }));
}
