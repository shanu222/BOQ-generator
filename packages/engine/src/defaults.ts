import type {
  EquipmentRate,
  LabourRate,
  MaterialRate,
  ProjectState,
} from '@boq/shared';
import { DEFAULT_RATE_FACTORS } from '@boq/shared';

/** Pakistan market default rates (indicative PKR — editable by user) */
export const DEFAULT_MATERIALS: MaterialRate[] = [
  { id: 'cement', name: 'Ordinary Portland Cement', description: 'OPC 53 Grade, 50kg bag', category: 'cement', unit: 'bag', defaultRate: 1450, rate: 1450, consumptionNote: 'Per mix design' },
  { id: 'sand', name: 'Fine Sand (Chenab / Ravi)', description: 'Clean fine aggregate', category: 'sand', unit: 'm3', defaultRate: 4500, rate: 4500 },
  { id: 'crush', name: 'Crush / Aggregate ¾"', description: 'Coarse aggregate', category: 'crush', unit: 'm3', defaultRate: 6500, rate: 6500 },
  { id: 'bricks', name: 'First Class Burnt Clay Bricks', description: 'Standard size bricks', category: 'bricks', unit: 'nos', defaultRate: 18, rate: 18 },
  { id: 'blocks', name: 'Hollow Concrete Blocks 6"', description: 'Concrete hollow blocks', category: 'blocks', unit: 'nos', defaultRate: 95, rate: 95 },
  { id: 'steel-deformed', name: 'Deformed Steel Bars (Grade 60)', description: 'Tor steel Grade 60', category: 'steel', unit: 'kg', defaultRate: 280, rate: 280 },
  { id: 'binding-wire', name: 'Binding Wire', description: '16–18 SWG binding wire', category: 'steel', unit: 'kg', defaultRate: 320, rate: 320 },
  { id: 'paint', name: 'Plastic Emulsion Paint', description: 'Interior/exterior emulsion', category: 'paint', unit: 'ltr', defaultRate: 950, rate: 950 },
  { id: 'primer', name: 'Wall Primer', description: 'Acrylic wall primer', category: 'paint', unit: 'ltr', defaultRate: 650, rate: 650 },
  { id: 'putty', name: 'Wall Putty', description: 'White cement based putty', category: 'paint', unit: 'kg', defaultRate: 55, rate: 55 },
  { id: 'floor-tiles', name: 'Porcelain Floor Tiles 600×600', description: 'Premium porcelain', category: 'tiles', unit: 'm2', defaultRate: 2200, rate: 2200 },
  { id: 'wall-tiles', name: 'Ceramic Wall Tiles 300×600', description: 'Glazed ceramic', category: 'tiles', unit: 'm2', defaultRate: 1800, rate: 1800 },
  { id: 'tile-adhesive', name: 'Tile Adhesive', description: 'Polymer modified adhesive', category: 'adhesive', unit: 'kg', defaultRate: 45, rate: 45 },
  { id: 'tile-grout', name: 'Tile Grout', description: 'Cementitious grout', category: 'adhesive', unit: 'kg', defaultRate: 80, rate: 80 },
  { id: 'waterproofing', name: 'Bituminous Waterproofing Membrane', description: 'APP/SBS membrane', category: 'waterproofing', unit: 'm2', defaultRate: 450, rate: 450 },
  { id: 'door-shutter', name: 'Solid Core Flush Door', description: 'Commercial flush door', category: 'wood', unit: 'm2', defaultRate: 4500, rate: 4500 },
  { id: 'aluminium-window', name: 'Aluminium Window with Glass', description: 'Sliding/casement aluminium', category: 'hardware', unit: 'm2', defaultRate: 12000, rate: 12000 },
  { id: 'gypsum-board', name: 'Gypsum Board Ceiling', description: '12.5mm gypsum with frame', category: 'other', unit: 'm2', defaultRate: 850, rate: 850 },
];

