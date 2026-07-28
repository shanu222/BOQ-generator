/**
 * Pakistani residential cost classification (presentation / summary layer).
 * Does NOT alter quantity formulas — maps moduleIds and rate-analysis add-ons
 * into Grey Structure → Finishing → External → Miscellaneous packages.
 */
import type {
  CostClassification,
  CostComponentTotals,
  CostGroupId,
  CostGroupSummary,
  CostSubgroupId,
  CostSubgroupSummary,
  EstimateResult,
  ModuleId,
  ProjectCostSummary,
  ProjectState,
  WorkCategoryId,
  WorkCategorySummary,
} from '@boq/shared';
import {
  COST_GROUP_META,
  COST_SUBGROUP_LABELS,
  DEFAULT_RATE_FACTORS,
} from '@boq/shared';
import { round } from './constants';
import { runModule } from './registry';
import type { CalcContext } from './helpers';

/** Ordered subgroups for each package (professional QS tree). */
export const COST_GROUP_SUBGROUP_ORDER: Record<CostGroupId, CostSubgroupId[]> = {
  'grey-structure': [
    'site-preparation',
    'foundations',
    'plinth',
    'rcc-structure',
    'masonry',
    'roof-structure',
    'reinforcement',
    'formwork',
    'grey-electrical',
    'grey-plumbing',
  ],
  finishing: [
    'plaster',
    'flooring',
    'ceiling',
    'paint',
    'waterproofing',
    'doors',
    'windows',
    'kitchen',
    'washroom',
    'electrical-finishing',
    'plumbing-finishing',
    'misc-finishing',
  ],
  'external-development': [
    'boundary-external',
    'gates-driveways',
    'drainage-external',
    'landscaping',
    'underground-tanks',
    'septic-soak',
  ],
  miscellaneous: [
    'transportation',
    'loading-unloading',
    'waste',
    'overhead',
    'contractor-profit',
    'contingency',
    'taxes',
  ],
};

/**
 * moduleId → professional cost package.
 * Grey electrical/plumbing finishing slots exist for future modules (currently empty).
 */
export const MODULE_COST_CLASSIFICATION: Record<ModuleId, CostClassification> = {
  excavation: {
    groupId: 'grey-structure',
    subgroupId: 'site-preparation',
    mepKind: 'none',
  },
  pcc: { groupId: 'grey-structure', subgroupId: 'foundations', mepKind: 'none' },
  foundation: {
    groupId: 'grey-structure',
    subgroupId: 'foundations',
    mepKind: 'none',
  },
  footings: {
    groupId: 'grey-structure',
    subgroupId: 'foundations',
    mepKind: 'none',
  },
  rcc: {
    groupId: 'grey-structure',
    subgroupId: 'rcc-structure',
    mepKind: 'none',
  },
  columns: {
    groupId: 'grey-structure',
    subgroupId: 'rcc-structure',
    mepKind: 'none',
  },
  beams: {
    groupId: 'grey-structure',
    subgroupId: 'rcc-structure',
    mepKind: 'none',
  },
  slabs: {
    groupId: 'grey-structure',
    subgroupId: 'rcc-structure',
    mepKind: 'none',
  },
  staircase: {
    groupId: 'grey-structure',
    subgroupId: 'rcc-structure',
    mepKind: 'none',
  },
  masonry: { groupId: 'grey-structure', subgroupId: 'masonry', mepKind: 'none' },
  blockwork: {
    groupId: 'grey-structure',
    subgroupId: 'masonry',
    mepKind: 'none',
  },
  'steel-bbs': {
    groupId: 'grey-structure',
    subgroupId: 'reinforcement',
    mepKind: 'none',
  },
  plaster: { groupId: 'finishing', subgroupId: 'plaster', mepKind: 'none' },
  paint: { groupId: 'finishing', subgroupId: 'paint', mepKind: 'none' },
  'floor-tiles': {
    groupId: 'finishing',
    subgroupId: 'flooring',
    mepKind: 'none',
  },
  'wall-tiles': {
    groupId: 'finishing',
    subgroupId: 'flooring',
    mepKind: 'none',
  },
  ceiling: { groupId: 'finishing', subgroupId: 'ceiling', mepKind: 'none' },
  roofing: {
    groupId: 'finishing',
    subgroupId: 'waterproofing',
    mepKind: 'none',
  },
  waterproofing: {
    groupId: 'finishing',
    subgroupId: 'waterproofing',
    mepKind: 'none',
  },
  doors: { groupId: 'finishing', subgroupId: 'doors', mepKind: 'none' },
  windows: { groupId: 'finishing', subgroupId: 'windows', mepKind: 'none' },
  'boundary-wall': {
    groupId: 'external-development',
    subgroupId: 'boundary-external',
    mepKind: 'none',
  },
  'water-tank': {
    groupId: 'external-development',
    subgroupId: 'underground-tanks',
    mepKind: 'plumbing',
  },
  'septic-tank': {
    groupId: 'external-development',
    subgroupId: 'septic-soak',
    mepKind: 'plumbing',
  },
  'electrical-works': {
    groupId: 'finishing',
    subgroupId: 'electrical-finishing',
    mepKind: 'electrical',
  },
  'plumbing-works': {
    groupId: 'finishing',
    subgroupId: 'plumbing-finishing',
    mepKind: 'plumbing',
  },
  fixtures: {
    groupId: 'finishing',
    subgroupId: 'washroom',
    mepKind: 'none',
  },
};

