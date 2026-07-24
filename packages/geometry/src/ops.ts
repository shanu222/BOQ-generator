import { gid } from './id';
import { dist, lerp, midpoint, polygonArea, wallLength } from './math';
import type {
  Door,
  PlanDocument,
  PlotSpec,
  Room,
  RoomType,
  Vec2,
  Wall,
  WallMaterial,
  WindowOpening,
} from './types';
import { PLOT_PRESETS, customPlot } from './types';

export function createEmptyPlan(plot: PlotSpec, name?: string): PlanDocument {
  const now = new Date().toISOString();
  return {
    id: gid('plan'),
    name: name ?? `${plot.label} House Plan`,
    plot,
    storeyHeight: 3.05, // ~10 ft
    walls: [],
    doors: [],
    windows: [],
    columns: [],
    stairs: [],
    rooms: [],
    dimensions: [],
    gridSize: 0.1524, // 6 inches
    updatedAt: now,
  };
}

export function createPlanFromPreset(
  key: keyof typeof PLOT_PRESETS | 'custom',
  custom?: { widthFt: number; depthFt: number },
): PlanDocument {
  const plot =
    key === 'custom' && custom
      ? customPlot(custom.widthFt, custom.depthFt)
      : PLOT_PRESETS[key as keyof typeof PLOT_PRESETS];
  return createEmptyPlan(plot);
}

/** Plot boundary as four thin walls (boundary type) — visual + extractable */
export function addPlotBoundary(plan: PlanDocument): PlanDocument {
  const w = plan.plot.widthM;
  const d = plan.plot.depthM;
  const corners: Vec2[] = [
    { x: 0, y: 0 },
    { x: w, y: 0 },
    { x: w, y: d },
    { x: 0, y: d },
  ];
  const walls: Wall[] = [];
  for (let i = 0; i < 4; i++) {
    walls.push({
      id: gid('wall'),
      start: corners[i],
      end: corners[(i + 1) % 4],
      thickness: 0.23,
      height: plan.storeyHeight,
      material: 'brick',
      structuralType: 'boundary',
      foundationType: 'strip',
    });
  }
  return { ...plan, walls, updatedAt: new Date().toISOString() };
}

export function addWall(
  plan: PlanDocument,
  start: Vec2,
  end: Vec2,
  props?: Partial<Wall>,
): PlanDocument {
  if (dist(start, end) < 0.05) return plan;
  const wall: Wall = {
    id: gid('wall'),
    start: { ...start },
    end: { ...end },
    thickness: props?.thickness ?? 0.23,
    height: props?.height ?? plan.storeyHeight,
    material: props?.material ?? 'brick',
    structuralType: props?.structuralType ?? 'load-bearing',
    foundationType: props?.foundationType ?? 'strip',
  };
  return {
    ...plan,
    walls: [...plan.walls, wall],
    updatedAt: new Date().toISOString(),
  };
}

export function updateWall(
  plan: PlanDocument,
  wallId: string,
  patch: Partial<Wall>,
): PlanDocument {
  return {
    ...plan,
    walls: plan.walls.map((w) => (w.id === wallId ? { ...w, ...patch } : w)),
    updatedAt: new Date().toISOString(),
  };
}

export function deleteWall(plan: PlanDocument, wallId: string): PlanDocument {
  return {
    ...plan,
    walls: plan.walls.filter((w) => w.id !== wallId),
    doors: plan.doors.filter((d) => d.wallId !== wallId),
    windows: plan.windows.filter((w) => w.wallId !== wallId),
    updatedAt: new Date().toISOString(),
  };
}

export function addDoor(
  plan: PlanDocument,
  wallId: string,
  t: number,
  width = 0.9,
  height = 2.1,
): PlanDocument {
  const wall = plan.walls.find((w) => w.id === wallId);
  if (!wall) return plan;
  const len = wallLength(wall.start, wall.end);
  if (width >= len * 0.95) return plan;
  const door: Door = {
    id: gid('door'),
    wallId,
    t: Math.round(Math.max(0.05, Math.min(0.95, t)) * 100) / 100,
    width,
    height,
    frameWidth: 0.05,
  };
  return {
    ...plan,
    doors: [...plan.doors, door],
    updatedAt: new Date().toISOString(),
  };
}

export function updateDoor(
  plan: PlanDocument,
  doorId: string,
  patch: Partial<Door>,
): PlanDocument {
  return {
    ...plan,
    doors: plan.doors.map((d) => (d.id === doorId ? { ...d, ...patch } : d)),
    updatedAt: new Date().toISOString(),
  };
}