export const DEFAULT_LABOUR: LabourRate[] = [
  { id: 'excavation-labour', name: 'Excavation Labour', description: 'Manual/assisted excavation', unit: 'm3', defaultRate: 450, rate: 450 },
  { id: 'concrete-labour', name: 'Concrete Labour', description: 'Mixing, placing, curing', unit: 'm3', defaultRate: 1800, rate: 1800 },
  { id: 'formwork-labour', name: 'Formwork Labour', description: 'Shuttering & striking', unit: 'm2', defaultRate: 350, rate: 350 },
  { id: 'steel-fixer', name: 'Steel Fixer', description: 'Cutting, bending, binding', unit: 'ton', defaultRate: 18000, rate: 18000 },
  { id: 'masonry-labour', name: 'Masonry Labour', description: 'Brick/block laying', unit: 'm3', defaultRate: 2200, rate: 2200 },
  { id: 'plaster-labour', name: 'Plaster Labour', description: 'Cement plaster', unit: 'm2', defaultRate: 85, rate: 85 },
  { id: 'paint-labour', name: 'Paint Labour', description: 'Painting & finishing', unit: 'm2', defaultRate: 45, rate: 45 },
  { id: 'tile-labour', name: 'Tile Labour', description: 'Tile fixing', unit: 'm2', defaultRate: 120, rate: 120 },
  { id: 'backfill-labour', name: 'Backfill Labour', description: 'Backfilling & watering', unit: 'm3', defaultRate: 280, rate: 280 },
  { id: 'roofing-labour', name: 'Roofing Labour', description: 'Screed & membrane', unit: 'm2', defaultRate: 95, rate: 95 },
  { id: 'waterproof-labour', name: 'Waterproofing Labour', description: 'Membrane application', unit: 'm2', defaultRate: 80, rate: 80 },
  { id: 'carpenter-labour', name: 'Carpenter / Fitter', description: 'Doors & windows fixing', unit: 'nos', defaultRate: 1500, rate: 1500 },
  { id: 'ceiling-labour', name: 'Ceiling Labour', description: 'False ceiling install', unit: 'm2', defaultRate: 150, rate: 150 },
];

export const DEFAULT_EQUIPMENT: EquipmentRate[] = [
  { id: 'excavator', name: 'Excavator / Loader', description: 'Hired excavator with operator', unit: 'job', defaultRate: 18000, rate: 18000 },
  { id: 'concrete-mixer', name: 'Concrete Mixer', description: 'Mechanical mixer', unit: 'job', defaultRate: 3500, rate: 3500 },
  { id: 'vibrator', name: 'Needle Vibrator', description: 'Concrete vibrator', unit: 'job', defaultRate: 1500, rate: 1500 },
  { id: 'scaffolding', name: 'Scaffolding', description: 'Pipe scaffolding hire', unit: 'job', defaultRate: 8000, rate: 8000 },
];

export function createDefaultProject(partial?: Partial<ProjectState>): ProjectState {
  return {
    name: partial?.name ?? 'Untitled Estimate',
    location: partial?.location ?? 'Pakistan',
    client: partial?.client ?? '',
    preparedBy: partial?.preparedBy ?? '',
    date: partial?.date ?? new Date().toISOString().slice(0, 10),
    entries: partial?.entries ?? [],
    materialRates: partial?.materialRates ?? DEFAULT_MATERIALS.map((m) => ({ ...m })),
    labourRates: partial?.labourRates ?? DEFAULT_LABOUR.map((l) => ({ ...l })),
    equipmentRates: partial?.equipmentRates ?? DEFAULT_EQUIPMENT.map((e) => ({ ...e })),
    rateFactors: partial?.rateFactors ?? { ...DEFAULT_RATE_FACTORS },
    boqOverrides: partial?.boqOverrides ?? {},
    sectionOrder: partial?.sectionOrder ?? [],
  };
}
