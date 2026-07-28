import type { MeasurementEntry } from '@boq/shared';
import {
  BACKFILL_BULKING,
  BINDING_WIRE_FACTOR,
  BRICKS_PER_M3,
  BRICK_MORTAR_CEMENT_BAGS_PER_M3,
  BRICK_MORTAR_SAND_M3_PER_M3,
  BLOCKS_PER_M3,
  BLOCK_MORTAR_CEMENT_BAGS_PER_M3,
  BLOCK_MORTAR_SAND_M3_PER_M3,
  CEMENT_BAGS_PER_M3,
  COMPACTION_FACTOR,
  CRUSH_M3_PER_M3,
  FORMWORK_M2_PER_M3,
  PAINT_LTR_PER_M2,
  PLASTER_CEMENT_BAGS_PER_M2_12MM,
  PLASTER_SAND_M3_PER_M2_12MM,
  PRIMER_LTR_PER_M2,
  PUTTY_KG_PER_M2,
  SAND_M3_PER_M3,
  STEEL_KG_PER_M3,
  TILE_ADHESIVE_KG_PER_M2,
  TILE_GROUT_KG_PER_M2,
  TILE_WASTE_FACTOR,
  num,
  round,
} from './constants';
import { emptyOutput, mat, qty, type CalcContext, type ModuleOutput } from './helpers';

function volume(L: number, W: number, D: number, Q = 1) {
  return round(L * W * D * Q);
}

function area(L: number, W: number, Q = 1) {
  return round(L * W * Q);
}

function concreteMaterials(mix: string, vol: number, entryId: string): ModuleOutput['materials'] {
  const bags = CEMENT_BAGS_PER_M3[mix] ?? CEMENT_BAGS_PER_M3['1:2:4'];
  const sand = SAND_M3_PER_M3[mix] ?? SAND_M3_PER_M3['1:2:4'];
  const crush = CRUSH_M3_PER_M3[mix] ?? CRUSH_M3_PER_M3['1:2:4'];
  return [
    mat('cement', 'Ordinary Portland Cement', 'cement', 'bag', bags * vol, entryId),
    mat('sand', 'Fine Sand (Chenab / Ravi)', 'sand', 'm3', sand * vol, entryId),
    mat('crush', 'Crush / Aggregate ¾"', 'crush', 'm3', crush * vol, entryId),
  ];
}

function steelMaterials(vol: number, element: string, entryId: string): ModuleOutput['materials'] {
  const kgPerM3 = STEEL_KG_PER_M3[element] ?? STEEL_KG_PER_M3.general;
  const steelKg = kgPerM3 * vol;
  return [
    mat('steel-deformed', 'Deformed Steel Bars (Grade 60)', 'steel', 'kg', steelKg, entryId),
    mat('binding-wire', 'Binding Wire', 'steel', 'kg', steelKg * BINDING_WIRE_FACTOR, entryId),
  ];
}

export function calcExcavation(entry: MeasurementEntry, _ctx: CalcContext): ModuleOutput {
  const L = num(entry.fields.length);
  const W = num(entry.fields.width);
  const D = num(entry.fields.depth);
  const Q = num(entry.fields.quantity, 1);
  const exc = volume(L, W, D, Q);
  const out = emptyOutput();
  out.quantities.push(qty(entry, 'Excavation in ordinary soil', 'm3', exc, 'Earthwork'));
  out.labour.push({ labourId: 'excavation-labour', quantity: exc });
  out.equipment.push({ equipmentId: 'excavator', quantity: Math.max(exc / 40, 0.25) });
  out.boq.push({
    entryId: entry.id,
    moduleId: entry.moduleId,
    description: entry.label || 'Excavation',
    specification: 'Excavation in ordinary soil including disposal up to 50m',
    unit: 'm3',
    quantity: exc,
    category: 'Earthwork',
    remarks: `${L}×${W}×${D} × ${Q}`,
  });
  return out;
}

