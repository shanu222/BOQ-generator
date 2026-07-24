/**
 * Builds a fully editable PlanDocument from a HouseTemplateDefinition.
 * Does not lock geometry — output is plain walls/rooms/doors/windows.
 */

import { gid } from './id';
import { polygonArea } from './math';
import {
  addDoor,
  addPlotBoundary,
  addRoom,
  addWall,
  addWindow,
  createEmptyPlan,
  findNearestWall,
} from './ops';
import type { HouseTemplateDefinition, TemplateStats } from './template-schema';
import type { PlanDocument, PlotSpec, Vec2 } from './types';
import { M_TO_FT, PLOT_PRESETS } from './types';

function lShapeExclude(
  ox: number,
  oy: number,
  ow: number,
  oh: number,
  cut: { x: number; y: number; w: number; h: number },
): Vec2[] {
  const cx0 = cut.x;
  const cy0 = cut.y;
  const cx1 = cut.x + cut.w;
  const cy1 = cut.y + cut.h;
  const tol = 0.04;

  if (Math.abs(cx0 - ox) < tol && Math.abs(cy1 - (oy + oh)) < tol) {
    return [
      { x: ox, y: oy },
      { x: ox + ow, y: oy },
      { x: ox + ow, y: oy + oh },
      { x: cx1, y: oy + oh },
      { x: cx1, y: cy0 },
      { x: ox, y: cy0 },
    ];
  }
  if (Math.abs(cx1 - (ox + ow)) < tol && Math.abs(cy1 - (oy + oh)) < tol) {
    return [
      { x: ox, y: oy },
      { x: ox + ow, y: oy },
      { x: ox + ow, y: cy0 },
      { x: cx0, y: cy0 },
      { x: cx0, y: oy + oh },
      { x: ox, y: oy + oh },
    ];
  }
  if (Math.abs(cx0 - ox) < tol && Math.abs(cy0 - oy) < tol) {
    return [
      { x: cx1, y: oy },
      { x: ox + ow, y: oy },
      { x: ox + ow, y: oy + oh },
      { x: ox, y: oy + oh },
      { x: ox, y: cy1 },
      { x: cx1, y: cy1 },
    ];
  }
  if (Math.abs(cx1 - (ox + ow)) < tol && Math.abs(cy0 - oy) < tol) {
    return [
      { x: ox, y: oy },
      { x: cx0, y: oy },
      { x: cx0, y: cy1 },
      { x: ox + ow, y: cy1 },
      { x: ox + ow, y: oy + oh },
      { x: ox, y: oy + oh },
    ];
  }
  return [
    { x: ox, y: oy },
    { x: ox + ow, y: oy },
    { x: ox + ow, y: oy + oh },
    { x: ox, y: oy + oh },
  ];
}

function wallBox(
  plan: PlanDocument,
  x: number,
  y: number,
  w: number,
  h: number,
  thickness = 0.23,
): PlanDocument {
  const corners: Vec2[] = [
    { x, y },
    { x: x + w, y },
    { x: x + w, y: y + h },
    { x, y: y + h },
  ];
  let p = plan;
  for (let i = 0; i < 4; i++) {
    p = addWall(p, corners[i], corners[(i + 1) % 4], {
      thickness,
      structuralType: 'load-bearing',
      foundationType: 'strip',
      material: 'brick',
    });
  }
  return p;
}

function doorNear(plan: PlanDocument, point: Vec2, width = 0.9, height = 2.1): PlanDocument {
  const hit = findNearestWall(plan, point, 0.75);
  if (!hit || hit.wall.structuralType === 'boundary') return plan;
  return addDoor(plan, hit.wall.id, hit.t, width, height);
}

function windowNear(
  plan: PlanDocument,
  point: Vec2,
  width = 1.2,
  height = 1.2,
  sill = 0.9,
): PlanDocument {
  const hit = findNearestWall(plan, point, 0.75);
  if (!hit || hit.wall.structuralType === 'boundary') return plan;
  return addWindow(plan, hit.wall.id, hit.t, width, height, sill);
}

/** Map normalized [0,1] footprint coords → metres on plot */
function mapper(bx: number, by: number, bw: number, bd: number) {
  return (nx: number, ny: number): Vec2 => ({
    x: bx + nx * bw,
    y: by + ny * bd,
  });
}

/**
 * Instantiate a template onto a plot. Fully editable PlanDocument — nothing locked.
 */
