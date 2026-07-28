import type {
  EstimateResult,
  ProjectState,
} from '@boq/shared';
import {
  DEFAULT_EQUIPMENT,
  DEFAULT_LABOUR,
  DEFAULT_MATERIALS,
  ENGINE_EQUIPMENT_IDS,
  ENGINE_LABOUR_IDS,
  ENGINE_MATERIAL_IDS,
} from './defaults';

export interface RateAuditReport {
  generatedAt: string;
  summary: {
    materialCatalogSize: number;
    labourCatalogSize: number;
    equipmentCatalogSize: number;
    engineMaterialCoverage: string;
    engineLabourCoverage: string;
    engineEquipmentCoverage: string;
    missingRateLines: number;
    zeroCostLines: number;
  };
  missingEngineMaterials: string[];
  missingEngineLabour: string[];
  missingEngineEquipment: string[];
  unusedCatalogMaterials: string[];
  unusedCatalogLabour: string[];
  unusedCatalogEquipment: string[];
  duplicateMaterialIds: string[];
  duplicateLabourIds: string[];
  duplicateEquipmentIds: string[];
  zeroDefaultRates: { type: string; id: string; name: string }[];
  estimateGaps: {
    materialsMissingRate: { id: string; name: string; quantity: number }[];
    labourMissingRate: { id: string; name: string; quantity: number }[];
    equipmentMissingRate: { id: string; name: string; quantity: number }[];
  };
  notes: string[];
}

function dupIds(ids: string[]): string[] {
  const seen = new Set<string>();
  const dups = new Set<string>();
  for (const id of ids) {
    if (seen.has(id)) dups.add(id);
    seen.add(id);
  }
  return [...dups];
}

/** Static + optional live estimate audit of the Pakistan rate database. */
export function auditPakistanRateDatabase(
  project?: ProjectState,
  estimate?: EstimateResult,
): RateAuditReport {
  const materials = project?.materialRates ?? DEFAULT_MATERIALS;
  const labour = project?.labourRates ?? DEFAULT_LABOUR;
  const equipment = project?.equipmentRates ?? DEFAULT_EQUIPMENT;

  const matIds = new Set(materials.map((m) => m.id));
  const labIds = new Set(labour.map((l) => l.id));
  const eqIds = new Set(equipment.map((e) => e.id));

  const missingEngineMaterials = ENGINE_MATERIAL_IDS.filter((id) => !matIds.has(id));
  const missingEngineLabour = ENGINE_LABOUR_IDS.filter((id) => !labIds.has(id));
  const missingEngineEquipment = ENGINE_EQUIPMENT_IDS.filter((id) => !eqIds.has(id));

  const usedMats = new Set(estimate?.materials.map((m) => m.materialId) ?? [...ENGINE_MATERIAL_IDS]);
  const usedLabs = new Set(estimate?.labour.map((l) => l.labourId) ?? [...ENGINE_LABOUR_IDS]);
  const usedEq = new Set(estimate?.equipment.map((e) => e.equipmentId) ?? [...ENGINE_EQUIPMENT_IDS]);

  const unusedCatalogMaterials = materials
    .map((m) => m.id)
    .filter((id) => !usedMats.has(id) && !(ENGINE_MATERIAL_IDS as readonly string[]).includes(id));
  const unusedCatalogLabour = labour
    .map((l) => l.id)
    .filter((id) => !usedLabs.has(id) && !(ENGINE_LABOUR_IDS as readonly string[]).includes(id));
  const unusedCatalogEquipment = equipment
    .map((e) => e.id)
    .filter((id) => !usedEq.has(id) && !(ENGINE_EQUIPMENT_IDS as readonly string[]).includes(id));

  const zeroDefaultRates = [
    ...materials
      .filter((m) => m.defaultRate <= 0 && m.id !== 'water')
      .map((m) => ({ type: 'material', id: m.id, name: m.name })),
    ...labour
      .filter((l) => l.defaultRate <= 0)
      .map((l) => ({ type: 'labour', id: l.id, name: l.name })),
    ...equipment
      .filter((e) => e.defaultRate <= 0)
      .map((e) => ({ type: 'equipment', id: e.id, name: e.name })),
  ];

  const materialsMissingRate =
    estimate?.materials
      .filter((m) => m.missingRate || m.rate <= 0)
      .map((m) => ({ id: m.materialId, name: m.name, quantity: m.quantity })) ?? [];
  const labourMissingRate =
    estimate?.labour
      .filter((l) => l.missingRate || l.rate <= 0)
      .map((l) => ({ id: l.labourId, name: l.name, quantity: l.quantity })) ?? [];
  const equipmentMissingRate =
    estimate?.equipment
      .filter((e) => e.missingRate || e.rate <= 0)
      .map((e) => ({ id: e.equipmentId, name: e.name, quantity: e.quantity })) ?? [];

  const missingRateLines =
    materialsMissingRate.length + labourMissingRate.length + equipmentMissingRate.length;
  const zeroCostLines =
    (estimate?.materials.filter((m) => m.quantity > 0 && m.amount <= 0).length ?? 0) +
    (estimate?.labour.filter((l) => l.quantity > 0 && l.amount <= 0).length ?? 0) +
    (estimate?.equipment.filter((e) => e.quantity > 0 && e.amount <= 0).length ?? 0);

  return {
    generatedAt: new Date().toISOString(),
    summary: {
      materialCatalogSize: materials.length,
      labourCatalogSize: labour.length,
      equipmentCatalogSize: equipment.length,
      engineMaterialCoverage: `${ENGINE_MATERIAL_IDS.length - missingEngineMaterials.length}/${ENGINE_MATERIAL_IDS.length}`,
      engineLabourCoverage: `${ENGINE_LABOUR_IDS.length - missingEngineLabour.length}/${ENGINE_LABOUR_IDS.length}`,
      engineEquipmentCoverage: `${ENGINE_EQUIPMENT_IDS.length - missingEngineEquipment.length}/${ENGINE_EQUIPMENT_IDS.length}`,
      missingRateLines,
      zeroCostLines,
    },
    missingEngineMaterials,
    missingEngineLabour,
    missingEngineEquipment,
    unusedCatalogMaterials,
    unusedCatalogLabour,
    unusedCatalogEquipment,
    duplicateMaterialIds: dupIds(materials.map((m) => m.id)),
    duplicateLabourIds: dupIds(labour.map((l) => l.id)),
    duplicateEquipmentIds: dupIds(equipment.map((e) => e.id)),
    zeroDefaultRates,
    estimateGaps: {
      materialsMissingRate,
      labourMissingRate,
      equipmentMissingRate,
    },
    notes: [
      'ENGINE-consumed IDs must remain stable; catalog extras support MEP / finishing packages and manual BOQ.',
      'Unused catalog rows are expected until grey electrical/plumbing modules are added.',
      'Water may legitimately have a near-zero unit rate.',
      'Steel fixer is priced per kg (unit-corrected from historical ton/quintal mismatch).',
      'Mixer, vibrator, and scaffolding are now linked to concrete / formwork / plaster quantities.',
    ],
  };
}