export function addWindow(
  plan: PlanDocument,
  wallId: string,
  t: number,
  width = 1.2,
  height = 1.2,
  sillHeight = 0.9,
): PlanDocument {
  const wall = plan.walls.find((w) => w.id === wallId);
  if (!wall) return plan;
  const win: WindowOpening = {
    id: gid('win'),
    wallId,
    t: Math.round(Math.max(0.05, Math.min(0.95, t)) * 100) / 100,
    width,
    height,
    sillHeight,
  };
  return {
    ...plan,
    windows: [...plan.windows, win],
    updatedAt: new Date().toISOString(),
  };
}

export function updateWindow(
  plan: PlanDocument,
  windowId: string,
  patch: Partial<WindowOpening>,
): PlanDocument {
  return {
    ...plan,
    windows: plan.windows.map((w) => (w.id === windowId ? { ...w, ...patch } : w)),
    updatedAt: new Date().toISOString(),
  };
}

export function addColumn(
  plan: PlanDocument,
  position: Vec2,
  size = 0.23,
): PlanDocument {
  return {
    ...plan,
    columns: [
      ...plan.columns,
      {
        id: gid('col'),
        position: { ...position },
        width: size,
        depth: size,
        height: plan.storeyHeight,
      },
    ],
    updatedAt: new Date().toISOString(),
  };
}

export function updateColumn(
  plan: PlanDocument,
  columnId: string,
  patch: Partial<PlanDocument['columns'][number]>,
): PlanDocument {
  return {
    ...plan,
    columns: plan.columns.map((c) => (c.id === columnId ? { ...c, ...patch } : c)),
    updatedAt: new Date().toISOString(),
  };
}

export function addStair(
  plan: PlanDocument,
  origin: Vec2,
): PlanDocument {
  return {
    ...plan,
    stairs: [
      ...plan.stairs,
      {
        id: gid('stair'),
        origin: { ...origin },
        width: 1.2,
        going: 0.275,
        rise: 0.175,
        steps: 12,
        rotation: 0,
      },
    ],
    updatedAt: new Date().toISOString(),
  };
}

export function updateStair(
  plan: PlanDocument,
  stairId: string,
  patch: Partial<PlanDocument['stairs'][number]>,
): PlanDocument {
  return {
    ...plan,
    stairs: plan.stairs.map((s) => (s.id === stairId ? { ...s, ...patch } : s)),
    updatedAt: new Date().toISOString(),
  };
}

export function updateRoom(
  plan: PlanDocument,
  roomId: string,
  patch: Partial<Room>,
): PlanDocument {
  return {
    ...plan,
    rooms: plan.rooms.map((r) => (r.id === roomId ? { ...r, ...patch } : r)),
    updatedAt: new Date().toISOString(),
  };
}

export function addDimension(
  plan: PlanDocument,
  start: Vec2,
  end: Vec2,
): PlanDocument {
  if (dist(start, end) < 0.05) return plan;
  return {
    ...plan,
    dimensions: [
      ...(plan.dimensions ?? []),
      { id: gid('dim'), start: { ...start }, end: { ...end } },
    ],
    updatedAt: new Date().toISOString(),
  };
}

export function addRoom(
  plan: PlanDocument,
  polygon: Vec2[],
  roomType: RoomType,
  name?: string,
): PlanDocument {
  if (polygon.length < 3 || polygonArea(polygon) < 0.5) return plan;
  const defaults = roomDefaults(roomType);
  const room: Room = {
    id: gid('room'),
    name: name ?? defaults.name,
    roomType,
    polygon: polygon.map((p) => ({ ...p })),
    floorFinish: defaults.floorFinish,
    ceilingFinish: defaults.ceilingFinish,
    wallPaint: true,
  };
  return {
    ...plan,
    rooms: [...plan.rooms, room],
    updatedAt: new Date().toISOString(),
  };
}

export function deleteElement(
  plan: PlanDocument,
  kind: 'wall' | 'door' | 'window' | 'room' | 'column' | 'stair' | 'dimension',
  id: string,
): PlanDocument {
  if (kind === 'wall') return deleteWall(plan, id);
  return {
    ...plan,
    doors: kind === 'door' ? plan.doors.filter((d) => d.id !== id) : plan.doors,
    windows: kind === 'window' ? plan.windows.filter((w) => w.id !== id) : plan.windows,
    rooms: kind === 'room' ? plan.rooms.filter((r) => r.id !== id) : plan.rooms,
    columns: kind === 'column' ? plan.columns.filter((c) => c.id !== id) : plan.columns,
    stairs: kind === 'stair' ? plan.stairs.filter((s) => s.id !== id) : plan.stairs,
    dimensions:
      kind === 'dimension'
        ? (plan.dimensions ?? []).filter((d) => d.id !== id)
        : plan.dimensions ?? [],
    updatedAt: new Date().toISOString(),
  };
}

