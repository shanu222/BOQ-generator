import type {
  EquipmentRate,
  LabourRate,
  MaterialRate,
  ProjectState,
} from '@boq/shared';
import { DEFAULT_RATE_FACTORS } from '@boq/shared';

/**
 * Pakistan residential construction rate database (indicative market PKR).
 * Engine-consumed IDs are marked in comments — do not rename those IDs.
 * Users may edit `rate`; `defaultRate` is the factory reset value.
 */

function m(
  partial: MaterialRate,
): MaterialRate {
  return { ...partial, rate: partial.rate ?? partial.defaultRate };
}

function l(partial: LabourRate): LabourRate {
  return {
    rateBasis: 'unit',
    category: 'general',
    ...partial,
    rate: partial.rate ?? partial.defaultRate,
  };
}

function e(partial: EquipmentRate): EquipmentRate {
  return {
    rateBasis: 'daily',
    category: 'general',
    ...partial,
    rate: partial.rate ?? partial.defaultRate,
  };
}

/** ENGINE-USED material IDs must stay stable */
export const DEFAULT_MATERIALS: MaterialRate[] = [
  // —— Cement & Concrete ——
  m({ id: 'cement', name: 'Ordinary Portland Cement (50 kg)', description: 'OPC 53 Grade — standard bag', category: 'cement', unit: 'bag', defaultRate: 1450, rate: 1450, consumptionNote: 'ENGINE: concrete, masonry, plaster, roofing' }),
  m({ id: 'cement-opc-42', name: 'OPC 42.5 Grade Cement (50 kg)', description: 'General purpose OPC', category: 'cement-concrete', unit: 'bag', defaultRate: 1380, rate: 1380 }),
  m({ id: 'sand', name: 'Fine Sand (Chenab / Ravi)', description: 'Clean fine aggregate for mortar & concrete', category: 'sand', unit: 'm3', defaultRate: 4500, rate: 4500, consumptionNote: 'ENGINE: concrete, masonry, plaster' }),
  m({ id: 'sand-cft', name: 'Fine Sand', description: 'Same sand priced per cubic foot', category: 'sand', unit: 'cft', defaultRate: 45, rate: 45 }),
  m({ id: 'crush', name: 'Crush / Coarse Aggregate ¾"', description: 'Crushed stone for RCC', category: 'crush', unit: 'm3', defaultRate: 6500, rate: 6500, consumptionNote: 'ENGINE: concrete' }),
  m({ id: 'crush-cft', name: 'Crush / Aggregate ¾"', description: 'Priced per cft', category: 'crush', unit: 'cft', defaultRate: 65, rate: 65 }),
  m({ id: 'fine-aggregate', name: 'Fine Aggregate (Screened)', description: 'Screened fine aggregate', category: 'cement-concrete', unit: 'm3', defaultRate: 4800, rate: 4800 }),
  m({ id: 'coarse-aggregate', name: 'Coarse Aggregate 1–1½"', description: 'Larger coarse aggregate', category: 'cement-concrete', unit: 'm3', defaultRate: 6200, rate: 6200 }),
  m({ id: 'ready-mix-m15', name: 'Ready Mix Concrete M15', description: 'Transit mixer delivered', category: 'cement-concrete', unit: 'm3', defaultRate: 14500, rate: 14500 }),
  m({ id: 'ready-mix-m20', name: 'Ready Mix Concrete M20', description: 'Transit mixer delivered', category: 'cement-concrete', unit: 'm3', defaultRate: 16500, rate: 16500 }),
  m({ id: 'water', name: 'Construction Water', description: 'Potable water for mixing/curing', category: 'cement-concrete', unit: 'ltr', defaultRate: 0.15, rate: 0.15 }),
  m({ id: 'admixture-plasticizer', name: 'Concrete Plasticizer', description: 'Water-reducing admixture', category: 'cement-concrete', unit: 'ltr', defaultRate: 280, rate: 280 }),

  // —— Reinforcement ——
  m({ id: 'steel-deformed', name: 'Deformed Steel Bars Grade 60', description: 'Tor steel Grade 60 (ENGINE)', category: 'steel', unit: 'kg', defaultRate: 280, rate: 280, consumptionNote: 'ENGINE: RCC & BBS' }),
  m({ id: 'steel-grade-40', name: 'Deformed Steel Bars Grade 40', description: 'Milder grade for lighter works', category: 'reinforcement', unit: 'kg', defaultRate: 265, rate: 265 }),
  m({ id: 'steel-grade-60-ton', name: 'Deformed Steel Grade 60', description: 'Same steel per ton', category: 'reinforcement', unit: 'ton', defaultRate: 280000, rate: 280000 }),
  m({ id: 'binding-wire', name: 'Binding Wire 16–18 SWG', description: 'Annealed binding wire (ENGINE)', category: 'steel', unit: 'kg', defaultRate: 320, rate: 320, consumptionNote: 'ENGINE: with steel' }),
  m({ id: 'spacer-blocks', name: 'Concrete Spacer Blocks', description: 'Cover blocks for reinforcement', category: 'reinforcement', unit: 'nos', defaultRate: 8, rate: 8 }),

  // —— Masonry ——
  m({ id: 'bricks', name: 'First Class Burnt Clay Bricks', description: 'Standard modular bricks (ENGINE)', category: 'bricks', unit: 'nos', defaultRate: 18, rate: 18, consumptionNote: 'ENGINE: masonry' }),
  m({ id: 'bricks-a-class', name: 'A-Class Bricks', description: 'Selected facing bricks', category: 'masonry', unit: 'nos', defaultRate: 22, rate: 22 }),
  m({ id: 'blocks', name: 'Hollow Concrete Blocks 6"', description: 'Hollow blocks (ENGINE)', category: 'blocks', unit: 'nos', defaultRate: 95, rate: 95, consumptionNote: 'ENGINE: blockwork' }),
  m({ id: 'blocks-solid', name: 'Solid Concrete Blocks 6"', description: 'Solid concrete blocks', category: 'masonry', unit: 'nos', defaultRate: 110, rate: 110 }),
  m({ id: 'blocks-hollow-4', name: 'Hollow Concrete Blocks 4"', description: 'Partition blocks', category: 'masonry', unit: 'nos', defaultRate: 70, rate: 70 }),
  m({ id: 'mortar-ready', name: 'Ready Mixed Mortar', description: 'Premix masonry mortar', category: 'masonry', unit: 'bag', defaultRate: 650, rate: 650 }),

  // —— Formwork ——
  m({ id: 'shuttering-ply', name: 'Shuttering Plywood 12mm', description: 'Film-faced shuttering ply', category: 'formwork', unit: 'm2', defaultRate: 1800, rate: 1800 }),
  m({ id: 'wooden-battens', name: 'Wooden Battens / Runner', description: 'Formwork timber battens', category: 'formwork', unit: 'rm', defaultRate: 120, rate: 120 }),
  m({ id: 'steel-props', name: 'Adjustable Steel Props', description: 'Acro props hire/purchase equiv.', category: 'formwork', unit: 'nos', defaultRate: 850, rate: 850 }),
  m({ id: 'formwork-oil', name: 'Formwork Release Oil', description: 'Mould oil', category: 'formwork', unit: 'ltr', defaultRate: 220, rate: 220 }),
  m({ id: 'nails', name: 'Wire Nails Assorted', description: 'Carpentry nails', category: 'formwork', unit: 'kg', defaultRate: 280, rate: 280 }),
  m({ id: 'timber-planks', name: 'Timber Planks', description: 'Softwood formwork timber', category: 'timber', unit: 'cft', defaultRate: 3500, rate: 3500 }),

  // —— Plaster ——
  m({ id: 'plaster-mesh', name: 'Chicken Mesh / Lath', description: 'For junctions & crack control', category: 'plaster', unit: 'm2', defaultRate: 95, rate: 95 }),
  m({ id: 'corner-beads', name: 'PVC / Metal Corner Beads', description: 'External angle beads', category: 'plaster', unit: 'rm', defaultRate: 45, rate: 45 }),

  // —— Flooring ——
  m({ id: 'floor-tiles', name: 'Porcelain Floor Tiles 600×600', description: 'Premium porcelain (ENGINE)', category: 'tiles', unit: 'm2', defaultRate: 2200, rate: 2200, consumptionNote: 'ENGINE: floor tiles' }),
  m({ id: 'wall-tiles', name: 'Ceramic Wall Tiles 300×600', description: 'Glazed ceramic (ENGINE)', category: 'tiles', unit: 'm2', defaultRate: 1800, rate: 1800, consumptionNote: 'ENGINE: wall tiles' }),
  m({ id: 'ceramic-floor-tiles', name: 'Ceramic Floor Tiles 400×400', description: 'Standard ceramic flooring', category: 'flooring', unit: 'm2', defaultRate: 1600, rate: 1600 }),
  m({ id: 'granite', name: 'Granite Flooring', description: 'Polished granite laid', category: 'flooring', unit: 'm2', defaultRate: 5500, rate: 5500 }),
  m({ id: 'marble', name: 'Marble Flooring', description: 'Local marble laid & polished', category: 'flooring', unit: 'm2', defaultRate: 4200, rate: 4200 }),
  m({ id: 'tile-adhesive', name: 'Tile Adhesive', description: 'Polymer modified (ENGINE)', category: 'adhesive', unit: 'kg', defaultRate: 45, rate: 45, consumptionNote: 'ENGINE: tiling' }),
  m({ id: 'tile-grout', name: 'Tile Grout', description: 'Cementitious grout (ENGINE)', category: 'adhesive', unit: 'kg', defaultRate: 80, rate: 80, consumptionNote: 'ENGINE: tiling' }),
  m({ id: 'skirting', name: 'Ceramic / Porcelain Skirting', description: 'Matching skirting', category: 'flooring', unit: 'rm', defaultRate: 350, rate: 350 }),

  // —— Paint ——
  m({ id: 'paint', name: 'Plastic Emulsion Paint', description: 'Interior/exterior emulsion (ENGINE)', category: 'paint', unit: 'ltr', defaultRate: 950, rate: 950, consumptionNote: 'ENGINE: paint' }),
  m({ id: 'primer', name: 'Wall Primer / Sealer', description: 'Acrylic primer (ENGINE)', category: 'paint', unit: 'ltr', defaultRate: 650, rate: 650, consumptionNote: 'ENGINE: paint' }),
  m({ id: 'putty', name: 'Wall Putty', description: 'White cement putty (ENGINE)', category: 'paint', unit: 'kg', defaultRate: 55, rate: 55, consumptionNote: 'ENGINE: paint' }),
  m({ id: 'enamel-paint', name: 'Synthetic Enamel Paint', description: 'Wood/metal enamel', category: 'paint', unit: 'ltr', defaultRate: 1100, rate: 1100 }),
  m({ id: 'texture-paint', name: 'Texture / Weather Shield', description: 'Textured exterior coating', category: 'paint', unit: 'ltr', defaultRate: 1400, rate: 1400 }),

  // —— Waterproofing ——
  m({ id: 'waterproofing', name: 'Bituminous Waterproof Membrane', description: 'APP/SBS membrane (ENGINE)', category: 'waterproofing', unit: 'm2', defaultRate: 450, rate: 450, consumptionNote: 'ENGINE: roofing, WP, tanks' }),
  m({ id: 'bitumen', name: 'Bitumen 80/100', description: 'Hot applied bitumen', category: 'waterproofing', unit: 'kg', defaultRate: 180, rate: 180 }),
  m({ id: 'waterproof-chemical', name: 'Cementitious Waterproof Chemical', description: 'Crystalline / slurry WP', category: 'waterproofing', unit: 'kg', defaultRate: 220, rate: 220 }),
  m({ id: 'sealant-silicone', name: 'Silicone Sealant', description: 'Neutral cure silicone', category: 'miscellaneous', unit: 'nos', defaultRate: 450, rate: 450 }),

  // —— Doors ——
  m({ id: 'door-shutter', name: 'Solid Core Flush Door', description: 'Commercial flush door (ENGINE)', category: 'wood', unit: 'm2', defaultRate: 4500, rate: 4500, consumptionNote: 'ENGINE: doors' }),
  m({ id: 'wooden-door', name: 'Solid Teak / Ash Door', description: 'Hardwood panel door', category: 'doors', unit: 'nos', defaultRate: 35000, rate: 35000 }),
  m({ id: 'steel-door', name: 'Steel Security Door', description: 'Pressed steel door', category: 'doors', unit: 'nos', defaultRate: 28000, rate: 28000 }),
  m({ id: 'upvc-door', name: 'UPVC Door', description: 'UPVC entrance/patio door', category: 'doors', unit: 'm2', defaultRate: 9500, rate: 9500 }),
  m({ id: 'door-frame', name: 'Wooden / Steel Door Frame', description: 'Door chowkat', category: 'doors', unit: 'nos', defaultRate: 8500, rate: 8500 }),
  m({ id: 'door-hinges', name: 'Door Hinges (pair)', description: 'SS / brass hinges', category: 'hardware', unit: 'pair', defaultRate: 650, rate: 650 }),
  m({ id: 'door-lock', name: 'Mortice Lock Set', description: 'Cylinder lock', category: 'hardware', unit: 'set', defaultRate: 2500, rate: 2500 }),
  m({ id: 'door-handle', name: 'Door Handle Set', description: 'Lever handles', category: 'hardware', unit: 'set', defaultRate: 1800, rate: 1800 }),

  // —— Windows ——
  m({ id: 'aluminium-window', name: 'Aluminium Window with Glass', description: 'Sliding/casement (ENGINE)', category: 'hardware', unit: 'm2', defaultRate: 12000, rate: 12000, consumptionNote: 'ENGINE: windows' }),
  m({ id: 'upvc-window', name: 'UPVC Window with Glass', description: 'UPVC casement/sliding', category: 'windows', unit: 'm2', defaultRate: 11000, rate: 11000 }),
  m({ id: 'glass-5mm', name: 'Clear Float Glass 5mm', description: 'Window glass', category: 'windows', unit: 'm2', defaultRate: 1800, rate: 1800 }),
  m({ id: 'window-hardware', name: 'Window Hardware Set', description: 'Handles, stays, rollers', category: 'windows', unit: 'set', defaultRate: 2200, rate: 2200 }),

  // —— Electrical (catalog — for future grey/finishing MEP modules) ——
  m({ id: 'pvc-conduit-25', name: 'PVC Conduit 25mm', description: 'Grey electrical conduit', category: 'electrical', unit: 'rm', defaultRate: 45, rate: 45 }),
  m({ id: 'electrical-pipe-gi', name: 'GI Electrical Pipe 1"', description: 'Surface/concealed GI pipe', category: 'electrical', unit: 'rm', defaultRate: 280, rate: 280 }),
  m({ id: 'junction-box', name: 'Junction Box', description: 'PVC junction box', category: 'electrical', unit: 'nos', defaultRate: 85, rate: 85 }),
  m({ id: 'switch-box', name: 'Switch / Socket Box', description: 'Back box', category: 'electrical', unit: 'nos', defaultRate: 95, rate: 95 }),
  m({ id: 'fan-box', name: 'Ceiling Fan Hook Box', description: 'Fan box with hook', category: 'electrical', unit: 'nos', defaultRate: 220, rate: 220 }),
  m({ id: 'db-box', name: 'Distribution Board Box', description: 'DB enclosure', category: 'electrical', unit: 'nos', defaultRate: 4500, rate: 4500 }),
  m({ id: 'mcb-10a', name: 'MCB 10A Single Pole', description: 'Miniature circuit breaker', category: 'electrical', unit: 'nos', defaultRate: 450, rate: 450 }),
  m({ id: 'rccb-40a', name: 'RCCB 40A 30mA', description: 'Residual current breaker', category: 'electrical', unit: 'nos', defaultRate: 4500, rate: 4500 }),
  m({ id: 'copper-wire-1.5', name: 'Copper Wire 1.5mm²', description: 'PVC insulated', category: 'electrical', unit: 'rm', defaultRate: 35, rate: 35 }),
  m({ id: 'copper-wire-2.5', name: 'Copper Wire 2.5mm²', description: 'PVC insulated', category: 'electrical', unit: 'rm', defaultRate: 55, rate: 55 }),
  m({ id: 'copper-wire-4', name: 'Copper Wire 4mm²', description: 'PVC insulated', category: 'electrical', unit: 'rm', defaultRate: 85, rate: 85 }),
  m({ id: 'copper-wire-6', name: 'Copper Wire 6mm²', description: 'PVC insulated', category: 'electrical', unit: 'rm', defaultRate: 120, rate: 120 }),
  m({ id: 'flexible-cable', name: 'Flexible Cable 3-Core', description: 'Appliance flex', category: 'electrical', unit: 'rm', defaultRate: 95, rate: 95 }),
  m({ id: 'switch-1way', name: '1-Way Switch 10A', description: 'Piano / modular switch', category: 'electrical', unit: 'nos', defaultRate: 180, rate: 180 }),
  m({ id: 'socket-5a', name: '5A / 15A Socket', description: 'Power socket', category: 'electrical', unit: 'nos', defaultRate: 280, rate: 280 }),
  m({ id: 'led-light', name: 'LED Bulb / Panel 12–18W', description: 'Energy saving light', category: 'electrical', unit: 'nos', defaultRate: 650, rate: 650 }),
  m({ id: 'ceiling-light', name: 'Ceiling Light Fitting', description: 'Surface / recessed fitting', category: 'electrical', unit: 'nos', defaultRate: 1800, rate: 1800 }),
  m({ id: 'downlight', name: 'LED Downlight', description: 'Recessed downlight', category: 'electrical', unit: 'nos', defaultRate: 1200, rate: 1200 }),
  m({ id: 'ceiling-fan', name: 'Ceiling Fan 56"', description: 'AC ceiling fan', category: 'electrical', unit: 'nos', defaultRate: 6500, rate: 6500 }),
  m({ id: 'exhaust-fan', name: 'Exhaust Fan 8–12"', description: 'Washroom/kitchen exhaust', category: 'electrical', unit: 'nos', defaultRate: 3500, rate: 3500 }),
  m({ id: 'earthing-rod', name: 'Earthing Rod Copper Bonded', description: 'Earth electrode', category: 'electrical', unit: 'nos', defaultRate: 2800, rate: 2800 }),
  m({ id: 'earthing-cable', name: 'Earthing Cable 6–10mm²', description: 'Earth continuity conductor', category: 'electrical', unit: 'rm', defaultRate: 95, rate: 95 }),

  // —— Plumbing ——
  m({ id: 'upvc-pipe-1', name: 'UPVC Pipe 1"', description: 'Water supply UPVC', category: 'plumbing', unit: 'rm', defaultRate: 220, rate: 220 }),
  m({ id: 'pprc-pipe-25', name: 'PPRC Pipe 25mm', description: 'Hot/cold water PPR', category: 'plumbing', unit: 'rm', defaultRate: 280, rate: 280 }),
  m({ id: 'pvc-pipe-4', name: 'PVC Soil Pipe 4"', description: 'Drainage PVC', category: 'plumbing', unit: 'rm', defaultRate: 450, rate: 450 }),
  m({ id: 'sewer-pipe-6', name: 'Sewer Pipe 6"', description: 'External sewer', category: 'plumbing', unit: 'rm', defaultRate: 850, rate: 850 }),
  m({ id: 'pipe-fittings', name: 'Pipe Fittings Assorted', description: 'Elbows, tees, sockets (avg)', category: 'plumbing', unit: 'nos', defaultRate: 150, rate: 150 }),
  m({ id: 'floor-trap', name: 'Floor Trap with Grating', description: 'WP floor trap', category: 'plumbing', unit: 'nos', defaultRate: 850, rate: 850 }),
  m({ id: 'valve-ball', name: 'Ball Valve Brass', description: 'Isolation valve', category: 'plumbing', unit: 'nos', defaultRate: 650, rate: 650 }),
  m({ id: 'water-tank-plastic', name: 'Plastic Water Tank 500 gal', description: 'HDPE overhead tank', category: 'plumbing', unit: 'nos', defaultRate: 28000, rate: 28000 }),
  m({ id: 'wash-basin', name: 'Wash Basin with Pedestal', description: 'Ceramic wash basin', category: 'plumbing', unit: 'set', defaultRate: 8500, rate: 8500 }),
  m({ id: 'wc-set', name: 'WC / Commode Set', description: 'English / Arabic WC', category: 'plumbing', unit: 'set', defaultRate: 16000, rate: 16000 }),
  m({ id: 'shower-set', name: 'Shower Set', description: 'Mixer shower set', category: 'plumbing', unit: 'set', defaultRate: 7500, rate: 7500 }),
  m({ id: 'mixer-tap', name: 'Basin / Sink Mixer', description: 'Single lever mixer', category: 'plumbing', unit: 'nos', defaultRate: 4500, rate: 4500 }),
  m({ id: 'kitchen-sink', name: 'Kitchen Sink Stainless', description: 'Single/double bowl sink', category: 'plumbing', unit: 'nos', defaultRate: 12000, rate: 12000 }),
  m({ id: 'geyser-connection', name: 'Geyser Connection Kit', description: 'Valves & flexible pipes', category: 'plumbing', unit: 'set', defaultRate: 2500, rate: 2500 }),
  m({ id: 'water-pump', name: 'Water Booster Pump 0.5–1 HP', description: 'Domestic pump', category: 'plumbing', unit: 'nos', defaultRate: 18000, rate: 18000 }),

  // —— Roofing / ceiling ——
  m({ id: 'gypsum-board', name: 'Gypsum Board Ceiling 12.5mm', description: 'Board with frame allowance (ENGINE)', category: 'other', unit: 'm2', defaultRate: 850, rate: 850, consumptionNote: 'ENGINE: ceiling' }),
  m({ id: 'roof-insulation', name: 'Roof Thermal Insulation', description: 'XPS / foam insulation', category: 'roofing', unit: 'm2', defaultRate: 650, rate: 650 }),
  m({ id: 'roof-tiles', name: 'Clay / Concrete Roof Tiles', description: 'Decorative roof tiles', category: 'roofing', unit: 'm2', defaultRate: 2200, rate: 2200 }),

  // —— Miscellaneous ——
  m({ id: 'expansion-joint', name: 'Expansion Joint Filler', description: 'Bitumen board / foam', category: 'miscellaneous', unit: 'rm', defaultRate: 350, rate: 350 }),
  m({ id: 'chemical-anchor', name: 'Chemical Anchor Capsule', description: 'Epoxy/polyester anchor', category: 'miscellaneous', unit: 'nos', defaultRate: 450, rate: 450 }),
  m({ id: 'fasteners', name: 'Fasteners Assorted', description: 'Screws, bolts, anchors (kg)', category: 'miscellaneous', unit: 'kg', defaultRate: 400, rate: 400 }),
  m({ id: 'grills', name: 'MS Window Grills', description: 'Mild steel grills', category: 'miscellaneous', unit: 'm2', defaultRate: 3500, rate: 3500 }),
  m({ id: 'railings', name: 'MS / SS Railings', description: 'Staircase / balcony railing', category: 'miscellaneous', unit: 'rm', defaultRate: 4500, rate: 4500 }),
];

