/** Shared domain types for BOQ Pro */

export type Unit =
  | 'm'
  | 'm2'
  | 'm3'
  | 'kg'
  | 'ton'
  | 'nos'
  | 'bag'
  | 'cft'
  | 'sft'
  | 'ltr'
  | 'gallon'
  | 'job'
  | 'rft'
  | 'rm'
  | 'set'
  | 'pair'
  | 'hour'
  | 'day';

export type MaterialCategory =
  | 'cement-concrete'
  | 'cement'
  | 'sand'
  | 'crush'
  | 'reinforcement'
  | 'steel'
  | 'masonry'
  | 'bricks'
  | 'blocks'
  | 'formwork'
  | 'timber'
  | 'plaster'
  | 'flooring'
  | 'tiles'
  | 'adhesive'
  | 'paint'
  | 'waterproofing'
  | 'doors'
  | 'windows'
  | 'wood'
  | 'hardware'
  | 'electrical'
  | 'plumbing'
  | 'roofing'
  | 'miscellaneous'
  | 'other';

export type LabourCategory =
  | 'earthwork'
  | 'concrete'
  | 'steel'
  | 'masonry'
  | 'finishing'
  | 'openings'
  | 'electrical'
  | 'plumbing'
  | 'supervision'
  | 'general';

export type EquipmentCategory =
  | 'earthmoving'
  | 'concrete'
  | 'lifting'
  | 'power'
  | 'tools'
  | 'access'
  | 'general';

export type RateBasis = 'unit' | 'daily' | 'hourly' | 'job';

export type CostCategory = 'material' | 'labour' | 'equipment';

/** Top-level Pakistani residential estimate packages */
export type CostGroupId =
  | 'grey-structure'
  | 'finishing'
  | 'external-development'
  | 'miscellaneous';

/** Sub-packages within a cost group (classification tree) */
export type CostSubgroupId =
  | 'site-preparation'
  | 'foundations'
  | 'plinth'
  | 'rcc-structure'
  | 'masonry'
  | 'roof-structure'
  | 'grey-electrical'
  | 'grey-plumbing'
  | 'reinforcement'
  | 'formwork'
  | 'plaster'
  | 'flooring'
  | 'ceiling'
  | 'paint'
  | 'waterproofing'
  | 'doors'
  | 'windows'
  | 'kitchen'
  | 'washroom'
  | 'electrical-finishing'
  | 'plumbing-finishing'
  | 'misc-finishing'
  | 'boundary-external'
  | 'gates-driveways'
  | 'drainage-external'
  | 'landscaping'
  | 'underground-tanks'
  | 'septic-soak'
  | 'transportation'
  | 'loading-unloading'
  | 'waste'
  | 'overhead'
  | 'contractor-profit'
  | 'contingency'
  | 'taxes'
  | 'unclassified';

/** Informative MEP roll-up (does not add to grand total) */
export type MepKind = 'electrical' | 'plumbing' | 'none';

export interface CostClassification {
  groupId: CostGroupId;
  subgroupId: CostSubgroupId;
  mepKind: MepKind;
}

export interface CostComponentTotals {
  material: number;
  labour: number;
  equipment: number;
  subtotal: number;
}

export interface CostSubgroupSummary extends CostComponentTotals {
  id: CostSubgroupId;
  label: string;
  itemCount: number;
  /** Present when subgroup is a rate-analysis add-on (misc) */
  amount?: number;
}

export interface CostGroupSummary extends CostComponentTotals {
  id: CostGroupId;
  label: string;
  code: string;
  percentOfTotal: number;
  subgroups: CostSubgroupSummary[];
}

export interface MepSummary {
  electrical: CostComponentTotals & { label: string };
  plumbing: CostComponentTotals & { label: string };
}

export interface ProjectCostSummary {
  groups: CostGroupSummary[];
  mep: MepSummary;
  greyStructure: CostGroupSummary;
  finishing: CostGroupSummary;
  external: CostGroupSummary;
  miscellaneous: CostGroupSummary;
  /** Zameen-style work packages for dashboard / charts */
  workCategories?: WorkCategorySummary[];
  directSubtotal: number;
  grandTotal: number;
}

/** Pakistan residential work breakdown (Zameen-aligned presentation) */
export type WorkCategoryId =
  | 'foundation-structure'
  | 'electrical'
  | 'plumbing'
  | 'wood-metal-tile'
  | 'fittings-fixtures';

export interface WorkCategorySummary {
  id: WorkCategoryId;
  label: string;
  material: number;
  labour: number;
  equipment: number;
  subtotal: number;
  percentOfTotal: number;
}