/** Opening center in world coords */
export function openingWorldPoint(
  wall: Wall,
  t: number,
): Vec2 {
  return lerp(wall.start, wall.end, t);
}

export function findNearestOpening(
  plan: PlanDocument,
  point: Vec2,
  maxDist = 0.45,
):
  | { kind: 'door'; id: string; distance: number }
  | { kind: 'window'; id: string; distance: number }
  | null {
  let best: { kind: 'door' | 'window'; id: string; distance: number } | null = null;
  for (const door of plan.doors) {
    const wall = plan.walls.find((w) => w.id === door.wallId);
    if (!wall) continue;
    const c = openingWorldPoint(wall, door.t);
    const d = dist(point, c);
    if (d <= maxDist && (!best || d < best.distance)) {
      best = { kind: 'door', id: door.id, distance: d };
    }
  }
  for (const win of plan.windows) {
    const wall = plan.walls.find((w) => w.id === win.wallId);
    if (!wall) continue;
    const c = openingWorldPoint(wall, win.t);
    const d = dist(point, c);
    if (d <= maxDist && (!best || d < best.distance)) {
      best = { kind: 'window', id: win.id, distance: d };
    }
  }
  return best;
}

export function findNearestColumn(
  plan: PlanDocument,
  point: Vec2,
  maxDist = 0.35,
): { id: string; distance: number } | null {
  let best: { id: string; distance: number } | null = null;
  for (const col of plan.columns) {
    const d = dist(point, col.position);
    if (d <= maxDist && (!best || d < best.distance)) best = { id: col.id, distance: d };
  }
  return best;
}

export function findNearestStair(
  plan: PlanDocument,
  point: Vec2,
  maxDist = 0.8,
): { id: string; distance: number } | null {
  let best: { id: string; distance: number } | null = null;
  for (const st of plan.stairs) {
    const d = dist(point, st.origin);
    if (d <= maxDist && (!best || d < best.distance)) best = { id: st.id, distance: d };
  }
  return best;
}

export function findNearestWall(
  plan: PlanDocument,
  point: Vec2,
  maxDist = 0.4,
): { wall: Wall; t: number; distance: number } | null {
  let best: { wall: Wall; t: number; distance: number } | null = null;
  for (const wall of plan.walls) {
    const ab = { x: wall.end.x - wall.start.x, y: wall.end.y - wall.start.y };
    const len2 = ab.x * ab.x + ab.y * ab.y;
    if (len2 < 1e-12) continue;
    let t = ((point.x - wall.start.x) * ab.x + (point.y - wall.start.y) * ab.y) / len2;
    t = Math.max(0, Math.min(1, t));
    const proj = lerp(wall.start, wall.end, t);
    const distance = dist(point, proj);
    if (distance <= maxDist && (!best || distance < best.distance)) {
      best = { wall, t, distance };
    }
  }
  return best;
}

function roomDefaults(type: RoomType): {
  name: string;
  floorFinish: Room['floorFinish'];
  ceilingFinish: Room['ceilingFinish'];
} {
  switch (type) {
    case 'kitchen':
      return { name: 'Kitchen', floorFinish: 'tiles', ceilingFinish: 'gypsum' };
    case 'washroom':
      return { name: 'Washroom', floorFinish: 'tiles', ceilingFinish: 'gypsum' };
    case 'bedroom':
      return { name: 'Bedroom', floorFinish: 'tiles', ceilingFinish: 'gypsum' };
    case 'drawing-room':
      return { name: 'Drawing Room', floorFinish: 'tiles', ceilingFinish: 'gypsum' };
    case 'lounge':
      return { name: 'Lounge', floorFinish: 'tiles', ceilingFinish: 'gypsum' };
    case 'dining':
      return { name: 'Dining', floorFinish: 'tiles', ceilingFinish: 'gypsum' };
    case 'store':
      return { name: 'Store', floorFinish: 'concrete', ceilingFinish: 'plaster' };
    case 'garage':
      return { name: 'Garage', floorFinish: 'concrete', ceilingFinish: 'none' };
    case 'porch':
      return { name: 'Porch', floorFinish: 'tiles', ceilingFinish: 'none' };
    case 'stair':
      return { name: 'Stair', floorFinish: 'concrete', ceilingFinish: 'none' };
    default:
      return { name: 'Room', floorFinish: 'tiles', ceilingFinish: 'gypsum' };
  }
}

export function wallMid(wall: Wall): Vec2 {
  return midpoint(wall.start, wall.end);
}

export function setWallMaterial(plan: PlanDocument, wallId: string, material: WallMaterial) {
  return updateWall(plan, wallId, { material });
}
