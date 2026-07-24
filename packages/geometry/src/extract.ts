/**
 * Measurement Extraction Layer
 * Converts PlanDocument geometry → MeasurementEntry[] for @boq/engine.
 * The calculation engine never knows entries came from a drawing.
 */

import { createEntry } from '@boq/engine';
import type { MeasurementEntry, ModuleId } from '@boq/shared';
import { polygonArea, polygonPerimeter, wallLength } from './math';
import type { PlanDocument, Room, Wall } from './types';

export const PLANNER_SOURCE = 'smart-planner' as const;

export type PlannerTaggedEntry = MeasurementEntry & {
  meta?: { source: typeof PLANNER_SOURCE; elementIds?: string[] };
};

function entry(
  moduleId: ModuleId,
  fields: Record<string, number | string>,
  label: string,
  order: number,
  elementIds: string[] = [],
): PlannerTaggedEntry {
  const base = createEntry(moduleId, fields, label, order);
  return {
    ...base,
    // Tag in remarks-compatible way via label prefix; store source in fields for filtering
    fields: { ...fields, __source: PLANNER_SOURCE },
    label: label.startsWith('[Plan]') ? label : `[Plan] ${label}`,
    meta: { source: PLANNER_SOURCE, elementIds },
  };
}

function openingsOnWall(plan: PlanDocument, wallId: string) {
  const doors = plan.doors.filter((d) => d.wallId === wallId);
  const windows = plan.windows.filter((w) => w.wallId === wallId);
  return { doors, windows };
}

/** Opening volume for masonry (m³) on a wall */
function openingVolume(plan: PlanDocument, wall: Wall): number {
  const { doors, windows } = openingsOnWall(plan, wall.id);
  let vol = 0;
  for (const d of doors) {
    vol += d.width * Math.min(d.height, wall.height) * wall.thickness;
  }
  for (const w of windows) {
    vol += w.width * Math.min(w.height, wall.height) * wall.thickness;
  }
  return vol;
}

/** Opening area (m²) for plaster/paint deductions on one face */
function openingAreaFace(plan: PlanDocument, wall: Wall): number {
  const { doors, windows } = openingsOnWall(plan, wall.id);
  let a = 0;
  for (const d of doors) a += d.width * Math.min(d.height, wall.height);
  for (const w of windows) a += w.width * Math.min(w.height, wall.height);
  return a;
}

/**
 * Extract all measurement entries from a floor plan.
 * Maps walls/rooms/openings → existing ModuleIds.
 */