export function calcPCC(entry: MeasurementEntry, _ctx: CalcContext): ModuleOutput {
  const L = num(entry.fields.length);
  const W = num(entry.fields.width);
  const D = num(entry.fields.thickness, num(entry.fields.depth, 0.075));
  const Q = num(entry.fields.quantity, 1);
  const mix = String(entry.fields.mix || '1:4:8');
  const vol = volume(L, W, D, Q);
  const out = emptyOutput();
  out.quantities.push(qty(entry, `PCC ${mix}`, 'm3', vol, 'Concrete'));
  out.materials.push(...concreteMaterials(mix, vol, entry.id));
  out.labour.push({ labourId: 'concrete-labour', quantity: vol });
  out.equipment.push(
    { equipmentId: 'concrete-mixer', quantity: Math.max(vol / 8, 0.25) },
    { equipmentId: 'vibrator', quantity: Math.max(vol / 12, 0.2) },
  );
  out.boq.push({
    entryId: entry.id,
    moduleId: entry.moduleId,
    description: entry.label || `Plain Cement Concrete ${mix}`,
    specification: `PCC ${mix} including mixing, placing & curing`,
    unit: 'm3',
    quantity: vol,
    category: 'Concrete',
    remarks: '',
  });
  return out;
}

export function calcRCC(entry: MeasurementEntry, _ctx: CalcContext): ModuleOutput {
  const L = num(entry.fields.length);
  const W = num(entry.fields.width);
  const D = num(entry.fields.depth, num(entry.fields.thickness));
  const Q = num(entry.fields.quantity, 1);
  const mix = String(entry.fields.mix || '1:2:4');
  const element = String(entry.fields.element || 'general');
  const vol = volume(L, W, D, Q);
  const form = (FORMWORK_M2_PER_M3[element] ?? FORMWORK_M2_PER_M3.general) * vol;
  const out = emptyOutput();
  out.quantities.push(
    qty(entry, `RCC ${mix}`, 'm3', vol, 'Concrete'),
    qty(entry, 'Formwork', 'm2', form, 'Formwork'),
  );
  out.materials.push(...concreteMaterials(mix, vol, entry.id), ...steelMaterials(vol, element, entry.id));
  out.labour.push(
    { labourId: 'concrete-labour', quantity: vol },
    { labourId: 'formwork-labour', quantity: form },
    { labourId: 'steel-fixer', quantity: (STEEL_KG_PER_M3[element] ?? 100) * vol },
  );
  out.equipment.push(
    { equipmentId: 'concrete-mixer', quantity: Math.max(vol / 8, 0.25) },
    { equipmentId: 'vibrator', quantity: Math.max(vol / 10, 0.2) },
    { equipmentId: 'scaffolding', quantity: Math.max(form / 60, 0.25) },
  );
  out.boq.push({
    entryId: entry.id,
    moduleId: entry.moduleId,
    description: entry.label || `Reinforced Cement Concrete ${mix}`,
    specification: `RCC ${mix} including formwork, steel & curing`,
    unit: 'm3',
    quantity: vol,
    category: 'Concrete',
    remarks: `Element: ${element}`,
  });
  return out;
}

export function calcFoundation(entry: MeasurementEntry, _ctx: CalcContext): ModuleOutput {
  const L = num(entry.fields.length);
  const W = num(entry.fields.width);
  const D = num(entry.fields.depth);
  const Q = num(entry.fields.quantity, 1);
  const pccThk = num(entry.fields.pccThickness, 0.075);
  const rccThk = num(entry.fields.rccThickness, 0.23);
  const mix = String(entry.fields.mix || '1:2:4');

  const excavation = volume(L + 0.3, W + 0.3, D, Q);
  const pccVol = volume(L, W, pccThk, Q);
  const rccVol = volume(L, W, rccThk, Q);
  const form = FORMWORK_M2_PER_M3.footing * rccVol;
  const backfill = Math.max(excavation - pccVol - rccVol, 0) * BACKFILL_BULKING;
  const compaction = backfill * COMPACTION_FACTOR;

  const out = emptyOutput();
  out.quantities.push(
    qty(entry, 'Excavation for foundation', 'm3', excavation, 'Earthwork'),
    qty(entry, 'PCC 1:4:8 under footing', 'm3', pccVol, 'Concrete'),
    qty(entry, `RCC footing ${mix}`, 'm3', rccVol, 'Concrete'),
    qty(entry, 'Formwork for footing', 'm2', form, 'Formwork'),
    qty(entry, 'Backfilling', 'm3', backfill, 'Earthwork'),
    qty(entry, 'Compaction', 'm3', compaction, 'Earthwork'),
  );
  out.materials.push(
    ...concreteMaterials('1:4:8', pccVol, entry.id),
    ...concreteMaterials(mix, rccVol, entry.id),
    ...steelMaterials(rccVol, 'footing', entry.id),
  );
  out.labour.push(
    { labourId: 'excavation-labour', quantity: excavation },
    { labourId: 'concrete-labour', quantity: pccVol + rccVol },
    { labourId: 'formwork-labour', quantity: form },
    { labourId: 'backfill-labour', quantity: backfill },
  );
  out.equipment.push(
    { equipmentId: 'excavator', quantity: Math.max(excavation / 40, 0.25) },
    { equipmentId: 'concrete-mixer', quantity: Math.max((pccVol + rccVol) / 8, 0.25) },
    { equipmentId: 'vibrator', quantity: Math.max(rccVol / 10, 0.2) },
  );
  out.boq.push(
    {
      entryId: entry.id,
      moduleId: entry.moduleId,
      description: `${entry.label || 'Foundation'} — Excavation`,
      specification: 'Excavation in ordinary soil for foundation',
      unit: 'm3',
      quantity: excavation,
      category: 'Earthwork',
      remarks: '',
    },
    {
      entryId: entry.id,
      moduleId: entry.moduleId,
      description: `${entry.label || 'Foundation'} — PCC`,
      specification: 'PCC 1:4:8 under footing',
      unit: 'm3',
      quantity: pccVol,
      category: 'Concrete',
      remarks: '',
    },
    {
      entryId: entry.id,
      moduleId: entry.moduleId,
      description: `${entry.label || 'Foundation'} — RCC Footing`,
      specification: `RCC ${mix} footing including steel & formwork`,
      unit: 'm3',
      quantity: rccVol,
      category: 'Concrete',
      remarks: '',
    },
    {
      entryId: entry.id,
      moduleId: entry.moduleId,
      description: `${entry.label || 'Foundation'} — Backfilling`,
      specification: 'Backfilling with approved material including watering & compaction',
      unit: 'm3',
      quantity: backfill,
      category: 'Earthwork',
      remarks: '',
    },
  );
  return out;
}

