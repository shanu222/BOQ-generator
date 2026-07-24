'use client';

import type { PlanDocument } from '@boq/geometry';

/** Lightweight vector floor-plan thumbnail — not a raster snapshot. */
export function TemplatePreview({
  plan,
  className,
}: {
  plan: PlanDocument;
  className?: string;
}) {
  const pad = 0.4;
  const w = plan.plot.widthM;
  const d = plan.plot.depthM;
  const vb = `${-pad} ${-pad} ${w + pad * 2} ${d + pad * 2}`;

  const structural = plan.walls.filter((wall) => wall.structuralType !== 'boundary');

  return (
    <svg
      viewBox={vb}
      className={className}
      preserveAspectRatio="xMidYMid meet"
      aria-hidden
    >
      <rect
        x={0}
        y={0}
        width={w}
        height={d}
        fill="color-mix(in oklab, var(--accent) 6%, var(--card))"
        stroke="var(--accent)"
        strokeWidth={0.06}
        strokeDasharray="0.15 0.12"
      />
      {plan.rooms.map((room) => {
        const pts = room.polygon.map((p) => `${p.x},${p.y}`).join(' ');
        const fill =
          room.roomType === 'porch' || room.roomType === 'garage'
            ? 'color-mix(in oklab, var(--muted) 50%, transparent)'
            : room.roomType === 'washroom'
              ? 'color-mix(in oklab, var(--accent) 12%, transparent)'
              : 'color-mix(in oklab, var(--foreground) 4%, transparent)';
        return <polygon key={room.id} points={pts} fill={fill} stroke="none" />;
      })}
      {structural.map((wall) => (
        <line
          key={wall.id}
          x1={wall.start.x}
          y1={wall.start.y}
          x2={wall.end.x}
          y2={wall.end.y}
          stroke="var(--foreground)"
          strokeWidth={Math.max(0.1, wall.thickness * 0.85)}
          strokeLinecap="square"
        />
      ))}
      {plan.doors.map((door) => {
        const wall = plan.walls.find((x) => x.id === door.wallId);
        if (!wall) return null;
        const t = door.t;
        const x = wall.start.x + (wall.end.x - wall.start.x) * t;
        const y = wall.start.y + (wall.end.y - wall.start.y) * t;
        return <circle key={door.id} cx={x} cy={y} r={0.12} fill="var(--card)" stroke="var(--foreground)" strokeWidth={0.04} />;
      })}
      {plan.stairs.map((st) => (
        <rect
          key={st.id}
          x={st.origin.x}
          y={st.origin.y}
          width={st.width}
          height={Math.max(0.8, st.going * 4)}
          fill="none"
          stroke="var(--muted-foreground)"
          strokeWidth={0.05}
        />
      ))}
    </svg>
  );
}
