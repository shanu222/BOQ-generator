'use client';

import {
  angleOf,
  formatFtIn,
  lerp,
  normalize,
  polygonArea,
  polygonCentroid,
  rotate,
  sub,
  wallLength,
  type Door,
  type PlanDocument,
  type Vec2,
  type Wall,
  type WindowOpening,
} from '@boq/geometry';

function wallFrame(wall: Wall) {
  const u = normalize(sub(wall.end, wall.start));
  const n = rotate(u, Math.PI / 2);
  const len = wallLength(wall.start, wall.end);
  return { u, n, len };
}

/** CAD door: swing arc + leaf, gap in wall */
export function CadDoorSymbol({
  wall,
  door,
  toScreen,
  selected,
  index,
  onSelect,
}: {
  wall: Wall;
  door: Door;
  toScreen: (p: Vec2) => { x: number; y: number };
  selected: boolean;
  index: number;
  onSelect: () => void;
}) {
  const { u, n, len } = wallFrame(wall);
  const half = door.width / (2 * len);
  const t0 = Math.max(0, door.t - half);
  const t1 = Math.min(1, door.t + half);
  const hinge = lerp(wall.start, wall.end, t0);
  const latch = lerp(wall.start, wall.end, t1);
  const open = {
    x: hinge.x + n.x * door.width,
    y: hinge.y + n.y * door.width,
  };

  const H = toScreen(hinge);
  const L = toScreen(latch);
  const O = toScreen(open);
  const r = Math.hypot(O.x - H.x, O.y - H.y);
  const a0 = Math.atan2(L.y - H.y, L.x - H.x);
  const a1 = Math.atan2(O.y - H.y, O.x - H.x);
  // SVG arc flags
  let delta = a1 - a0;
  while (delta > Math.PI) delta -= Math.PI * 2;
  while (delta < -Math.PI) delta += Math.PI * 2;
  const large = Math.abs(delta) > Math.PI ? 1 : 0;
  const sweep = delta > 0 ? 1 : 0;
  const arc = `M ${L.x} ${L.y} A ${r} ${r} 0 ${large} ${sweep} ${O.x} ${O.y}`;

  const label = toScreen({
    x: hinge.x + u.x * door.width * 0.35 + n.x * door.width * 0.55,
    y: hinge.y + u.y * door.width * 0.35 + n.y * door.width * 0.55,
  });

  const stroke = selected ? 'var(--accent)' : 'var(--foreground)';

  return (
    <g
      style={{ cursor: 'pointer' }}
      onPointerDown={(e) => {
        e.stopPropagation();
        onSelect();
      }}
    >
      {/* Hit area */}
      <circle cx={(H.x + L.x) / 2} cy={(H.y + L.y) / 2} r={14} fill="transparent" />
      <line
        x1={H.x}
        y1={H.y}
        x2={O.x}
        y2={O.y}
        stroke={stroke}
        strokeWidth={selected ? 2.25 : 1.6}
      />
      <path d={arc} fill="none" stroke={stroke} strokeWidth={1.25} opacity={0.9} />
      <text
        x={label.x}
        y={label.y}
        textAnchor="middle"
        dominantBaseline="middle"
        fill={selected ? 'var(--accent)' : 'var(--muted-foreground)'}
        style={{ fontSize: 10, fontWeight: 600, fontFamily: 'var(--font-body)' }}
      >
        D{index}
      </text>
    </g>
  );
}

/** CAD window: parallel glazing lines in wall thickness */
export function CadWindowSymbol({
  wall,
  win,
  toScreen,
  scale,
  selected,
  index,
  onSelect,
}: {
  wall: Wall;
  win: WindowOpening;
  toScreen: (p: Vec2) => { x: number; y: number };
  scale: number;
  selected: boolean;
  index: number;
  onSelect: () => void;
}) {
  const { n, len } = wallFrame(wall);
  const half = win.width / (2 * len);
  const t0 = Math.max(0, win.t - half);
  const t1 = Math.min(1, win.t + half);
  const a = lerp(wall.start, wall.end, t0);
  const b = lerp(wall.start, wall.end, t1);
  const th = Math.max(wall.thickness * 0.35, 0.04);
  const offsets = [-th, 0, th];
  const stroke = selected ? 'var(--accent)' : 'var(--chart-3)';

  const mid = lerp(a, b, 0.5);
  const labelOff = {
    x: mid.x + n.x * (wall.thickness * 0.9 + 0.15),
    y: mid.y + n.y * (wall.thickness * 0.9 + 0.15),
  };
  const Lp = toScreen(labelOff);

  return (
    <g
      style={{ cursor: 'pointer' }}
      onPointerDown={(e) => {
        e.stopPropagation();
        onSelect();
      }}
    >
      <line
        x1={toScreen(a).x}
        y1={toScreen(a).y}
        x2={toScreen(b).x}
        y2={toScreen(b).y}
        stroke="transparent"
        strokeWidth={Math.max(14, wall.thickness * scale)}
      />
      {offsets.map((o, i) => {
        const p1 = { x: a.x + n.x * o, y: a.y + n.y * o };
        const p2 = { x: b.x + n.x * o, y: b.y + n.y * o };
        const s1 = toScreen(p1);
        const s2 = toScreen(p2);
        return (
          <line
            key={i}
            x1={s1.x}
            y1={s1.y}
            x2={s2.x}
            y2={s2.y}
            stroke={stroke}
            strokeWidth={i === 1 ? 1.8 : 1.2}
          />
        );
      })}
      <text
        x={Lp.x}
        y={Lp.y}
        textAnchor="middle"
        dominantBaseline="middle"
        fill={selected ? 'var(--accent)' : 'var(--muted-foreground)'}
        style={{ fontSize: 10, fontWeight: 600, fontFamily: 'var(--font-body)' }}
      >
        W{index}
      </text>
    </g>
  );
}