export function calcFootings(entry: MeasurementEntry, ctx: CalcContext): ModuleOutput {
  return calcFoundation(entry, ctx);
}

export function calcColumns(entry: MeasurementEntry, _ctx: CalcContext): ModuleOutput {
  const L = num(entry.fields.length); // cross-section
  const W = num(entry.fields.width);
  const H = num(entry.fields.height, num(entry.fields.depth));
  const Q = num(entry.fields.quantity, 1);
  const mix = String(entry.fields.mix || '1:1.5:3');
  const vol = volume(L, W, H, Q);
  const form = FORMWORK_M2_PER_M3.column * vol;
  const out = emptyOutput();
  out.quantities.push(
    qty(entry, `RCC Columns ${mix}`, 'm3', vol, 'Concrete'),
    qty(entry, 'Column formwork', 'm2', form, 'Formwork'),
  );
  out.materials.push(...concreteMaterials(mix, vol, entry.id), ...steelMaterials(vol, 'column', entry.id));
  out.labour.push(
    { labourId: 'concrete-labour', quantity: vol },
    { labourId: 'formwork-labour', quantity: form },
    { labourId: 'steel-fixer', quantity: STEEL_KG_PER_M3.column * vol },
  );
  out.equipment.push(
    { equipmentId: 'concrete-mixer', quantity: Math.max(vol / 8, 0.25) },
    { equipmentId: 'vibrator', quantity: Math.max(vol / 10, 0.2) },
    { equipmentId: 'scaffolding', quantity: Math.max(form / 50, 0.25) },
  );
  out.boq.push({
    entryId: entry.id,
    moduleId: entry.moduleId,
    description: entry.label || 'RCC Columns',
    specification: `RCC ${mix} columns including formwork & reinforcement`,
    unit: 'm3',
    quantity: vol,
    category: 'Concrete',
    remarks: `${Q} nos × ${L}×${W}×${H}`,
  });
  return out;
}

export function calcBeams(entry: MeasurementEntry, _ctx: CalcContext): ModuleOutput {
  const width = num(entry.fields.width);
  const depth = num(entry.fields.depth);
  const length = num(entry.fields.length);
  const Q = num(entry.fields.quantity, 1);
  const mix = String(entry.fields.mix || '1:2:4');
  const vol = volume(width, depth, length, Q);
  const form = FORMWORK_M2_PER_M3.beam * vol;
  const out = emptyOutput();
  out.quantities.push(
    qty(entry, `RCC Beams ${mix}`, 'm3', vol, 'Concrete'),
    qty(entry, 'Beam formwork', 'm2', form, 'Formwork'),
  );
  out.materials.push(...concreteMaterials(mix, vol, entry.id), ...steelMaterials(vol, 'beam', entry.id));
  out.labour.push(
    { labourId: 'concrete-labour', quantity: vol },
    { labourId: 'formwork-labour', quantity: form },
    { labourId: 'steel-fixer', quantity: STEEL_KG_PER_M3.beam * vol },
  );
  out.equipment.push(
    { equipmentId: 'concrete-mixer', quantity: Math.max(vol / 8, 0.25) },
    { equipmentId: 'vibrator', quantity: Math.max(vol / 10, 0.2) },
    { equipmentId: 'scaffolding', quantity: Math.max(form / 55, 0.25) },
  );
  out.boq.push({
    entryId: entry.id,
    moduleId: entry.moduleId,
    description: entry.label || 'RCC Beams',
    specification: `RCC ${mix} beams including formwork & reinforcement`,
    unit: 'm3',
    quantity: vol,
    category: 'Concrete',
    remarks: '',
  });
  return out;
}

