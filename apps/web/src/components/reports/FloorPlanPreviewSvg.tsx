'use client';

import type { PlanDocument } from '@boq/geometry';

/** Vector SVG preview of the floor plan for the Report Center */
export function FloorPlanPreviewSvg({
  plan,
  accent = '#0d9488',
  ink = '#1e293b',
}: {
  plan: PlanDocument;
  accent?: string;
  ink?: string;
}) {
  const pad = 0.5;
  const w = plan.plot.widthM;
  const d = plan.plot.depthM;
  const vb = `${-pad} ${-pad} ${w + pad * 2} ${d + pad * 2}`;
  const structural = plan.walls.filter((wall) => wall.structuralType !== 'boundary');

  return (
    <svg viewBox={vb} className="h-auto w-full max-h-[360px]" preserveAspectRatio="xMidYMid meet">
      <rect
        x={0}
        y={0}
        width={w}
        height={d}
        fill="#fafafa"
        stroke={accent}
        strokeWidth={0.06}
        strokeDasharray="0.12 0.1"
      />
      {plan.rooms.map((room) => (
        <polygon
          key={room.id}
          points={room.polygon.map((p) => `${p.x},${p.y}`).join(' ')}
          fill={
            room.roomType === 'washroom'
              ? `${accent}22`
              : room.roomType === 'porch'
                ? '#00000008'
                : '#00000006'
          }
        />
      ))}
      {structural.map((wall) => (
        <line
          key={wall.id}
          x1={wall.start.x}
          y1={wall.start.y}
          x2={wall.end.x}
          y2={wall.end.y}
          stroke={ink}
          strokeWidth={Math.max(0.08, wall.thickness * 0.85)}
          strokeLinecap="square"
        />
      ))}
      {plan.rooms.map((room) => {
        if (room.roomType === 'stair') return null;
        const xs = room.polygon.map((p) => p.x);
        const ys = room.polygon.map((p) => p.y);
        const cx = (Math.min(...xs) + Math.max(...xs)) / 2;
        const cy = (Math.min(...ys) + Math.max(...ys)) / 2;
        return (
          <text
            key={`lb-${room.id}`}
            x={cx}
            y={cy}
            textAnchor="middle"
            dominantBaseline="middle"
            fill={ink}
            style={{ fontSize: 0.28, fontWeight: 600 }}
          >
            {room.name}
          </text>
        );
      })}
      <text x={w / 2} y={-0.2} textAnchor="middle" fill={accent} style={{ fontSize: 0.28 }}>
        {plan.plot.widthFt}′ × {plan.plot.depthFt}′
      </text>
    </svg>
  );
}