export const DEFAULT_LABOUR: LabourRate[] = [
  // —— ENGINE unit rates (must keep IDs) ——
  l({ id: 'excavation-labour', name: 'Excavation Labour', description: 'Manual/assisted excavation (ENGINE)', unit: 'm3', defaultRate: 450, rate: 450, category: 'earthwork', rateBasis: 'unit' }),
  l({ id: 'backfill-labour', name: 'Backfill Labour', description: 'Backfilling & watering (ENGINE)', unit: 'm3', defaultRate: 280, rate: 280, category: 'earthwork', rateBasis: 'unit' }),
  l({ id: 'concrete-labour', name: 'Concrete Labour', description: 'Mixing, placing, curing (ENGINE)', unit: 'm3', defaultRate: 1800, rate: 1800, category: 'concrete', rateBasis: 'unit' }),
  l({ id: 'formwork-labour', name: 'Shuttering Carpenter (unit)', description: 'Formwork erect & strike (ENGINE)', unit: 'm2', defaultRate: 350, rate: 350, category: 'concrete', rateBasis: 'unit' }),
  l({ id: 'steel-fixer', name: 'Steel Fixer', description: 'Cut, bend, bind — per kg steel (ENGINE)', unit: 'kg', defaultRate: 18, rate: 18, category: 'steel', rateBasis: 'unit' }),
  l({ id: 'masonry-labour', name: 'Masonry Labour', description: 'Brick/block laying (ENGINE)', unit: 'm3', defaultRate: 2200, rate: 2200, category: 'masonry', rateBasis: 'unit' }),
  l({ id: 'plaster-labour', name: 'Plaster Labour', description: 'Cement plaster (ENGINE)', unit: 'm2', defaultRate: 85, rate: 85, category: 'finishing', rateBasis: 'unit' }),
  l({ id: 'paint-labour', name: 'Painter (unit)', description: 'Painting & finishing (ENGINE)', unit: 'm2', defaultRate: 45, rate: 45, category: 'finishing', rateBasis: 'unit' }),
  l({ id: 'tile-labour', name: 'Tile Fixer (unit)', description: 'Tile fixing (ENGINE)', unit: 'm2', defaultRate: 120, rate: 120, category: 'finishing', rateBasis: 'unit' }),
  l({ id: 'roofing-labour', name: 'Roofing Labour', description: 'Screed & membrane (ENGINE)', unit: 'm2', defaultRate: 95, rate: 95, category: 'finishing', rateBasis: 'unit' }),
  l({ id: 'waterproof-labour', name: 'Waterproofing Labour', description: 'Membrane application (ENGINE)', unit: 'm2', defaultRate: 80, rate: 80, category: 'finishing', rateBasis: 'unit' }),
  l({ id: 'carpenter-labour', name: 'Carpenter / Fitter', description: 'Doors & windows fixing (ENGINE)', unit: 'nos', defaultRate: 1500, rate: 1500, category: 'openings', rateBasis: 'unit' }),
  l({ id: 'ceiling-labour', name: 'Ceiling Labour', description: 'False ceiling install (ENGINE)', unit: 'm2', defaultRate: 150, rate: 150, category: 'finishing', rateBasis: 'unit' }),

  // —— Daily wages (catalog / planning) ——
  l({ id: 'mason-daily', name: 'Mason', description: 'Skilled mason daily wage', unit: 'day', defaultRate: 2500, rate: 2500, category: 'masonry', rateBasis: 'daily' }),
  l({ id: 'carpenter-daily', name: 'Carpenter', description: 'Skilled carpenter daily wage', unit: 'day', defaultRate: 2800, rate: 2800, category: 'openings', rateBasis: 'daily' }),
  l({ id: 'steel-fixer-daily', name: 'Steel Fixer (daily)', description: 'Steel fixer daily wage', unit: 'day', defaultRate: 2800, rate: 2800, category: 'steel', rateBasis: 'daily' }),
  l({ id: 'painter-daily', name: 'Painter', description: 'Painter daily wage', unit: 'day', defaultRate: 2200, rate: 2200, category: 'finishing', rateBasis: 'daily' }),
  l({ id: 'tile-fixer-daily', name: 'Tile Fixer', description: 'Tile fixer daily wage', unit: 'day', defaultRate: 2500, rate: 2500, category: 'finishing', rateBasis: 'daily' }),
  l({ id: 'electrician-daily', name: 'Electrician', description: 'Licensed electrician daily wage', unit: 'day', defaultRate: 3000, rate: 3000, category: 'electrical', rateBasis: 'daily' }),
  l({ id: 'plumber-daily', name: 'Plumber', description: 'Plumber daily wage', unit: 'day', defaultRate: 2800, rate: 2800, category: 'plumbing', rateBasis: 'daily' }),
  l({ id: 'shuttering-carpenter-daily', name: 'Shuttering Carpenter', description: 'Formwork carpenter daily', unit: 'day', defaultRate: 2700, rate: 2700, category: 'concrete', rateBasis: 'daily' }),
  l({ id: 'excavator-operator-daily', name: 'Excavator Operator', description: 'Plant operator daily', unit: 'day', defaultRate: 3500, rate: 3500, category: 'earthwork', rateBasis: 'daily' }),
  l({ id: 'helper-daily', name: 'Labour Helper', description: 'Unskilled helper daily wage', unit: 'day', defaultRate: 1500, rate: 1500, category: 'general', rateBasis: 'daily' }),
  l({ id: 'supervisor-daily', name: 'Supervisor', description: 'Site supervisor daily', unit: 'day', defaultRate: 4500, rate: 4500, category: 'supervision', rateBasis: 'daily' }),

  // —— MEP unit placeholders ——
  l({ id: 'electrician-unit', name: 'Electrician (point rate)', description: 'Per electrical point', unit: 'nos', defaultRate: 450, rate: 450, category: 'electrical', rateBasis: 'unit' }),
  l({ id: 'plumber-unit', name: 'Plumber (point rate)', description: 'Per plumbing point', unit: 'nos', defaultRate: 550, rate: 550, category: 'plumbing', rateBasis: 'unit' }),
];