export function calcSlabs(entry: MeasurementEntry, _ctx: CalcContext): ModuleOutput {
  const L = num(entry.fields.length);
  const W = num(entry.fields.width);
  const thk = num(entry.fields.thickness, 0.125);
  const Q = num(entry.fields.quantity, 1);
  const mix = String(entry.fields.mix || '1:2:4');
  const vol = volume(L, W, thk, Q);
  const form = FORMWORK_M2_PER_M3.slab * vol;
  const out = emptyOutput();
  out.quantities.push(
    qty(entry, `RCC Slab ${mix}`, 'm3', vol, 'Concrete'),
    qty(entry, 'Slab formwork / shuttering', 'm2', form, 'Formwork'),
  );
  out.materials.push(...concreteMaterials(mix, vol, entry.id), ...steelMaterials(vol, 'slab', entry.id));
  out.labour.push(
    { labourId: 'concrete-labour', quantity: vol },
    { labourId: 'formwork-labour', quantity: form },
    { labourId: 'steel-fixer', quantity: STEEL_KG_PER_M3.slab * vol },
  );
  out.equipment.push(
    { equipmentId: 'concrete-mixer', quantity: Math.max(vol / 8, 0.25) },
    { equipmentId: 'vibrator', quantity: Math.max(vol / 10, 0.2) },
    { equipmentId: 'scaffolding', quantity: Math.max(form / 70, 0.25) },
  );
  out.boq.push({
    entryId: entry.id,
    moduleId: entry.moduleId,
    description: entry.label || 'RCC Slab',
    specification: `RCC ${mix} slab ${thk * 1000}mm thick including formwork & steel`,
    unit: 'm3',
    quantity: vol,
    category: 'Concrete',
    remarks: '',
  });
  return out;
}

export function calcStaircase(entry: MeasurementEntry, _ctx: CalcContext): ModuleOutput {
  const going = num(entry.fields.going, 0.275);
  const rise = num(entry.fields.rise, 0.175);
  const width = num(entry.fields.width, 1.2);
  const steps = num(entry.fields.steps, 12);
  const waist = num(entry.fields.waist, 0.15);
  const mix = String(entry.fields.mix || '1:2:4');
  const Q = num(entry.fields.quantity, 1);
  // Approx RCC volume: waist slab + steps triangular portion
  const flightLength = steps * going;
  const waistVol = flightLength * width * waist * Q;
  const stepVol = (steps * (going * rise * 0.5) * width) * Q;
  const vol = round(waistVol + stepVol);
  const out = emptyOutput();
  out.quantities.push(qty(entry, `RCC Staircase ${mix}`, 'm3', vol, 'Concrete'));
  out.materials.push(...concreteMaterials(mix, vol, entry.id), ...steelMaterials(vol, 'staircase', entry.id));
  out.labour.push({ labourId: 'concrete-labour', quantity: vol });
  out.equipment.push(
    { equipmentId: 'concrete-mixer', quantity: Math.max(vol / 8, 0.25) },
    { equipmentId: 'vibrator', quantity: Math.max(vol / 10, 0.2) },
    { equipmentId: 'scaffolding', quantity: Math.max(vol / 3, 0.25) },
  );
  out.boq.push({
    entryId: entry.id,
    moduleId: entry.moduleId,
    description: entry.label || 'RCC Staircase',
    specification: `RCC ${mix} staircase including waist slab, steps, formwork & steel`,
    unit: 'm3',
    quantity: vol,
    category: 'Concrete',
    remarks: `${steps} steps`,
  });
  return out;
}