export const WORK_CATEGORY_LABELS: Record<WorkCategoryId, string> = {
  'foundation-structure': 'Foundation & Structure',
  electrical: 'Electrical Works',
  plumbing: 'Plumbing Works',
  'wood-metal-tile': 'Wood, Metal & Tile Works',
  'fittings-fixtures': 'Fittings & Fixtures',
};

export type ModuleId =
  | 'excavation'
  | 'pcc'
  | 'rcc'
  | 'foundation'
  | 'footings'
  | 'columns'
  | 'beams'
  | 'slabs'
  | 'staircase'
  | 'masonry'
  | 'blockwork'
  | 'boundary-wall'
  | 'plaster'
  | 'paint'
  | 'floor-tiles'
  | 'wall-tiles'
  | 'roofing'
  | 'waterproofing'
  | 'doors'
  | 'windows'
  | 'ceiling'
  | 'steel-bbs'
  | 'water-tank'
  | 'septic-tank'
  | 'electrical-works'
  | 'plumbing-works'
  | 'fixtures';

export interface FieldDef {
  key: string;
  label: string;
  unit?: Unit;
  type: 'number' | 'select';
  min?: number;
  step?: number;
  defaultValue?: number | string;
  options?: { value: string; label: string }[];
  tooltip?: string;
  required?: boolean;
}

export interface ModuleDefinition {
  id: ModuleId;
  name: string;
  description: string;
  category: string;
  icon: string;
  fields: FieldDef[];
}

export interface MaterialRate {
  id: string;
  name: string;
  description: string;
  category: MaterialCategory;
  unit: Unit;
  defaultRate: number;
  rate: number;
  consumptionNote?: string;
  /** ISO timestamp when user last edited the live rate */
  updatedAt?: string;
}

export interface LabourRate {
  id: string;
  name: string;
  description: string;
  unit: Unit;
  defaultRate: number;
  rate: number;
  category?: LabourCategory;
  rateBasis?: RateBasis;
  updatedAt?: string;
}

export interface EquipmentRate {
  id: string;
  name: string;
  description: string;
  unit: Unit;
  defaultRate: number;
  rate: number;
  category?: EquipmentCategory;
  rateBasis?: RateBasis;
  updatedAt?: string;
}

export interface RateAnalysisFactors {
  transportationPercent: number;
  loadingUnloadingPercent: number;
  wastePercent: number;
  overheadPercent: number;
  contractorProfitPercent: number;
  /** Contingency allowance (% of amount after profit, before tax) */
  contingencyPercent: number;
  taxPercent: number;
}

export interface MeasurementEntry {
  id: string;
  moduleId: ModuleId;
  label: string;
  fields: Record<string, number | string>;
  createdAt: string;
  updatedAt: string;
  order: number;
}

export interface QuantityLine {
  id: string;
  moduleId: ModuleId;
  entryId: string;
  description: string;
  unit: Unit;
  quantity: number;
  category: string;
}

export interface MaterialLine {
  id: string;
  materialId: string;
  name: string;
  category: MaterialCategory;
  unit: Unit;
  quantity: number;
  rate: number;
  amount: number;
  sourceEntryIds: string[];
  /** True when rate was missing or zero in the database */
  missingRate?: boolean;
}

export interface LabourLine {
  id: string;
  labourId: string;
  name: string;
  unit: Unit;
  quantity: number;
  rate: number;
  amount: number;
  missingRate?: boolean;
}

export interface EquipmentLine {
  id: string;
  equipmentId: string;
  name: string;
  unit: Unit;
  quantity: number;
  rate: number;
  amount: number;
  missingRate?: boolean;
}

export interface BOQItem {
  id: string;
  itemNo: string;
  description: string;
  specification: string;
  unit: Unit;
  quantity: number;
  rate: number;
  amount: number;
  category: string;
  remarks: string;
  entryId: string;
  moduleId: ModuleId;
  editable: boolean;
}

export interface CostBreakdown {
  material: number;
  labour: number;
  equipment: number;
  transportation: number;
  loadingUnloading: number;
  waste: number;
  overhead: number;
  contractorProfit: number;
  contingency: number;
  tax: number;
  /** Direct + add-ons before contingency & tax (after profit) */
  subtotal: number;
  grandTotal: number;
}

export interface EstimateResult {
  quantities: QuantityLine[];
  materials: MaterialLine[];
  labour: LabourLine[];
  equipment: EquipmentLine[];
  boq: BOQItem[];
  costs: CostBreakdown;
  warnings: EngineeringWarning[];
  generatedAt: string;
}

export interface EngineeringWarning {
  id: string;
  severity: 'info' | 'warning' | 'error';
  entryId?: string;
  moduleId?: ModuleId;
  title: string;
  message: string;
  suggestion?: string;
}