/** Zameen-style work category for dashboard charts */
export function classifyWorkCategory(moduleId: ModuleId): WorkCategoryId {
  switch (moduleId) {
    case 'electrical-works':
      return 'electrical';
    case 'plumbing-works':
      return 'plumbing';
    case 'fixtures':
      return 'fittings-fixtures';
    case 'floor-tiles':
    case 'wall-tiles':
    case 'paint':
    case 'doors':
    case 'windows':
    case 'ceiling':
    case 'roofing':
      return 'wood-metal-tile';
    default:
      return 'foundation-structure';
  }
}

export function classifyModule(moduleId: ModuleId): CostClassification {
  return (
    MODULE_COST_CLASSIFICATION[moduleId] ?? {
      groupId: 'finishing',
      subgroupId: 'unclassified',
      mepKind: 'none',
    }
  );
}

function emptyComponents(): CostComponentTotals {
  return { material: 0, labour: 0, equipment: 0, subtotal: 0 };
}

function addComponents(
  target: CostComponentTotals,
  material: number,
  labour: number,
  equipment: number,
) {
  target.material = round(target.material + material, 2);
  target.labour = round(target.labour + labour, 2);
  target.equipment = round(target.equipment + equipment, 2);
  target.subtotal = round(
    target.material + target.labour + target.equipment,
    2,
  );
}

function emptySubgroup(id: CostSubgroupId): CostSubgroupSummary {
  return {
    id,
    label: COST_SUBGROUP_LABELS[id],
    itemCount: 0,
    ...emptyComponents(),
  };
}

function emptyGroup(id: CostGroupId): CostGroupSummary {
  const meta = COST_GROUP_META[id];
  return {
    id,
    label: meta.label,
    code: meta.code,
    percentOfTotal: 0,
    subgroups: COST_GROUP_SUBGROUP_ORDER[id].map(emptySubgroup),
    ...emptyComponents(),
  };
}

function ensureSubgroup(
  group: CostGroupSummary,
  subgroupId: CostSubgroupId,
): CostSubgroupSummary {
  let sg = group.subgroups.find((s) => s.id === subgroupId);
  if (!sg) {
    sg = emptySubgroup(subgroupId);
    group.subgroups.push(sg);
  }
  return sg;
}

/**
 * Build hierarchical project cost summary from measurements + estimate costs.
 * Reuses module runners for M/L/E splits; does not change quantity formulas.
 */
