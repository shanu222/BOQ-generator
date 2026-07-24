import { M_TO_FT } from './types';

/** Architectural feet-inches from metres, e.g. 10'-6" */
export function formatFtIn(meters: number): string {
  if (!Number.isFinite(meters) || meters < 0) return `0'-0"`;
  const totalIn = Math.round(meters * M_TO_FT * 12);
  let ft = Math.floor(totalIn / 12);
  let inches = totalIn % 12;
  if (inches === 12) {
    ft += 1;
    inches = 0;
  }
  return `${ft}'-${inches}"`;
}

/** Bounding box size label for rooms */
export function roomSizeLabel(polygon: { x: number; y: number }[]): string {
  if (polygon.length < 2) return '';
  const xs = polygon.map((p) => p.x);
  const ys = polygon.map((p) => p.y);
  const w = Math.max(...xs) - Math.min(...xs);
  const h = Math.max(...ys) - Math.min(...ys);
  return `${formatFtIn(w)} × ${formatFtIn(h)}`;
}