export function calcMasonry(entry: MeasurementEntry, _ctx: CalcContext): ModuleOutput {
  const L = num(entry.fields.length);
  const H = num(entry.fields.height);
  const thk = num(entry.fields.thickness, 0.23); // 9"
  const Q = num(entry.fields.quantity, 1);
  const openings = num(entry.fields.openings, 0);
  const wallVol = Math.max(L * H * thk * Q - openings, 0);
  const out = emptyOutput();
  out.quantities.push(qty(entry, 'Brick masonry in cement mortar 1:6', 'm3', wallVol, 'Masonry'));
  out.materials.push(
    mat('bricks', 'First Class Burnt Clay Bricks', 'bricks', 'nos', BRICKS_PER_M3 * wallVol, entry.id),
    mat('cement', 'Ordinary Portland Cement', 'cement', 'bag', BRICK_MORTAR_CEMENT_BAGS_PER_M3 * wallVol, entry.id),
    mat('sand', 'Fine Sand (Chenab / Ravi)', 'sand', 'm3', BRICK_MORTAR_SAND_M3_PER_M3 * wallVol, entry.id),
  );
  out.labour.push({ labourId: 'masonry-labour', quantity: wallVol });
  out.boq.push({
    entryId: entry.id,
    moduleId: entry.moduleId,
    description: entry.label || 'Brick Masonry',
    specification: `Brick masonry ${thk * 1000}mm thick in CM 1:6`,
    unit: 'm3',
    quantity: wallVol,
    category: 'Masonry',
    remarks: '',
  });
  return out;
}

export function calcBlockwork(entry: MeasurementEntry, _ctx: CalcContext): ModuleOutput {
  const L = num(entry.fields.length);
  const H = num(entry.fields.height);
  const thk = num(entry.fields.thickness, 0.15);
  const Q = num(entry.fields.quantity, 1);
  const openings = num(entry.fields.openings, 0);
  const wallVol = Math.max(L * H * thk * Q - openings, 0);
  const out = emptyOutput();
  out.quantities.push(qty(entry, 'Concrete block masonry', 'm3', wallVol, 'Masonry'));
  out.materials.push(
    mat('blocks', 'Hollow Concrete Blocks 6"', 'blocks', 'nos', BLOCKS_PER_M3 * wallVol, entry.id),
    mat('cement', 'Ordinary Portland Cement', 'cement', 'bag', BLOCK_MORTAR_CEMENT_BAGS_PER_M3 * wallVol, entry.id),
    mat('sand', 'Fine Sand (Chenab / Ravi)', 'sand', 'm3', BLOCK_MORTAR_SAND_M3_PER_M3 * wallVol, entry.id),
  );
  out.labour.push({ labourId: 'masonry-labour', quantity: wallVol });
  out.boq.push({
    entryId: entry.id,
    moduleId: entry.moduleId,
    description: entry.label || 'Block Masonry',
    specification: `Hollow block masonry ${thk * 1000}mm thick in CM 1:4`,
    unit: 'm3',
    quantity: wallVol,
    category: 'Masonry',
    remarks: '',
  });
  return out;
}

export function calcBoundaryWall(entry: MeasurementEntry, ctx: CalcContext): ModuleOutput {
  // Treat as masonry + optional coping
  const masonry = calcMasonry(entry, ctx);
  const L = num(entry.fields.length);
  const Q = num(entry.fields.quantity, 1);
  const coping = num(entry.fields.copingWidth, 0.3) * num(entry.fields.copingThk, 0.05) * L * Q;
  if (coping > 0) {
    masonry.quantities.push(qty(entry, 'RCC/PCC coping', 'm3', coping, 'Concrete'));
    masonry.materials.push(...concreteMaterials('1:2:4', coping, entry.id));
    masonry.boq.push({
      entryId: entry.id,
      moduleId: entry.moduleId,
      description: `${entry.label || 'Boundary Wall'} — Coping`,
      specification: 'PCC/RCC coping on boundary wall',
      unit: 'm3',
      quantity: coping,
      category: 'Concrete',
      remarks: '',
    });
  }
  return masonry;
}