export function buildProjectCostSummary(
  state: ProjectState,
  estimate: EstimateResult,
): ProjectCostSummary {
  const ctx: CalcContext = {
    materials: state.materialRates,
    labour: state.labourRates,
    equipment: state.equipmentRates,
  };

  const grey = emptyGroup('grey-structure');
  const finishing = emptyGroup('finishing');
  const external = emptyGroup('external-development');
  const miscellaneous = emptyGroup('miscellaneous');

  const groupMap: Record<CostGroupId, CostGroupSummary> = {
    'grey-structure': grey,
    finishing,
    'external-development': external,
    miscellaneous,
  };

  const mepElectrical = emptyComponents();
  const mepPlumbing = emptyComponents();

  const ordered = [...state.entries].sort((a, b) => a.order - b.order);

  for (const entry of ordered) {
    const classification = classifyModule(entry.moduleId);
    const out = runModule(entry, ctx);

    let material = 0;
    let labour = 0;
    let equipment = 0;

    for (const m of out.materials) {
      const rate =
        state.materialRates.find((r) => r.id === m.materialId)?.rate ?? 0;
      material += m.quantity * rate;
    }
    for (const l of out.labour) {
      const rate =
        state.labourRates.find((r) => r.id === l.labourId)?.rate ?? 0;
      labour += l.quantity * rate;
    }
    for (const e of out.equipment) {
      const rate =
        state.equipmentRates.find((r) => r.id === e.equipmentId)?.rate ?? 0;
      equipment += e.quantity * rate;
    }

    material = round(material, 2);
    labour = round(labour, 2);
    equipment = round(equipment, 2);

    const group = groupMap[classification.groupId];
    const subgroup = ensureSubgroup(group, classification.subgroupId);
    addComponents(subgroup, material, labour, equipment);
    subgroup.itemCount += out.boq.length || 1;
    addComponents(group, material, labour, equipment);

    const mepFromSub =
      classification.subgroupId === 'grey-electrical' ||
      classification.subgroupId === 'electrical-finishing'
        ? 'electrical'
        : classification.subgroupId === 'grey-plumbing' ||
            classification.subgroupId === 'plumbing-finishing' ||
            classification.mepKind === 'plumbing'
          ? 'plumbing'
          : classification.mepKind;

    if (mepFromSub === 'electrical') {
      addComponents(mepElectrical, material, labour, equipment);
    } else if (mepFromSub === 'plumbing') {
      addComponents(mepPlumbing, material, labour, equipment);
    }
  }

  const costs = estimate.costs;

  const miscRows: { id: CostSubgroupId; amount: number }[] = [
    { id: 'transportation', amount: costs.transportation },
    { id: 'loading-unloading', amount: costs.loadingUnloading },
    { id: 'waste', amount: costs.waste },
    { id: 'overhead', amount: costs.overhead },
    { id: 'contractor-profit', amount: costs.contractorProfit },
    { id: 'contingency', amount: costs.contingency ?? 0 },
    { id: 'taxes', amount: costs.tax },
  ];

  for (const row of miscRows) {
    const sg = ensureSubgroup(miscellaneous, row.id);
    sg.amount = round(row.amount, 2);
    sg.subtotal = round(row.amount, 2);
    sg.itemCount = row.amount > 0 ? 1 : 0;
    miscellaneous.subtotal = round(miscellaneous.subtotal + row.amount, 2);
  }

  const grandTotal = costs.grandTotal;
  const groups = [grey, finishing, external, miscellaneous];
  for (const g of groups) {
    g.percentOfTotal =
      grandTotal > 0 ? round((g.subtotal / grandTotal) * 100, 1) : 0;
    g.subgroups = g.subgroups.filter((s) => {
      if (g.id === 'grey-structure') {
        if (s.id === 'grey-electrical' || s.id === 'grey-plumbing') return true;
      }
      if (g.id === 'finishing') {
        if (
          s.id === 'electrical-finishing' ||
          s.id === 'plumbing-finishing' ||
          s.id === 'kitchen' ||
          s.id === 'washroom'
        ) {
          return true;
        }
      }
      return s.subtotal > 0 || (s.amount ?? 0) > 0 || s.itemCount > 0;
    });
  }

  const directSubtotal = round(
    grey.subtotal + finishing.subtotal + external.subtotal,
    2,
  );

  const workCategories = buildWorkCategorySummary(state, estimate, grandTotal);

  return {
    groups,
    greyStructure: grey,
    finishing,
    external,
    miscellaneous,
    mep: {
      electrical: {
        ...mepElectrical,
        label: 'Total Electrical (Grey + Finishing)',
      },
      plumbing: {
        ...mepPlumbing,
        label: 'Total Plumbing (Grey + Finishing + Tanks)',
      },
    },
    workCategories,
    directSubtotal,
    grandTotal,
  };
}

