/**
 * Vector floor-plan drawing for reports (canvas / PDF primitives).
 * Never uses screenshots — draws from PlanDocument geometry.
 */

import type { PlanDocument } from '@boq/geometry';

export interface DrawSurface {
  setStroke(color: string, width: number): void;
  setFill(color: string): void;
  line(x1: number, y1: number, x2: number, y2: number): void;
  rect(x: number, y: number, w: number, h: number, fill?: boolean): void;
  polygon(points: { x: number; y: number }[], fill?: boolean): void;
  text(str: string, x: number, y: number, size: number, color?: string): void;
  circle(x: number, y: number, r: number): void;
}

export function drawFloorPlan(
  plan: PlanDocument,
  surface: DrawSurface,
  box: { x: number; y: number; w: number; h: number },
  opts?: { showLabels?: boolean; showGrid?: boolean; primary?: string; ink?: string },
) {
  const showLabels = opts?.showLabels !== false;
  const showGrid = opts?.showGrid !== false;
  const ink = opts?.ink ?? '#1a1a1a';
  const primary = opts?.primary ?? '#0d9488';
  const pad = 8;
  const plotW = plan.plot.widthM;
  const plotD = plan.plot.depthM;
  const scale = Math.min((box.w - pad * 2) / plotW, (box.h - pad * 2) / plotD);
  const ox = box.x + (box.w - plotW * scale) / 2;
  const oy = box.y + (box.h - plotD * scale) / 2;
  const tx = (x: number) => ox + x * scale;
  const ty = (y: number) => oy + y * scale;

  // Plot boundary
  surface.setStroke(primary, 1.2);
  surface.rect(tx(0), ty(0), plotW * scale, plotD * scale, false);

  if (showGrid) {
    surface.setStroke('#d4d4d8', 0.4);
    const step = plan.gridSize || 0.1524;
    for (let x = 0; x <= plotW + 1e-6; x += step) {
      surface.line(tx(x), ty(0), tx(x), ty(plotD));
    }
    for (let y = 0; y <= plotD + 1e-6; y += step) {
      surface.line(tx(0), ty(y), tx(plotW), ty(y));
    }
  }

  // Rooms fill
  for (const room of plan.rooms) {
    const pts = room.polygon.map((p) => ({ x: tx(p.x), y: ty(p.y) }));
    surface.setFill(
      room.roomType === 'washroom'
        ? 'rgba(13,148,136,0.12)'
        : room.roomType === 'porch' || room.roomType === 'garage'
          ? 'rgba(0,0,0,0.04)'
          : 'rgba(0,0,0,0.03)',
    );
    surface.polygon(pts, true);
  }

  // Walls
  for (const wall of plan.walls) {
    if (wall.structuralType === 'boundary') continue;
    surface.setStroke(ink, Math.max(1.5, wall.thickness * scale * 0.9));
    surface.line(tx(wall.start.x), ty(wall.start.y), tx(wall.end.x), ty(wall.end.y));
  }

  // Doors
  surface.setStroke(ink, 0.8);
  for (const door of plan.doors) {
    const wall = plan.walls.find((w) => w.id === door.wallId);
    if (!wall) continue;
    const x = wall.start.x + (wall.end.x - wall.start.x) * door.t;
    const y = wall.start.y + (wall.end.y - wall.start.y) * door.t;
    surface.circle(tx(x), ty(y), Math.max(2, 0.12 * scale));
  }

  // Windows — short perpendicular ticks
  for (const win of plan.windows) {
    const wall = plan.walls.find((w) => w.id === win.wallId);
    if (!wall) continue;
    const x = wall.start.x + (wall.end.x - wall.start.x) * win.t;
    const y = wall.start.y + (wall.end.y - wall.start.y) * win.t;
    surface.setStroke('#2563eb', 1);
    surface.circle(tx(x), ty(y), Math.max(1.5, 0.1 * scale));
  }

  // Stairs
  for (const st of plan.stairs) {
    surface.setStroke(ink, 0.7);
    surface.rect(
      tx(st.origin.x),
      ty(st.origin.y),
      st.width * scale,
      Math.max(12, st.going * 5 * scale),
      false,
    );
  }

  if (showLabels) {
    for (const room of plan.rooms) {
      if (room.roomType === 'stair') continue;
      const xs = room.polygon.map((p) => p.x);
      const ys = room.polygon.map((p) => p.y);
      const cx = (Math.min(...xs) + Math.max(...xs)) / 2;
      const cy = (Math.min(...ys) + Math.max(...ys)) / 2;
      const font = Math.max(6, Math.min(9, 0.35 * scale));
      surface.text(room.name.toUpperCase(), tx(cx), ty(cy), font, ink);
    }
  }

  // Scale bar
  const barM = Math.min(3, Math.round(plotW / 4));
  const barX = box.x + pad;
  const barY = box.y + box.h - 14;
  surface.setStroke(ink, 1);
  surface.line(barX, barY, barX + barM * scale, barY);
  surface.text(`Scale 1:${Math.round(1 / (scale / 40))} · ${barM} m`, barX, barY - 4, 7, '#52525b');

  // North arrow
  const nx = box.x + box.w - 22;
  const ny = box.y + 22;
  surface.setStroke(ink, 1);
  surface.line(nx, ny + 10, nx, ny - 10);
  surface.line(nx, ny - 10, nx - 4, ny - 4);
  surface.line(nx, ny - 10, nx + 4, ny - 4);
  surface.text('N', nx - 3, ny - 14, 8, ink);

  // Overall dimensions
  surface.setStroke(primary, 0.8);
  surface.text(
    `${plan.plot.widthFt}′ × ${plan.plot.depthFt}′`,
    box.x + box.w / 2 - 30,
    box.y + 10,
    8,
    primary,
  );
}

/** Render plan to PNG data URL via Offscreen/canvas */
export async function renderFloorPlanPng(
  plan: PlanDocument,
  width = 900,
  height = 700,
  colors?: { primary?: string; ink?: string },
): Promise<string> {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);

  const surface: DrawSurface = {
    setStroke(color, w) {
      ctx.strokeStyle = color;
      ctx.lineWidth = w;
    },
    setFill(color) {
      ctx.fillStyle = color;
    },
    line(x1, y1, x2, y2) {
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    },
    rect(x, y, w, h, fill) {
      if (fill) ctx.fillRect(x, y, w, h);
      else ctx.strokeRect(x, y, w, h);
    },
    polygon(points, fill) {
      if (points.length < 2) return;
      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].x, points[i].y);
      ctx.closePath();
      if (fill) ctx.fill();
      else ctx.stroke();
    },
    text(str, x, y, size, color) {
      ctx.fillStyle = color ?? '#111';
      ctx.font = `600 ${size}px Inter, Arial, sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText(str, x, y);
      ctx.textAlign = 'left';
    },
    circle(x, y, r) {
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.stroke();
    },
  };

  drawFloorPlan(plan, surface, { x: 20, y: 20, w: width - 40, h: height - 40 }, {
    primary: colors?.primary,
    ink: colors?.ink,
  });

  return canvas.toDataURL('image/png');
}
