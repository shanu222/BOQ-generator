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
  | 'rm';

export type MaterialCategory =
  | 'cement'
  | 'sand'
  | 'crush'
  | 'bricks'
  | 'blocks'
  | 'steel'
  | 'paint'
  | 'tiles'
  | 'waterproofing'
  | 'adhesive'
  | 'wood'
  | 'hardware'
  | 'other';

export type CostCategory = 'material' | 'labour' | 'equipment';

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
  | 'septic-tank';

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
}

export interface LabourRate {
  id: string;
  name: string;
  description: string;
  unit: Unit;
  defaultRate: number;
  rate: number;
}

export interface EquipmentRate {
  id: string;
  name: string;
  description: string;
  unit: Unit;
  defaultRate: number;
  rate: number;
}

export interface RateAnalysisFactors {
  transportationPercent: number;
  loadingUnloadingPercent: number;
  wastePercent: number;
  overheadPercent: number;
  contractorProfitPercent: number;
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
}

export interface LabourLine {
  id: string;
  labourId: string;
  name: string;
  unit: Unit;
  quantity: number;
  rate: number;
  amount: number;
}

export interface EquipmentLine {
  id: string;
  equipmentId: string;
  name: string;
  unit: Unit;
  quantity: number;
  rate: number;
  amount: number;
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
  tax: number;
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
  transportationPercent: 3,
  loadingUnloadingPercent: 1.5,
  wastePercent: 5,
  overheadPercent: 8,
  contractorProfitPercent: 10,
  taxPercent: 0,
};