/** Offset dimension string with ticks */
export function CadDimension({
  a,
  b,
  offset,
  toScreen,
  color = 'var(--accent)',
}: {
  a: Vec2;
  b: Vec2;
  offset: number;
  toScreen: (p: Vec2) => { x: number; y: number };
  color?: string;
}) {
  const u = normalize(sub(b, a));
  const n = rotate(u, -Math.PI / 2);
  const a1 = { x: a.x + n.x * offset, y: a.y + n.y * offset };
  const b1 = { x: b.x + n.x * offset, y: b.y + n.y * offset };
  const tick = 0.12;
  const A = toScreen(a1);
  const B = toScreen(b1);
  const Ta0 = toScreen({ x: a1.x - n.x * tick, y: a1.y - n.y * tick });
  const Ta1 = toScreen({ x: a1.x + n.x * tick, y: a1.y + n.y * tick });
  const Tb0 = toScreen({ x: b1.x - n.x * tick, y: b1.y - n.y * tick });
  const Tb1 = toScreen({ x: b1.x + n.x * tick, y: b1.y + n.y * tick });
  const mid = toScreen({ x: (a1.x + b1.x) / 2, y: (a1.y + b1.y) / 2 });
  const len = wallLength(a, b);
  const ang = (angleOf(a1, b1) * 180) / Math.PI;
  const flip = ang > 90 || ang < -90;

  return (
    <g pointerEvents="none">
      <line x1={A.x} y1={A.y} x2={B.x} y2={B.y} stroke={color} strokeWidth={1} />
      <line x1={Ta0.x} y1={Ta0.y} x2={Ta1.x} y2={Ta1.y} stroke={color} strokeWidth={1} />
      <line x1={Tb0.x} y1={Tb0.y} x2={Tb1.x} y2={Tb1.y} stroke={color} strokeWidth={1} />
      <rect
        x={mid.x - 28}
        y={mid.y - 9}
        width={56}
        height={16}
        rx={3}
        fill="var(--card)"
        opacity={0.92}
      />
      <text
        x={mid.x}
        y={mid.y + 1}
        textAnchor="middle"
        dominantBaseline="middle"
        fill={color}
        transform={flip ? `rotate(180 ${mid.x} ${mid.y})` : undefined}
        style={{ fontSize: 11, fontWeight: 600, fontFamily: 'var(--font-body)' }}
      >
        {formatFtIn(len)}
      </text>
    </g>
  );
}

export function resolveRoomLabels(
  rooms: PlanDocument['rooms'],
  toScreen: (p: Vec2) => { x: number; y: number },
): { id: string; x: number; y: number; name: string; size: string; fontSize: number }[] {
  type Box = {
    id: string;
    x: number;
    y: number;
    name: string;
    size: string;
    fontSize: number;
    w: number;
    h: number;
  };
  // Skip stair rooms — stair graphic already labels "STAIR"
  const boxes: Box[] = rooms
    .filter((room) => room.roomType !== 'stair')
    .map((room) => {
      const xs = room.polygon.map((p) => p.x);
      const ys = room.polygon.map((p) => p.y);
      const minX = Math.min(...xs);
      const maxX = Math.max(...xs);
      const minY = Math.min(...ys);
      const maxY = Math.max(...ys);
      const area = polygonArea(room.polygon);
      const c = polygonCentroid(room.polygon);
      const s = toScreen(c);
      const fontSize = area < 3 ? 8 : area < 7 ? 9 : area < 14 ? 10 : 11;
      const name = room.name.toUpperCase();
      const size = `${formatFtIn(maxX - minX)} × ${formatFtIn(maxY - minY)}`;
      const w = Math.max(name.length, size.length) * fontSize * 0.52;
      const h = fontSize * 2.4;
      return { id: room.id, x: s.x, y: s.y, name, size, fontSize, w, h };
    });

  // Greedy de-overlap: sort large→small, nudge later labels
  boxes.sort((a, b) => b.w * b.h - a.w * a.h);
  for (let i = 0; i < boxes.length; i++) {
    for (let j = 0; j < i; j++) {
      const A = boxes[i];
      const B = boxes[j];
      const dx = Math.abs(A.x - B.x);
      const dy = Math.abs(A.y - B.y);
      const ox = (A.w + B.w) / 2 - dx;
      const oy = (A.h + B.h) / 2 - dy;
      if (ox > 0 && oy > 0) {
        if (oy <= ox) {
          A.y += A.y >= B.y ? oy + 3 : -(oy + 3);
        } else {
          A.x += A.x >= B.x ? ox + 3 : -(ox + 3);
        }
      }
    }
  }
  return boxes;
}