export const DEFAULT_EQUIPMENT: EquipmentRate[] = [
  e({ id: 'excavator', name: 'Excavator / Backhoe', description: 'Hired with operator (ENGINE — day equiv.)', unit: 'day', defaultRate: 18000, rate: 18000, category: 'earthmoving', rateBasis: 'daily' }),
  e({ id: 'excavator-hour', name: 'Excavator', description: 'Hourly hire', unit: 'hour', defaultRate: 3500, rate: 3500, category: 'earthmoving', rateBasis: 'hourly' }),
  e({ id: 'backhoe', name: 'Backhoe Loader', description: 'JCB-type backhoe daily', unit: 'day', defaultRate: 22000, rate: 22000, category: 'earthmoving', rateBasis: 'daily' }),
  e({ id: 'concrete-mixer', name: 'Concrete Mixer', description: 'Mechanical mixer (ENGINE-wired)', unit: 'day', defaultRate: 3500, rate: 3500, category: 'concrete', rateBasis: 'daily' }),
  e({ id: 'vibrator', name: 'Needle Vibrator', description: 'Concrete vibrator (ENGINE-wired)', unit: 'day', defaultRate: 1500, rate: 1500, category: 'concrete', rateBasis: 'daily' }),
  e({ id: 'dumper', name: 'Dumper / Tractor Trolley', description: 'Material haulage', unit: 'day', defaultRate: 8000, rate: 8000, category: 'earthmoving', rateBasis: 'daily' }),
  e({ id: 'crane', name: 'Mobile Crane', description: 'Lifting for steel/prefab', unit: 'day', defaultRate: 45000, rate: 45000, category: 'lifting', rateBasis: 'daily' }),
  e({ id: 'water-tanker', name: 'Water Tanker', description: 'Curing / construction water', unit: 'day', defaultRate: 6000, rate: 6000, category: 'general', rateBasis: 'daily' }),
  e({ id: 'generator', name: 'Diesel Generator 20–50 kVA', description: 'Site power', unit: 'day', defaultRate: 9000, rate: 9000, category: 'power', rateBasis: 'daily' }),
  e({ id: 'cutting-machine', name: 'Tile / Concrete Cutter', description: 'Cutting machine hire', unit: 'day', defaultRate: 2500, rate: 2500, category: 'tools', rateBasis: 'daily' }),
  e({ id: 'welding-machine', name: 'Welding Machine', description: 'Arc welder hire', unit: 'day', defaultRate: 2000, rate: 2000, category: 'tools', rateBasis: 'daily' }),
  e({ id: 'scaffolding', name: 'Pipe Scaffolding', description: 'Scaffold hire (ENGINE-wired)', unit: 'day', defaultRate: 8000, rate: 8000, category: 'access', rateBasis: 'daily' }),
];

