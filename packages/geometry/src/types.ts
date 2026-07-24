/**
 * BOQ Pro Geometry Engine — deterministic CAD-lite types.
 * Coordinates are in metres (SI) for direct compatibility with @boq/engine.
 */

export type Vec2 = { x: number; y: number };

export type WallMaterial = 'brick' | 'block' | 'rcc';
export type WallStructuralType = 'load-bearing' | 'partition' | 'boundary';
export type FoundationType = 'isolated' | 'strip' | 'raft' | 'none';

export type RoomType =
  | 'bedroom'
  | 'kitchen'
  | 'washroom'
  | 'drawing-room'
  | 'lounge'
  | 'dining'
  | 'store'
  | 'garage'
  | 'porch'
  | 'stair'
  | 'corridor'
  | 'other';

export type PlannerTool =
  | 'select'
  | 'wall'
  | 'door'
  | 'window'
  | 'column'
  | 'stair'
  | 'room'
  | 'dimension'
  | 'delete';

export type PlotSizeKey = '3-marla' | '5-marla' | '7-marla' | '10-marla' | '20-marla' | 'custom';

export interface PlotSpec {
  key: PlotSizeKey;
  label: string;
  widthM: number;
  depthM: number;
  widthFt: number;
  depthFt: number;
}

export interface Wall {
  id: string;
  start: Vec2;
  end: Vec2;
  thickness: number; // m
  height: number; // m
  material: WallMaterial;
  structuralType: WallStructuralType;
  foundationType: FoundationType;
}

export interface Door {
  id: string;
  wallId: string;
  /** Parametric position along wall [0, 1] from start → end */
  t: number;
  width: number; // m
  height: number; // m
  frameWidth: number; // m
}

export interface WindowOpening {
  id: string;
  wallId: string;
  t: number;
  width: number;
  height: number;
  sillHeight: number;
}

export interface Column {
  id: string;
  position: Vec2;
  width: number;
  depth: number;
  height: number;
}

export interface StairElement {
  id: string;
  origin: Vec2;
  width: number;
  going: number;
  rise: number;
  steps: number;
  rotation: number; // radians
}

/** User-placed or auto dimension annotation (metres) */
export interface PlanDimension {
  id: string;
  start: Vec2;
  end: Vec2;
}

export interface Room {
  id: string;
  name: string;
  roomType: RoomType;
  /** Closed polygon in CCW or CW order (first ≠ last; closed implicitly) */
  polygon: Vec2[];
  floorFinish: 'tiles' | 'concrete' | 'none';
  ceilingFinish: 'gypsum' | 'plaster' | 'none';
  wallPaint: boolean;
}

export interface PlanDocument {
  id: string;
  name: string;
  plot: PlotSpec;
  storeyHeight: number;
  walls: Wall[];
  doors: Door[];
  windows: WindowOpening[];
  columns: Column[];
  stairs: StairElement[];
  rooms: Room[];
  dimensions: PlanDimension[];
  gridSize: number; // m
  updatedAt: string;
}

export const FT_TO_M = 0.3048;
export const M_TO_FT = 1 / FT_TO_M;

/** Default Pakistan residential plot sizes (usable house footprints, Lahore-style) */
export const PLOT_PRESETS: Record<Exclude<PlotSizeKey, 'custom'>, PlotSpec> = {
  '3-marla': {
    key: '3-marla',
    label: '3 Marla',
    widthFt: 30,
    depthFt: 40,
    widthM: 30 * FT_TO_M,
    depthM: 40 * FT_TO_M,
  },
  '5-marla': {
    key: '5-marla',
    label: '5 Marla',
    widthFt: 30,
    depthFt: 55,
    widthM: 30 * FT_TO_M,
    depthM: 55 * FT_TO_M,
  },
  '7-marla': {
    key: '7-marla',
    label: '7 Marla',
    widthFt: 35,
    depthFt: 60,
    widthM: 35 * FT_TO_M,
    depthM: 60 * FT_TO_M,
  },
  '10-marla': {
    key: '10-marla',
    label: '10 Marla',
    widthFt: 40,
    depthFt: 70,
    widthM: 40 * FT_TO_M,
    depthM: 70 * FT_TO_M,
  },
  '20-marla': {
    key: '20-marla',
    label: '20 Marla',
    widthFt: 50,
    depthFt: 90,
    widthM: 50 * FT_TO_M,
    depthM: 90 * FT_TO_M,
  },
};

export function customPlot(widthFt: number, depthFt: number): PlotSpec {
  return {
    key: 'custom',
    label: 'Custom Plot',
    widthFt,
    depthFt,
    widthM: widthFt * FT_TO_M,
    depthM: depthFt * FT_TO_M,
  };
}
