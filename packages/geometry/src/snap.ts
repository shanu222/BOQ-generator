import { closestOnSegment, dist, lerp, normalize, rotate, sub } from './math';
import type { PlanDocument, Vec2, Wall } from './types';

export interface SnapResult {
  point: Vec2;
  kind: 'grid' | 'endpoint' | 'wall' | 'angle' | 'none';
  wallId?: string;
  t?: number;
}

const ANGLE_STEP = Math.PI / 4; // 45°

/**
 * Deterministic snap: endpoints → wall midpoints/segments → angle lock → grid.
 */
export function snapPoint(
  raw: Vec2,
  plan: PlanDocument,
  opts: {
    origin?: Vec2;
    preferOrthogonal?: boolean;
    snapRadius?: number;
  } = {},
): SnapResult {
  const radius = opts.snapRadius ?? Math.max(plan.gridSize * 0.35, 0.08);
  let best: SnapResult = { point: raw, kind: 'none' };
  let bestDist = Infinity;

  const consider = (candidate: SnapResult, d: number) => {
    if (d < bestDist && d <= radius) {
      best = candidate;
      bestDist = d;
    }
  };

  // Endpoints
  for (const w of plan.walls) {
    consider({ point: { ...w.start }, kind: 'endpoint', wallId: w.id }, dist(raw, w.start));
    consider({ point: { ...w.end }, kind: 'endpoint', wallId: w.id }, dist(raw, w.end));
  }

  // Existing walls (project onto segment)
  for (const w of plan.walls) {
    const c = closestOnSegment(raw, w.start, w.end);
    if (c.t > 0.02 && c.t < 0.98) {
      consider(
        { point: c.point, kind: 'wall', wallId: w.id, t: c.t },
        c.distance,
      );
    }
  }

  // Angle / ortho / 45° from origin (wall drawing)
  if (opts.origin) {
    const delta = sub(raw, opts.origin);
    const len = Math.hypot(delta.x, delta.y);
    if (len > 1e-6) {
      let ang = Math.atan2(delta.y, delta.x);
      if (opts.preferOrthogonal !== false) {
        ang = Math.round(ang / ANGLE_STEP) * ANGLE_STEP;
      }
      const locked = {
        x: opts.origin.x + Math.cos(ang) * len,
        y: opts.origin.y + Math.sin(ang) * len,
      };
      // Prefer angle lock when close to snapped angle direction
      const angDist = dist(raw, locked);
      if (angDist < radius * 1.5) {
        consider({ point: locked, kind: 'angle' }, angDist);
      }
    }
  }

  // Grid
  const g = plan.gridSize || 0.1524; // ~6"
  const gridPt = {
    x: Math.round(raw.x / g) * g,
    y: Math.round(raw.y / g) * g,
  };
  consider({ point: gridPt, kind: 'grid' }, dist(raw, gridPt));

  if (best.kind === 'none') {
    return { point: gridPt, kind: 'grid' };
  }
  return best;
}

export function wallUnit(wall: Wall): Vec2 {
  return normalize(sub(wall.end, wall.start));
}

export function wallNormal(wall: Wall): Vec2 {
  const u = wallUnit(wall);
  return rotate(u, Math.PI / 2);
}

export function openingCenter(wall: Wall, t: number): Vec2 {
  return lerp(wall.start, wall.end, t);
}