export function calcPlaster(entry: MeasurementEntry, _ctx: CalcContext): ModuleOutput {
  const L = num(entry.fields.length);
  const H = num(entry.fields.height, num(entry.fields.width));
  const Q = num(entry.fields.quantity, 1);
  const thk = num(entry.fields.thickness, 12); // mm
  const sides = num(entry.fields.sides, 1);
  const openings = num(entry.fields.openings, 0);
  const a = Math.max(L * H * Q * sides - openings, 0);
  const factor = thk / 12;
  const out = emptyOutput();
  out.quantities.push(qty(entry, `Cement plaster ${thk}mm`, 'm2', a, 'Finishes'));
  out.materials.push(
    mat('cement', 'Ordinary Portland Cement', 'cement', 'bag', PLASTER_CEMENT_BAGS_PER_M2_12MM * a * factor, entry.id),
    mat('sand', 'Fine Sand (Chenab / Ravi)', 'sand', 'm3', PLASTER_SAND_M3_PER_M2_12MM * a * factor, entry.id),
  );
  out.labour.push({ labourId: 'plaster-labour', quantity: a });
  if (H >= 3) {
    out.equipment.push({ equipmentId: 'scaffolding', quantity: Math.max(a / 80, 0.25) });
  }
  out.boq.push({
    entryId: entry.id,
    moduleId: entry.moduleId,
    description: entry.label || 'Cement Plaster',
    specification: `${thk}mm thick cement plaster 1:4`,
    unit: 'm2',
    quantity: a,
    category: 'Finishes',
    remarks: '',
  });
  return out;
}

export function calcPaint(entry: MeasurementEntry, _ctx: CalcContext): ModuleOutput {
  const L = num(entry.fields.length);
  const H = num(entry.fields.height, num(entry.fields.width));
  const Q = num(entry.fields.quantity, 1);
  const coats = num(entry.fields.coats, 2);
  const openings = num(entry.fields.openings, 0);
  const a = Math.max(L * H * Q - openings, 0);
  const out = emptyOutput();
  out.quantities.push(qty(entry, 'Emulsion / enamel painting', 'm2', a, 'Finishes'));
  out.materials.push(
    mat('paint', 'Plastic Emulsion Paint', 'paint', 'ltr', PAINT_LTR_PER_M2 * a * (coats / 2), entry.id),
    mat('primer', 'Wall Primer', 'paint', 'ltr', PRIMER_LTR_PER_M2 * a, entry.id),
    mat('putty', 'Wall Putty', 'paint', 'kg', PUTTY_KG_PER_M2 * a, entry.id),
  );
  out.labour.push({ labourId: 'paint-labour', quantity: a });
  out.boq.push({
    entryId: entry.id,
    moduleId: entry.moduleId,
    description: entry.label || 'Painting',
    specification: `Painting with emulsion including primer & putty — ${coats} coats`,
    unit: 'm2',
    quantity: a,
    category: 'Finishes',
    remarks: '',
  });
  return out;
}

export function calcFloorTiles(entry: MeasurementEntry, _ctx: CalcContext): ModuleOutput {
  const L = num(entry.fields.length);
  const W = num(entry.fields.width);
  const Q = num(entry.fields.quantity, 1);
  const a = area(L, W, Q) * TILE_WASTE_FACTOR;
  const out = emptyOutput();
  out.quantities.push(qty(entry, 'Floor tiling', 'm2', round(a), 'Finishes'));
  out.materials.push(
    mat('floor-tiles', 'Porcelain Floor Tiles 600×600', 'tiles', 'm2', a, entry.id),
    mat('tile-adhesive', 'Tile Adhesive', 'adhesive', 'kg', TILE_ADHESIVE_KG_PER_M2 * a, entry.id),
    mat('tile-grout', 'Tile Grout', 'adhesive', 'kg', TILE_GROUT_KG_PER_M2 * a, entry.id),
  );
  out.labour.push({ labourId: 'tile-labour', quantity: a });
  out.boq.push({
    entryId: entry.id,
    moduleId: entry.moduleId,
    description: entry.label || 'Floor Tiles',
    specification: 'Providing & laying porcelain floor tiles including adhesive & grout',
    unit: 'm2',
    quantity: round(a),
    category: 'Finishes',
    remarks: 'Incl. 5% wastage',
  });
  return out;
}

export function calcWallTiles(entry: MeasurementEntry, _ctx: CalcContext): ModuleOutput {
  const L = num(entry.fields.length);
  const H = num(entry.fields.height);
  const Q = num(entry.fields.quantity, 1);
  const a = area(L, H, Q) * TILE_WASTE_FACTOR;
  const out = emptyOutput();
  out.quantities.push(qty(entry, 'Wall tiling', 'm2', round(a), 'Finishes'));
  out.materials.push(
    mat('wall-tiles', 'Ceramic Wall Tiles 300×600', 'tiles', 'm2', a, entry.id),
    mat('tile-adhesive', 'Tile Adhesive', 'adhesive', 'kg', TILE_ADHESIVE_KG_PER_M2 * a, entry.id),
    mat('tile-grout', 'Tile Grout', 'adhesive', 'kg', TILE_GROUT_KG_PER_M2 * a, entry.id),
  );
  out.labour.push({ labourId: 'tile-labour', quantity: a });
  out.boq.push({
    entryId: entry.id,
    moduleId: entry.moduleId,
    description: entry.label || 'Wall Tiles',
    specification: 'Providing & fixing ceramic wall tiles including adhesive & grout',
    unit: 'm2',
    quantity: round(a),
    category: 'Finishes',
    remarks: 'Incl. 5% wastage',
  });
  return out;
}