function buildWorkCategorySummary(
  state: ProjectState,
  estimate: EstimateResult,
  grandTotal: number,
): WorkCategorySummary[] {
  const labels: Record<WorkCategoryId, string> = {
    'foundation-structure': 'Foundation & Structure',
    electrical: 'Electrical Works',
    plumbing: 'Plumbing Works',
    'wood-metal-tile': 'Wood, Metal & Tile Works',
    'fittings-fixtures': 'Fittings & Fixtures',
  };
  const buckets: Record<WorkCategoryId, CostComponentTotals> = {
    'foundation-structure': emptyComponents(),
    electrical: emptyComponents(),
    plumbing: emptyComponents(),
    'wood-metal-tile': emptyComponents(),
    'fittings-fixtures': emptyComponents(),
  };

  const ctx: CalcContext = {
    materials: state.materialRates,
    labour: state.labourRates,
    equipment: state.equipmentRates,
  };

  for (const entry of state.entries) {
    const cat = classifyWorkCategory(entry.moduleId);
    const out = runModule(entry, ctx);
    let material = 0;
    let labour = 0;
    let equipment = 0;
    for (const m of out.materials) {
      material += m.quantity * (state.materialRates.find((r) => r.id === m.materialId)?.rate ?? 0);
    }
    for (const l of out.labour) {
      labour += l.quantity * (state.labourRates.find((r) => r.id === l.labourId)?.rate ?? 0);
    }
    for (const e of out.equipment) {
      equipment += e.quantity * (state.equipmentRates.find((r) => r.id === e.equipmentId)?.rate ?? 0);
    }
    addComponents(buckets[cat], material, labour, equipment);
  }

  const overhead = estimate.costs.transportation + estimate.costs.loadingUnloading +
    estimate.costs.waste + estimate.costs.overhead + estimate.costs.contractorProfit +
    (estimate.costs.contingency ?? 0);
  const overheadSplit: Record<WorkCategoryId, number> = {
    'foundation-structure': 0.35,
    electrical: 0.15,
    plumbing: 0.15,
    'wood-metal-tile': 0.25,
    'fittings-fixtures': 0.1,
  };
  for (const id of Object.keys(overheadSplit) as WorkCategoryId[]) {
    buckets[id].subtotal = round(buckets[id].subtotal + overhead * overheadSplit[id], 2);
  }

  return (Object.keys(buckets) as WorkCategoryId[]).map((id) => ({
    id,
    label: labels[id],
    material: buckets[id].material,
    labour: buckets[id].labour,
    equipment: buckets[id].equipment,
    subtotal: buckets[id].subtotal,
    percentOfTotal: grandTotal > 0 ? round((buckets[id].subtotal / grandTotal) * 100, 1) : 0,
  }));
}

/** Classify a BOQ line for tables / exports */
export function classifyBOQItem(moduleId: ModuleId): CostClassification & {
  groupLabel: string;
  subgroupLabel: string;
} {
  const c = classifyModule(moduleId);
  return {
    ...c,
    groupLabel: COST_GROUP_META[c.groupId].label,
    subgroupLabel: COST_SUBGROUP_LABELS[c.subgroupId],
  };
}

export function normalizeRateFactors(
  factors: ProjectState['rateFactors'] | undefined,
) {
  return {
    ...DEFAULT_RATE_FACTORS,
    ...factors,
    contingencyPercent:
      factors?.contingencyPercent ?? DEFAULT_RATE_FACTORS.contingencyPercent,
  };
}