export function buildPlanFromTemplate(
  def: HouseTemplateDefinition,
  plot?: PlotSpec,
): PlanDocument {
  const plotSpec = plot ?? PLOT_PRESETS[def.plotKey];
  let plan = createEmptyPlan(plotSpec, def.name);
  plan = addPlotBoundary(plan);

  const W = plotSpec.widthM;
  const D = plotSpec.depthM;
  const marginRatio = def.marginRatio ?? 0.045;
  const margin = Math.min(0.55, Math.min(W, D) * marginRatio);
  const bx = margin;
  const by = margin;
  const bw = W - margin * 2;
  const bd = D - margin * 2;
  const m = mapper(bx, by, bw, bd);

  if (def.shell !== false) {
    plan = wallBox(plan, bx, by, bw, bd, 0.23);
  }

  for (const part of def.partitions) {
    const a = m(part.x1, part.y1);
    const b = m(part.x2, part.y2);
    plan = addWall(plan, a, b, {
      thickness: part.thickness ?? 0.115,
      structuralType: part.structuralType ?? 'partition',
      foundationType: 'strip',
      material: part.material ?? 'brick',
    });
  }

  // Nested boxes (store / washroom) get their own wallBox when flagged via small rooms
  // with matching partition walls already in partitions — rooms only define polygons.

  for (const room of def.rooms) {
    const ox = bx + room.x * bw;
    const oy = by + room.y * bd;
    const ow = room.w * bw;
    const oh = room.h * bd;
    const inset = 0.1;
    let poly: Vec2[];
    if (room.cutout) {
      const cut = {
        x: bx + room.cutout.x * bw,
        y: by + room.cutout.y * bd,
        w: room.cutout.w * bw,
        h: room.cutout.h * bd,
      };
      poly = lShapeExclude(ox + inset * 0.5, oy + inset * 0.5, ow - inset, oh - inset, cut);
    } else {
      poly = [
        { x: ox + inset * 0.5, y: oy + inset * 0.5 },
        { x: ox + ow - inset * 0.5, y: oy + inset * 0.5 },
        { x: ox + ow - inset * 0.5, y: oy + oh - inset * 0.5 },
        { x: ox + inset * 0.5, y: oy + oh - inset * 0.5 },
      ];
    }
    // Small rooms (store) may be under 0.5 m² on tiny plots — force via direct insert
    if (polygonArea(poly) < 0.5 && polygonArea(poly) > 0.15) {
      plan = {
        ...plan,
        rooms: [
          ...plan.rooms,
          {
            id: gid('room'),
            name: room.name,
            roomType: room.type,
            polygon: poly,
            floorFinish: room.type === 'washroom' ? 'tiles' : room.type === 'porch' ? 'concrete' : 'tiles',
            ceilingFinish: room.type === 'porch' ? 'none' : 'plaster',
            wallPaint: room.type !== 'porch',
          },
        ],
        updatedAt: new Date().toISOString(),
      };
    } else {
      plan = addRoom(plan, poly, room.type, room.name);
    }
  }

  for (const d of def.doors) {
    plan = doorNear(plan, m(d.x, d.y), d.width ?? 0.9, d.height ?? 2.1);
  }

  for (const w of def.windows) {
    plan = windowNear(
      plan,
      m(w.x, w.y),
      w.width ?? 1.2,
      w.height ?? 1.2,
      w.sill ?? 0.9,
    );
  }

  if (def.stair) {
    const s = def.stair;
    const origin = m(s.x, s.y);
    const width = s.w * bw;
    plan = {
      ...plan,
      stairs: [
        {
          id: gid('stair'),
          origin,
          width,
          going: 0.275,
          rise: 0.175,
          steps: s.steps ?? Math.max(12, Math.round(plan.storeyHeight / 0.175)),
          rotation: s.rotation ?? 0,
        },
      ],
    };
  }

  const colSize = 0.23;
  let colPositions: Vec2[] = [];
  if (def.columns === 'auto' || def.columns === undefined) {
    colPositions = [
      { x: bx, y: by },
      { x: bx + bw, y: by },
      { x: bx, y: by + bd },
      { x: bx + bw, y: by + bd },
    ];
    // Mid junctions from long partitions
    for (const part of def.partitions) {
      if (Math.hypot(part.x2 - part.x1, part.y2 - part.y1) > 0.35) {
        colPositions.push(m(part.x1, part.y1));
        colPositions.push(m(part.x2, part.y2));
      }
    }
  } else {
    colPositions = def.columns.map((c) => m(c.x, c.y));
  }

  // Dedupe columns within 0.15 m
  const deduped: Vec2[] = [];
  for (const p of colPositions) {
    if (!deduped.some((q) => Math.hypot(q.x - p.x, q.y - p.y) < 0.15)) {
      deduped.push(p);
    }
  }

  plan = {
    ...plan,
    columns: deduped.map((position) => ({
      id: gid('col'),
      position,
      width: colSize,
      depth: colSize,
      height: plan.storeyHeight,
    })),
    name: def.name,
    updatedAt: new Date().toISOString(),
  };

  return plan;
}

export function computeTemplateStats(
  def: HouseTemplateDefinition,
  plan: PlanDocument,
): TemplateStats {
  const plotArea = plan.plot.widthM * plan.plot.depthM;
  const covered = plan.rooms
    .filter((r) => r.roomType !== 'porch')
    .reduce((s, r) => s + polygonArea(r.polygon), 0);
  const open = Math.max(0, plotArea - covered);
  const sft = M_TO_FT * M_TO_FT;
  return {
    bedrooms: def.bedrooms,
    bathrooms: def.bathrooms,
    coveredAreaM2: covered,
    coveredAreaSft: covered * sft,
    openAreaM2: open,
    openAreaSft: open * sft,
    plotAreaM2: plotArea,
    hasPorch: def.hasPorch,
    hasStair: def.hasStair,
    hasGarage: Boolean(def.hasGarage),
    roomCount: plan.rooms.length,
  };
}

export function loadTemplateById(
  id: string,
  catalog: HouseTemplateDefinition[],
  plot?: PlotSpec,
): PlanDocument | null {
  const def = catalog.find((t) => t.id === id);
  if (!def) return null;
  return buildPlanFromTemplate(def, plot);
}