export interface ProjectState {
  name: string;
  location: string;
  client: string;
  preparedBy: string;
  date: string;
  entries: MeasurementEntry[];
  materialRates: MaterialRate[];
  labourRates: LabourRate[];
  equipmentRates: EquipmentRate[];
  rateFactors: RateAnalysisFactors;
  boqOverrides: Record<string, Partial<BOQItem>>;
  sectionOrder: string[];
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
}

export const DEFAULT_RATE_FACTORS: RateAnalysisFactors = {
  transportationPercent: 2,
  loadingUnloadingPercent: 1,
  wastePercent: 3,
  overheadPercent: 5,
  contractorProfitPercent: 6,
  contingencyPercent: 3,
  taxPercent: 0,
};

export const COST_GROUP_META: Record<
  CostGroupId,
  { label: string; code: string; description: string }
> = {
  'grey-structure': {
    label: 'Grey Structure',
    code: 'A',
    description: 'Structural shell, rough-in services, steel & formwork',
  },
  finishing: {
    label: 'Finishing',
    code: 'B',
    description: 'Plaster, floors, paint, openings, fixtures & finishing MEP',
  },
  'external-development': {
    label: 'External Development',
    code: 'C',
    description: 'Boundary, tanks, septic and external works (optional)',
  },
  miscellaneous: {
    label: 'Miscellaneous',
    code: 'E',
    description: 'Transport, waste, overhead, profit, contingency & taxes',
  },
};

export const COST_SUBGROUP_LABELS: Record<CostSubgroupId, string> = {
  'site-preparation': 'Site Preparation / Earthwork',
  foundations: 'Foundations',
  plinth: 'Plinth',
  'rcc-structure': 'RCC Structure',
  masonry: 'Masonry',
  'roof-structure': 'Roof Structure',
  'grey-electrical': 'Grey Electrical (Rough-In)',
  'grey-plumbing': 'Grey Plumbing (Rough-In)',
  reinforcement: 'Reinforcement',
  formwork: 'Formwork',
  plaster: 'Plaster',
  flooring: 'Flooring',
  ceiling: 'Ceiling',
  paint: 'Paint & Surface Finish',
  waterproofing: 'Waterproofing',
  doors: 'Doors',
  windows: 'Windows',
  kitchen: 'Kitchen',
  washroom: 'Washroom',
  'electrical-finishing': 'Electrical Finishing',
  'plumbing-finishing': 'Plumbing Finishing',
  'misc-finishing': 'Miscellaneous Finishing',
  'boundary-external': 'Boundary Wall',
  'gates-driveways': 'Gates & Driveways',
  'drainage-external': 'External Drainage',
  landscaping: 'Landscaping',
  'underground-tanks': 'Underground Water Tank',
  'septic-soak': 'Septic Tank / Soak Pit',
  transportation: 'Transportation',
  'loading-unloading': 'Loading / Unloading',
  waste: 'Waste',
  overhead: 'Overhead',
  'contractor-profit': 'Contractor Profit',
  contingency: 'Contingency',
  taxes: 'Taxes',
  unclassified: 'Unclassified',
};

export const MATERIAL_CATEGORY_LABELS: Record<MaterialCategory, string> = {
  'cement-concrete': 'Cement & Concrete',
  cement: 'Cement',
  sand: 'Sand',
  crush: 'Crush / Aggregate',
  reinforcement: 'Reinforcement',
  steel: 'Steel',
  masonry: 'Masonry',
  bricks: 'Bricks',
  blocks: 'Blocks',
  formwork: 'Formwork',
  timber: 'Timber',
  plaster: 'Plaster',
  flooring: 'Flooring',
  tiles: 'Tiles',
  adhesive: 'Adhesives',
  paint: 'Paint',
  waterproofing: 'Waterproofing',
  doors: 'Doors',
  windows: 'Windows',
  wood: 'Wood',
  hardware: 'Hardware',
  electrical: 'Electrical',
  plumbing: 'Plumbing',
  roofing: 'Roofing',
  miscellaneous: 'Miscellaneous',
  other: 'Other',
};

export const UNIT_LABELS: Record<Unit, string> = {
  m: 'Meter (m)',
  m2: 'Square Meter (m²)',
  m3: 'Cubic Meter (m³)',
  kg: 'Kilogram (kg)',
  ton: 'Ton',
  nos: 'Number (nos)',
  bag: 'Bag (50 kg)',
  cft: 'Cubic Foot (cft)',
  sft: 'Square Foot (sft)',
  ltr: 'Litre (ltr)',
  gallon: 'Gallon',
  job: 'Job / Lump sum',
  rft: 'Running Foot (rft)',
  rm: 'Running Meter (rm)',
  set: 'Set',
  pair: 'Pair',
  hour: 'Hour',
  day: 'Day',
};