export function calcRoofing(entry: MeasurementEntry, _ctx: CalcContext): ModuleOutput {
  const L = num(entry.fields.length);
  const W = num(entry.fields.width);
  const Q = num(entry.fields.quantity, 1);
  const a = area(L, W, Q);
  const out = emptyOutput();
  out.quantities.push(qty(entry, 'Roof treatment / screed', 'm2', a, 'Roofing'));
  out.materials.push(
    mat('cement', 'Ordinary Portland Cement', 'cement', 'bag', 0.15 * a, entry.id),
    mat('sand', 'Fine Sand (Chenab / Ravi)', 'sand', 'm3', 0.02 * a, entry.id),
    mat('waterproofing', 'Bituminous Waterproofing Membrane', 'waterproofing', 'm2', a * 1.1, entry.id),
  );
  out.labour.push({ labourId: 'roofing-labour', quantity: a });
  out.boq.push({
    entryId: entry.id,
    moduleId: entry.moduleId,
    description: entry.label || 'Roofing',
    specification: 'Roof screed with waterproofing membrane',
    unit: 'm2',
    quantity: a,
    category: 'Roofing',
    remarks: '',
  });
  return out;
}

export function calcWaterproofing(entry: MeasurementEntry, _ctx: CalcContext): ModuleOutput {
  const L = num(entry.fields.length);
  const W = num(entry.fields.width, num(entry.fields.height));
  const Q = num(entry.fields.quantity, 1);
  const a = area(L, W, Q);
  const out = emptyOutput();
  out.quantities.push(qty(entry, 'Waterproofing treatment', 'm2', a, 'Waterproofing'));
  out.materials.push(
    mat('waterproofing', 'Bituminous Waterproofing Membrane', 'waterproofing', 'm2', a * 1.1, entry.id),
  );
  out.labour.push({ labourId: 'waterproof-labour', quantity: a });
  out.boq.push({
    entryId: entry.id,
    moduleId: entry.moduleId,
    description: entry.label || 'Waterproofing',
    specification: 'Providing & applying waterproofing membrane with overlaps',
    unit: 'm2',
    quantity: a,
    category: 'Waterproofing',
    remarks: '',
  });
  return out;
}

export function calcDoors(entry: MeasurementEntry, _ctx: CalcContext): ModuleOutput {
  const W = num(entry.fields.width, 0.9);
  const H = num(entry.fields.height, 2.1);
  const Q = num(entry.fields.quantity, 1);
  const a = area(W, H, Q);
  const out = emptyOutput();
  out.quantities.push(qty(entry, 'Doors', 'nos', Q, 'Woodwork'));
  out.materials.push(mat('door-shutter', 'Solid Core Flush Door', 'wood', 'm2', a, entry.id));
  out.labour.push({ labourId: 'carpenter-labour', quantity: Q });
  out.boq.push({
    entryId: entry.id,
    moduleId: entry.moduleId,
    description: entry.label || 'Doors',
    specification: `Providing & fixing flush door ${W}×${H}m including frame & hardware`,
    unit: 'nos',
    quantity: Q,
    category: 'Woodwork',
    remarks: '',
  });
  return out;
}

export function calcWindows(entry: MeasurementEntry, _ctx: CalcContext): ModuleOutput {
  const W = num(entry.fields.width, 1.2);
  const H = num(entry.fields.height, 1.2);
  const Q = num(entry.fields.quantity, 1);
  const a = area(W, H, Q);
  const out = emptyOutput();
  out.quantities.push(qty(entry, 'Windows', 'nos', Q, 'Openings'));
  out.materials.push(mat('aluminium-window', 'Aluminium Window with Glass', 'hardware', 'm2', a, entry.id));
  out.labour.push({ labourId: 'carpenter-labour', quantity: Q * 0.5 });
  out.boq.push({
    entryId: entry.id,
    moduleId: entry.moduleId,
    description: entry.label || 'Windows',
    specification: `Providing & fixing aluminium window ${W}×${H}m`,
    unit: 'nos',
    quantity: Q,
    category: 'Openings',
    remarks: '',
  });
  return out;
}