/** IDs consumed by module calculators — must exist in DEFAULT_* */
export const ENGINE_MATERIAL_IDS = [
  'cement', 'sand', 'crush', 'bricks', 'blocks', 'steel-deformed', 'binding-wire',
  'paint', 'primer', 'putty', 'floor-tiles', 'wall-tiles', 'tile-adhesive', 'tile-grout',
  'waterproofing', 'door-shutter', 'aluminium-window', 'gypsum-board',
] as const;

export const ENGINE_LABOUR_IDS = [
  'excavation-labour', 'concrete-labour', 'formwork-labour', 'steel-fixer',
  'masonry-labour', 'plaster-labour', 'paint-labour', 'tile-labour',
  'backfill-labour', 'roofing-labour', 'waterproof-labour', 'carpenter-labour',
  'ceiling-labour',
] as const;

export const ENGINE_EQUIPMENT_IDS = [
  'excavator', 'concrete-mixer', 'vibrator', 'scaffolding',
] as const;

/**
 * Merge factory defaults into a saved project so new catalog items appear
 * without wiping user-edited rates for existing IDs.
 */
export function mergeRateCatalog(project: ProjectState): ProjectState {
  const merge = <
    T extends { id: string; rate: number; defaultRate: number; name: string; description: string },
  >(
    existing: T[],
    defaults: T[],
  ): T[] => {
    const map = new Map(existing.map((r) => [r.id, r]));
    for (const d of defaults) {
      const prev = map.get(d.id);
      if (!prev) {
        map.set(d.id, { ...d });
      } else {
        map.set(d.id, {
          ...d,
          ...prev,
          defaultRate: d.defaultRate,
          // keep user's live rate; refresh metadata from catalog
          name: prev.name || d.name,
          description: prev.description || d.description,
        });
      }
    }
    // Keep order: defaults order first, then any custom extras
    const ordered: T[] = [];
    const seen = new Set<string>();
    for (const d of defaults) {
      const row = map.get(d.id);
      if (row) {
        ordered.push(row);
        seen.add(d.id);
      }
    }
    for (const [id, row] of map) {
      if (!seen.has(id)) ordered.push(row);
    }
    return ordered;
  };

  return {
    ...project,
    materialRates: merge(project.materialRates, DEFAULT_MATERIALS),
    labourRates: merge(project.labourRates, DEFAULT_LABOUR),
    equipmentRates: merge(project.equipmentRates, DEFAULT_EQUIPMENT),
    rateFactors: { ...DEFAULT_RATE_FACTORS, ...project.rateFactors },
  };
}

export function createDefaultProject(partial?: Partial<ProjectState>): ProjectState {
  return {
    name: partial?.name ?? 'Untitled Estimate',
    location: partial?.location ?? 'Pakistan',
    client: partial?.client ?? '',
    preparedBy: partial?.preparedBy ?? '',
    date: partial?.date ?? new Date().toISOString().slice(0, 10),
    entries: partial?.entries ?? [],
    materialRates: partial?.materialRates ?? DEFAULT_MATERIALS.map((x) => ({ ...x })),
    labourRates: partial?.labourRates ?? DEFAULT_LABOUR.map((x) => ({ ...x })),
    equipmentRates: partial?.equipmentRates ?? DEFAULT_EQUIPMENT.map((x) => ({ ...x })),
    rateFactors: partial?.rateFactors ?? { ...DEFAULT_RATE_FACTORS },
    boqOverrides: partial?.boqOverrides ?? {},
    sectionOrder: partial?.sectionOrder ?? [],
  };
}