export function extractMeasurements(plan: PlanDocument): MeasurementEntry[] {
  const out: MeasurementEntry[] = [];
  let order = 0;

  const structuralWalls = plan.walls.filter((w) => w.structuralType !== 'boundary');
  const boundaryWalls = plan.walls.filter((w) => w.structuralType === 'boundary');

  // --- Strip foundations along structural walls ---
  for (const wall of structuralWalls) {
    if (wall.foundationType === 'none') continue;
    const len = wallLength(wall.start, wall.end);
    const footingW = Math.max(wall.thickness + 0.3, 0.6);
    const excDepth = 0.9;
    out.push(
      entry(
        'foundation',
        {
          length: footingW,
          width: len,
          depth: excDepth,
          pccThickness: 0.075,
          rccThickness: 0.23,
          quantity: 1,
          mix: '1:2:4',
        },
        `Strip foundation — wall ${wall.id.slice(-4)}`,
        order++,
        [wall.id],
      ),
    );
  }

  // --- Masonry / blockwork (with opening deductions) ---
  for (const wall of structuralWalls) {
    const len = wallLength(wall.start, wall.end);
    const openVol = openingVolume(plan, wall);
    if (wall.material === 'block') {
      out.push(
        entry(
          'blockwork',
          {
            length: len,
            height: wall.height,
            thickness: wall.thickness,
            openings: openVol,
            quantity: 1,
          },
          `Block wall ${len.toFixed(2)}m`,
          order++,
          [wall.id],
        ),
      );
    } else if (wall.material === 'brick' || wall.material === 'rcc') {
      // RCC walls still take brick cladding estimate as masonry for residential V1
      // True RCC wall volume handled lightly as masonry equivalent for finishes path
      out.push(
        entry(
          'masonry',
          {
            length: len,
            height: wall.height,
            thickness: wall.thickness,
            openings: openVol,
            quantity: 1,
          },
          `Brick wall ${len.toFixed(2)}m`,
          order++,
          [wall.id],
        ),
      );
    }
  }

  // --- Boundary walls ---
  for (const wall of boundaryWalls) {
    const len = wallLength(wall.start, wall.end);
    out.push(
      entry(
        'boundary-wall',
        {
          length: len,
          height: Math.min(wall.height, 2.1),
          thickness: wall.thickness,
          copingWidth: wall.thickness + 0.05,
          copingThk: 0.05,
          quantity: 1,
        },
        `Boundary ${len.toFixed(2)}m`,
        order++,
        [wall.id],
      ),
    );
  }

  // --- Plaster & paint (both faces of structural walls, openings deducted) ---
  for (const wall of structuralWalls) {
    const len = wallLength(wall.start, wall.end);
    const openA = openingAreaFace(plan, wall);
    out.push(
      entry(
        'plaster',
        {
          length: len,
          height: wall.height,
          thickness: 12,
          sides: 2,
          openings: openA * 2,
          quantity: 1,
        },
        `Plaster wall ${wall.id.slice(-4)}`,
        order++,
        [wall.id],
      ),
    );
    out.push(
      entry(
        'paint',
        {
          length: len,
          height: wall.height,
          coats: 2,
          openings: openA * 2,
          quantity: 1,
        },
        `Paint wall ${wall.id.slice(-4)}`,
        order++,
        [wall.id],
      ),
    );
  }

  // --- Doors & windows ---
  for (const door of plan.doors) {
    out.push(
      entry(
        'doors',
        { width: door.width, height: door.height, quantity: 1 },
        `Door ${door.width.toFixed(2)}×${door.height.toFixed(2)}`,
        order++,
        [door.id, door.wallId],
      ),
    );
  }
  for (const win of plan.windows) {
    out.push(
      entry(
        'windows',
        { width: win.width, height: win.height, quantity: 1 },
        `Window ${win.width.toFixed(2)}×${win.height.toFixed(2)}`,
        order++,
        [win.id, win.wallId],
      ),
    );
  }

  // --- Columns ---
  for (const col of plan.columns) {
    out.push(
      entry(
        'columns',
        {
          length: col.width,
          width: col.depth,
          height: col.height,
          quantity: 1,
          mix: '1:1.5:3',
        },
        `Column ${col.width}×${col.depth}`,
        order++,
        [col.id],
      ),
    );
  }

  // --- Stairs ---
  for (const st of plan.stairs) {
    out.push(
      entry(
        'staircase',
        {
          going: st.going,
          rise: st.rise,
          width: st.width,
          steps: st.steps,
          waist: 0.15,
          quantity: 1,
          mix: '1:2:4',
        },
        `Staircase ${st.steps} steps`,
        order++,
        [st.id],
      ),
    );
  }

  // --- Rooms: floor, ceiling, optional wet-area wall tiles ---
  for (const room of plan.rooms) {
    order = pushRoomEntries(plan, room, out, order);
  }

  // --- Roof over building footprint (union of rooms or plot inset) ---
  const roofArea = plan.rooms.reduce((s, r) => s + polygonArea(r.polygon), 0);
  if (roofArea > 1) {
    // Approximate as rectangle covering total room area
    const side = Math.sqrt(roofArea);
    out.push(
      entry(
        'roofing',
        { length: side, width: side, quantity: 1 },
        `Roofing ${roofArea.toFixed(1)} m²`,
        order++,
        plan.rooms.map((r) => r.id),
      ),
    );
    out.push(
      entry(
        'waterproofing',
        { length: side, width: side, quantity: 1 },
        `Roof waterproofing`,
        order++,
        plan.rooms.map((r) => r.id),
      ),
    );
  }

  // Strip __source from fields before returning (engine ignores unknown keys via num())
  return out.map((e) => {
    const fields = { ...e.fields };
    delete fields.__source;
    return { ...e, fields };
  });
}

function pushRoomEntries(
  plan: PlanDocument,
  room: Room,
  out: MeasurementEntry[],
  order: number,
): number {
  const area = polygonArea(room.polygon);
  const peri = polygonPerimeter(room.polygon);
  if (area < 0.2) return order;

  // Represent area as L×W with L=sqrt, W=area/L for rectangular modules
  const length = Math.sqrt(area);
  const width = area / length;

  if (room.floorFinish === 'tiles') {
    out.push(
      entry(
        'floor-tiles',
        { length, width, quantity: 1 },
        `${room.name} floor tiles`,
        order++,
        [room.id],
      ),
    );
  }

  if (room.ceilingFinish === 'gypsum') {
    out.push(
      entry(
        'ceiling',
        { length, width, quantity: 1 },
        `${room.name} ceiling`,
        order++,
        [room.id],
      ),
    );
  } else if (room.ceilingFinish === 'plaster') {
    out.push(
      entry(
        'plaster',
        {
          length: area,
          height: 1,
          thickness: 12,
          sides: 1,
          openings: 0,
          quantity: 1,
        },
        `${room.name} ceiling plaster`,
        order++,
        [room.id],
      ),
    );
  }

  if (room.roomType === 'washroom' || room.roomType === 'kitchen') {
    // Wall tiles ~2.1m dado on perimeter
    const dadoH = room.roomType === 'washroom' ? 2.1 : 1.5;
    out.push(
      entry(
        'wall-tiles',
        { length: peri, height: dadoH, quantity: 1 },
        `${room.name} wall tiles`,
        order++,
        [room.id],
      ),
    );
  }

  void plan;
  return order;
}

/** Filter planner-generated entries from a mixed list */
export function isPlannerEntry(e: MeasurementEntry): boolean {
  return e.label.startsWith('[Plan]') || e.fields.__source === PLANNER_SOURCE;
}

export function mergePlannerEntries(
  existing: MeasurementEntry[],
  extracted: MeasurementEntry[],
): MeasurementEntry[] {
  const manual = existing.filter((e) => !isPlannerEntry(e));
  const withOrder = [
    ...manual.map((e, i) => ({ ...e, order: i })),
    ...extracted.map((e, i) => ({ ...e, order: manual.length + i })),
  ];
  return withOrder;
}
