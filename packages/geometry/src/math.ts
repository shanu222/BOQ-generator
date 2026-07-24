import type { Vec2 } from './types';

export function dist(a: Vec2, b: Vec2): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  return Math.hypot(dx, dy);
}

export function add(a: Vec2, b: Vec2): Vec2 {
  return { x: a.x + b.x, y: a.y + b.y };
}

export function sub(a: Vec2, b: Vec2): Vec2 {
  return { x: a.x - b.x, y: a.y - b.y };
}

export function scale(a: Vec2, s: number): Vec2 {
  return { x: a.x * s, y: a.y * s };
}

export function lerp(a: Vec2, b: Vec2, t: number): Vec2 {
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
}

export function normalize(a: Vec2): Vec2 {
  const d = Math.hypot(a.x, a.y) || 1;
  return { x: a.x / d, y: a.y / d };
}

export function dot(a: Vec2, b: Vec2): number {
  return a.x * b.x + a.y * b.y;
}

export function cross(a: Vec2, b: Vec2): number {
  return a.x * b.y - a.y * b.x;
}

export function midpoint(a: Vec2, b: Vec2): Vec2 {
  return lerp(a, b, 0.5);
}

export function angleOf(a: Vec2, b: Vec2): number {
  return Math.atan2(b.y - a.y, b.x - a.x);
}

export function rotate(v: Vec2, radians: number): Vec2 {
  const c = Math.cos(radians);
  const s = Math.sin(radians);
  return { x: v.x * c - v.y * s, y: v.x * s + v.y * c };
}

export function round2(n: number, decimals = 4): number {
  const f = 10 ** decimals;
  return Math.round((n + Number.EPSILON) * f) / f;
}

export function polygonArea(poly: Vec2[]): number {
  if (poly.length < 3) return 0;
  let sum = 0;
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i];
    const b = poly[(i + 1) % poly.length];
    sum += a.x * b.y - b.x * a.y;
  }
  return Math.abs(sum) / 2;
}

/** Vertex average — stable label anchor for rectangles and L-shapes. */
export function polygonCentroid(poly: Vec2[]): Vec2 {
  if (poly.length === 0) return { x: 0, y: 0 };
  let x = 0;
  let y = 0;
  for (const p of poly) {
    x += p.x;
    y += p.y;
  }
  return { x: x / poly.length, y: y / poly.length };
}

export function polygonPerimeter(poly: Vec2[]): number {
  if (poly.length < 2) return 0;
  let p = 0;
  for (let i = 0; i < poly.length; i++) {
    p += dist(poly[i], poly[(i + 1) % poly.length]);
  }
  return p;
}

export function pointInPolygon(point: Vec2, poly: Vec2[]): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i].x;
    const yi = poly[i].y;
    const xj = poly[j].x;
    const yj = poly[j].y;
    const intersect =
      yi > point.y !== yj > point.y &&
      point.x < ((xj - xi) * (point.y - yi)) / (yj - yi + Number.EPSILON) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

/** Closest point on segment AB to P, with parametric t in [0,1] */
export function closestOnSegment(
  p: Vec2,
  a: Vec2,
  b: Vec2,
): { point: Vec2; t: number; distance: number } {
  const ab = sub(b, a);
  const len2 = ab.x * ab.x + ab.y * ab.y;
  if (len2 < 1e-12) {
    return { point: { ...a }, t: 0, distance: dist(p, a) };
  }
  let t = ((p.x - a.x) * ab.x + (p.y - a.y) * ab.y) / len2;
  t = Math.max(0, Math.min(1, t));
  const point = lerp(a, b, t);
  return { point, t, distance: dist(p, point) };
}

export function wallLength(start: Vec2, end: Vec2): number {
  return round2(dist(start, end), 4);
}
