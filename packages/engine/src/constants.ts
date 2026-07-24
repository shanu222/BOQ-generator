/** Pakistan construction practice constants & mix consumptions (per m³ / m²) */

export const STEEL_DENSITY = 7850; // kg/m³

/** Approximate steel content kg per m³ of RCC by element */
export const STEEL_KG_PER_M3: Record<string, number> = {
  footing: 80,
  raft: 100,
  column: 120,
  beam: 110,
  slab: 90,
  staircase: 100,
  general: 100,
};

/** Cement bags (50kg) per m³ for common mixes */
export const CEMENT_BAGS_PER_M3: Record<string, number> = {
  '1:4:8': 3.4, // lean PCC
  '1:3:6': 4.4,
  '1:2:4': 6.4, // common RCC
  '1:1.5:3': 8.0,
  '1:1:2': 10.2,
};

/** Dry sand m³ per wet concrete m³ */
export const SAND_M3_PER_M3: Record<string, number> = {
  '1:4:8': 0.48,
  '1:3:6': 0.46,
  '1:2:4': 0.44,
  '1:1.5:3': 0.42,
  '1:1:2': 0.4,
};

/** Crush / aggregate m³ per wet concrete m³ */
export const CRUSH_M3_PER_M3: Record<string, number> = {
  '1:4:8': 0.96,
  '1:3:6': 0.92,
  '1:2:4': 0.88,
  '1:1.5:3': 0.84,
  '1:1:2': 0.8,
};

/** Brickwork: standard modular bricks with mortar */
export const BRICKS_PER_M3 = 500;
export const BRICK_MORTAR_CEMENT_BAGS_PER_M3 = 1.5;
export const BRICK_MORTAR_SAND_M3_PER_M3 = 0.3;

/** Blockwork (6" hollow blocks typical) */
export const BLOCKS_PER_M3 = 70;
export const BLOCK_MORTAR_CEMENT_BAGS_PER_M3 = 1.2;
export const BLOCK_MORTAR_SAND_M3_PER_M3 = 0.25;

/** Plaster 1:4 — cement bags & sand per m² at 12mm */
export const PLASTER_CEMENT_BAGS_PER_M2_12MM = 0.09;
export const PLASTER_SAND_M3_PER_M2_12MM = 0.015;

/** Paint coverage */
export const PAINT_LTR_PER_M2 = 0.12; // 2 coats
export const PRIMER_LTR_PER_M2 = 0.08;
export const PUTTY_KG_PER_M2 = 1.2;

/** Tiles */
export const TILE_ADHESIVE_KG_PER_M2 = 5;
export const TILE_GROUT_KG_PER_M2 = 0.5;
export const TILE_WASTE_FACTOR = 1.05;

/** Binding wire ~1% of steel weight */
export const BINDING_WIRE_FACTOR = 0.01;

/** Formwork contact area factors (m² formwork per m³ concrete) approx */
export const FORMWORK_M2_PER_M3: Record<string, number> = {
  footing: 2.5,
  column: 8,
  beam: 6,
  slab: 4.5,
  general: 5,
};

/** Compaction / backfill factors */
export const BACKFILL_BULKING = 1.25;
export const COMPACTION_FACTOR = 0.9;

export function round(n: number, decimals = 3): number {
  const f = 10 ** decimals;
  return Math.round((n + Number.EPSILON) * f) / f;
}

export function num(v: number | string | undefined, fallback = 0): number {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string') {
    const p = parseFloat(v);
    return Number.isFinite(p) ? p : fallback;
  }
  return fallback;
}