export function calcCeiling(entry: MeasurementEntry, _ctx: CalcContext): ModuleOutput {
  const L = num(entry.fields.length);
  const W = num(entry.fields.width);
  const Q = num(entry.fields.quantity, 1);
  const a = area(L, W, Q);
  const out = emptyOutput();
  out.quantities.push(qty(entry, 'False ceiling', 'm2', a, 'Finishes'));
  out.materials.push(mat('gypsum-board', 'Gypsum Board Ceiling', 'other', 'm2', a * 1.05, entry.id));
  out.labour.push({ labourId: 'ceiling-labour', quantity: a });
  out.boq.push({
    entryId: entry.id,
    moduleId: entry.moduleId,
    description: entry.label || 'False Ceiling',
    specification: 'Gypsum board false ceiling including frame & finishing',
    unit: 'm2',
    quantity: a,
    category: 'Finishes',
    remarks: '',
  });
  return out;
}

export function calcSteelBBS(entry: MeasurementEntry, _ctx: CalcContext): ModuleOutput {
  const dia = num(entry.fields.diameter, 12); // mm
  const length = num(entry.fields.length); // m per bar
  const bars = num(entry.fields.bars, num(entry.fields.quantity, 1));
  // weight kg/m = d²/162
  const kgPerM = (dia * dia) / 162;
  const totalKg = kgPerM * length * bars;
  const out = emptyOutput();
  out.quantities.push(qty(entry, `Steel Ø${dia}mm`, 'kg', round(totalKg, 2), 'Steel'));
  out.materials.push(
    mat('steel-deformed', 'Deformed Steel Bars (Grade 60)', 'steel', 'kg', totalKg, entry.id),
    mat('binding-wire', 'Binding Wire', 'steel', 'kg', totalKg * BINDING_WIRE_FACTOR, entry.id),
  );
  out.labour.push({ labourId: 'steel-fixer', quantity: totalKg });
  out.boq.push({
    entryId: entry.id,
    moduleId: entry.moduleId,
    description: entry.label || `Steel Reinforcement Ø${dia}mm`,
    specification: `Deformed Grade 60 bars Ø${dia}mm — BBS`,
    unit: 'kg',
    quantity: round(totalKg, 2),
    category: 'Steel',
    remarks: `${bars} bars × ${length}m`,
  });
  return out;
}

export function calcWaterTank(entry: MeasurementEntry, _ctx: CalcContext): ModuleOutput {
  const L = num(entry.fields.length);
  const W = num(entry.fields.width);
  const H = num(entry.fields.height, num(entry.fields.depth));
  const wallThk = num(entry.fields.wallThickness, 0.15);
  const baseThk = num(entry.fields.baseThickness, 0.15);
  const mix = String(entry.fields.mix || '1:1.5:3');
  const Q = num(entry.fields.quantity, 1);
  const capacity = L * W * H * Q;
  const base = (L + 2 * wallThk) * (W + 2 * wallThk) * baseThk * Q;
  const walls = 2 * (L + W) * H * wallThk * Q;
  const cover = L * W * num(entry.fields.coverThickness, 0.1) * Q;
  const vol = round(base + walls + cover);
  const out = emptyOutput();
  out.quantities.push(
    qty(entry, 'Water tank capacity', 'm3', round(capacity), 'Water Works'),
    qty(entry, `RCC water tank ${mix}`, 'm3', vol, 'Concrete'),
  );
  out.materials.push(...concreteMaterials(mix, vol, entry.id), ...steelMaterials(vol, 'general', entry.id));
  out.materials.push(mat('waterproofing', 'Bituminous Waterproofing Membrane', 'waterproofing', 'm2', (2 * (L * W + L * H + W * H)) * Q, entry.id));
  out.labour.push({ labourId: 'concrete-labour', quantity: vol });
  out.equipment.push(
    { equipmentId: 'concrete-mixer', quantity: Math.max(vol / 8, 0.25) },
    { equipmentId: 'vibrator', quantity: Math.max(vol / 10, 0.2) },
  );
  out.boq.push({
    entryId: entry.id,
    moduleId: entry.moduleId,
    description: entry.label || 'RCC Water Tank',
    specification: `RCC ${mix} water tank including waterproofing, capacity ~${round(capacity)} m³`,
    unit: 'm3',
    quantity: vol,
    category: 'Water Works',
    remarks: '',
  });
  return out;
}

export function calcSepticTank(entry: MeasurementEntry, ctx: CalcContext): ModuleOutput {
  // Similar to water tank with brick/RCC walls option — use RCC path
  return calcWaterTank({ ...entry, label: entry.label || 'Septic Tank' }, ctx);
}
