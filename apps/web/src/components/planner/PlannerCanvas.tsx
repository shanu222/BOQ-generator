'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  addColumn,
  addDimension,
  addDoor,
  addRoom,
  addStair,
  addWall,
  addWindow,
  deleteElement,
  findNearestColumn,
  findNearestOpening,
  findNearestStair,
  findNearestWall,
  formatFtIn,
  pointInPolygon,
  polygonArea,
  snapPoint,
  wallLength,
  type PlanDocument,
  type PlannerTool,
  type RoomType,
  type Vec2,
  M_TO_FT,
} from '@boq/geometry';
import {
  CadDimension,
  CadDoorSymbol,
  CadWindowSymbol,
  resolveRoomLabels,
} from '@/components/planner/CadSymbols';
import { cn } from '@/lib/cn';

const PAD = 56;

/** Prefer the smallest room containing the point (handles nested washroom/store/stair). */
function findRoomAt(plan: PlanDocument, point: Vec2) {
  const hits = plan.rooms.filter((r) => pointInPolygon(point, r.polygon));
  if (hits.length === 0) return null;
  return hits.slice().sort((a, b) => polygonArea(a.polygon) - polygonArea(b.polygon))[0];
}

export type PlannerSelection =
  | { kind: 'wall'; id: string }
  | { kind: 'door'; id: string }
  | { kind: 'window'; id: string }
  | { kind: 'room'; id: string }
  | { kind: 'column'; id: string }
  | { kind: 'stair'; id: string }
  | { kind: 'dimension'; id: string }
  | null;

interface PlannerCanvasProps {
  plan: PlanDocument;
  tool: PlannerTool;
  onPlanChange: (mutator: (p: PlanDocument) => PlanDocument) => void;
  selection: PlannerSelection;
  onSelect: (s: PlannerSelection) => void;
  roomType?: RoomType;
}

export function PlannerCanvas({
  plan,
  tool,
  onPlanChange,
  selection,
  onSelect,
  roomType = 'bedroom',
}: PlannerCanvasProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [draftStart, setDraftStart] = useState<Vec2 | null>(null);
  const [cursor, setCursor] = useState<Vec2 | null>(null);
  const [roomPts, setRoomPts] = useState<Vec2[]>([]);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [scale, setScale] = useState(52);

  // Reset drafts when tool changes
  useEffect(() => {
    setDraftStart(null);
    setRoomPts([]);
  }, [tool]);

  const safePlan = useMemo(
    () => ({ ...plan, dimensions: plan.dimensions ?? [] }),
    [plan],
  );

  const plotW = safePlan.plot.widthM;
  const plotD = safePlan.plot.depthM;
  const viewW = plotW * scale + PAD * 2;
  const viewH = plotD * scale + PAD * 2;

  const toScreen = useCallback(
    (p: Vec2) => ({
      x: PAD + p.x * scale + pan.x,
      y: PAD + p.y * scale + pan.y,
    }),
    [scale, pan],
  );

  const toWorld = useCallback(
    (clientX: number, clientY: number): Vec2 => {
      const svg = svgRef.current;
      if (!svg) return { x: 0, y: 0 };
      // Must use SVG CTM — getBoundingClientRect alone breaks when viewBox is scaled
      const ctm = svg.getScreenCTM();
      if (!ctm) return { x: 0, y: 0 };
      const pt = svg.createSVGPoint();
      pt.x = clientX;
      pt.y = clientY;
      const local = pt.matrixTransform(ctm.inverse());
      return {
        x: (local.x - PAD - pan.x) / scale,
        y: (local.y - PAD - pan.y) / scale,
      };
    },
    [scale, pan],
  );

  const snapEnabled = tool !== 'select' && tool !== 'delete';

  const snap = useCallback(
    (raw: Vec2) =>
      snapPoint(raw, safePlan, {
        origin: draftStart ?? (roomPts.length ? roomPts[roomPts.length - 1] : undefined),
        preferOrthogonal: true,
        snapRadius: Math.max(safePlan.gridSize * 0.45, 0.1),
      }),
    [safePlan, draftStart, roomPts],
  );

  const onPointerMove = (e: React.PointerEvent) => {
    const raw = toWorld(e.clientX, e.clientY);
    if (snapEnabled) {
      setCursor(snap(raw).point);
    } else {
      setCursor(null);
    }
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    const raw = toWorld(e.clientX, e.clientY);
    // Select / delete: exact cursor hit. Drawing tools: snap for accuracy.
    const s = snapEnabled ? snap(raw).point : raw;

    if (tool === 'wall') {
      if (!draftStart) setDraftStart(s);
      else {
        onPlanChange((p) => addWall(p, draftStart, s));
        setDraftStart(null);
      }
      return;
    }

    if (tool === 'door' || tool === 'window') {
      const hit = findNearestWall(safePlan, s, 0.55);
      if (!hit || hit.wall.structuralType === 'boundary') return;
      onPlanChange((p) =>
        tool === 'door'
          ? addDoor(p, hit.wall.id, hit.t)
          : addWindow(p, hit.wall.id, hit.t),
      );
      return;
    }

    if (tool === 'column') {
      onPlanChange((p) => addColumn(p, s));
      return;
    }

    if (tool === 'stair') {
      onPlanChange((p) => addStair(p, s));
      return;
    }

    if (tool === 'dimension') {
      if (!draftStart) setDraftStart(s);
      else {
        onPlanChange((p) => addDimension(p, draftStart, s));
        setDraftStart(null);
      }
      return;
    }

    if (tool === 'room') {
      if (roomPts.length >= 3) {
        const first = roomPts[0];
        if (Math.hypot(s.x - first.x, s.y - first.y) < 0.25) {
          onPlanChange((p) => addRoom(p, roomPts, roomType));
          setRoomPts([]);
          return;
        }
      }
      setRoomPts((pts) => [...pts, s]);
      return;
    }

    if (tool === 'delete') {
      const opening = findNearestOpening(safePlan, raw, 0.5);
      if (opening) {
        onPlanChange((p) => deleteElement(p, opening.kind, opening.id));
        onSelect(null);
        return;
      }
      const col = findNearestColumn(safePlan, raw, 0.45);
      if (col) {
        onPlanChange((p) => deleteElement(p, 'column', col.id));
        onSelect(null);
        return;
      }
      const st = findNearestStair(safePlan, raw, 0.85);
      if (st) {
        onPlanChange((p) => deleteElement(p, 'stair', st.id));
        onSelect(null);
        return;
      }
      const hit = findNearestWall(safePlan, raw, 0.45);
      if (hit && hit.wall.structuralType !== 'boundary') {
        onPlanChange((p) => deleteElement(p, 'wall', hit.wall.id));
        onSelect(null);
        return;
      }
      const room = findRoomAt(safePlan, raw);
      if (room) {
        onPlanChange((p) => deleteElement(p, 'room', room.id));
        onSelect(null);
      }
      return;
    }

    if (tool === 'select') {
      // Priority: openings → columns → stairs → walls → smallest containing room
      const opening = findNearestOpening(safePlan, raw, 0.5);
      if (opening) {
        onSelect({ kind: opening.kind, id: opening.id });
        return;
      }
      const col = findNearestColumn(safePlan, raw, 0.45);
      if (col) {
        onSelect({ kind: 'column', id: col.id });
        return;
      }
      const st = findNearestStair(safePlan, raw, 0.85);
      if (st) {
        onSelect({ kind: 'stair', id: st.id });
        return;
      }
      const hit = findNearestWall(safePlan, raw, 0.42);
      if (hit && hit.wall.structuralType !== 'boundary') {
        onSelect({ kind: 'wall', id: hit.wall.id });
        return;
      }
      const room = findRoomAt(safePlan, raw);
      if (room) {
        onSelect({ kind: 'room', id: room.id });
        return;
      }
      onSelect(null);
    }
  };

  const gridLines = useMemo(() => {
    const lines: { x1: number; y1: number; x2: number; y2: number }[] = [];
    const g = safePlan.gridSize;
    for (let x = 0; x <= plotW + 1e-6; x += g) {
      const a = toScreen({ x, y: 0 });
      const b = toScreen({ x, y: plotD });
      lines.push({ x1: a.x, y1: a.y, x2: b.x, y2: b.y });
    }
    for (let y = 0; y <= plotD + 1e-6; y += g) {
      const a = toScreen({ x: 0, y });
      const b = toScreen({ x: plotW, y });
      lines.push({ x1: a.x, y1: a.y, x2: b.x, y2: b.y });
    }
    return lines;
  }, [safePlan.gridSize, plotW, plotD, toScreen]);

  const roomLabels = useMemo(
    () => resolveRoomLabels(safePlan.rooms, toScreen),
    [safePlan.rooms, toScreen],
  );

  const structuralWalls = safePlan.walls.filter((w) => w.structuralType !== 'boundary');

  const toolHint =
    tool === 'wall'
      ? draftStart
        ? 'Click end point'
        : 'Click start point'
      : tool === 'room'
        ? roomPts.length
          ? `Corner ${roomPts.length + 1} · click near first to close`
          : 'Click corners · close on first point'
        : tool === 'dimension'
          ? draftStart
            ? 'Click second point'
            : 'Click first point'
          : tool === 'door' || tool === 'window'
            ? 'Click on a wall'
            : tool === 'column' || tool === 'stair'
              ? 'Click to place'
              : tool === 'delete'
                ? 'Click element to delete'
                : 'Click to select';

  return (
    <div className="relative h-full min-h-[480px] overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--card)]">
      <div className="absolute right-3 top-3 z-10 flex items-center gap-0.5 rounded-md border border-[var(--border)] bg-[var(--card)]/95 p-0.5 shadow-sm backdrop-blur-sm">
        <button
          type="button"
          className="flex h-8 w-8 items-center justify-center rounded text-sm font-medium text-[var(--foreground)] hover:bg-[var(--muted)]"
          onClick={() => setScale((v) => Math.min(120, v * 1.15))}
          title="Zoom in"
          aria-label="Zoom in"
        >
          +
        </button>
        <button
          type="button"
          className="flex h-8 w-8 items-center justify-center rounded text-sm font-medium text-[var(--foreground)] hover:bg-[var(--muted)]"
          onClick={() => setScale((v) => Math.max(18, v / 1.15))}
          title="Zoom out"
          aria-label="Zoom out"
        >
          −
        </button>
        <button
          type="button"
          className="h-8 rounded px-2.5 text-[11px] font-medium text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)]"
          onClick={() => {
            setScale(52);
            setPan({ x: 0, y: 0 });
          }}
          title="Fit view"
        >
          Fit
        </button>
      </div>

      <svg
        ref={svgRef}
        width="100%"
        height="100%"
        viewBox={`0 0 ${viewW} ${viewH}`}
        className={cn(
          'h-full w-full touch-none',
          tool === 'select' || tool === 'delete' ? 'cursor-default' : 'cursor-crosshair',
        )}
        onPointerMove={onPointerMove}
        onPointerDown={onPointerDown}
        onPointerLeave={() => setCursor(null)}
      >
        <defs>
          <pattern id="wall-hatch" patternUnits="userSpaceOnUse" width="6" height="6" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="6" stroke="var(--foreground)" strokeWidth="1.2" opacity="0.2" />
          </pattern>
        </defs>

        <g stroke="var(--border)" strokeWidth={0.5} opacity={0.45}>
          {gridLines.map((l, i) => (
            <line key={i} {...l} />
          ))}
        </g>

        <rect
          x={toScreen({ x: 0, y: 0 }).x}
          y={toScreen({ x: 0, y: 0 }).y}
          width={plotW * scale}
          height={plotD * scale}
          fill="color-mix(in oklab, var(--accent) 3%, transparent)"
          stroke="var(--accent)"
          strokeWidth={1.25}
          strokeDasharray="5 4"
        />

        {/* Rooms fill only — labels drawn later above dims */}
        {safePlan.rooms.map((room) => {
          const pts = room.polygon.map(toScreen);
          const d = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ') + ' Z';
          const selected = selection?.kind === 'room' && selection.id === room.id;
          return (
            <path
              key={room.id}
              d={d}
              fill={
                selected
                  ? 'color-mix(in oklab, var(--accent) 18%, transparent)'
                  : 'color-mix(in oklab, var(--muted) 35%, transparent)'
              }
              stroke="none"
            />
          );
        })}

        {/* Walls as thick strokes with hatch feel */}
        {structuralWalls.map((wall) => {
          const a = toScreen(wall.start);
          const b = toScreen(wall.end);
          const selected = selection?.kind === 'wall' && selection.id === wall.id;
          const sw = Math.max(4, wall.thickness * scale);
          return (
            <g key={wall.id}>
              <line
                x1={a.x}
                y1={a.y}
                x2={b.x}
                y2={b.y}
                stroke="var(--foreground)"
                strokeWidth={sw}
                strokeLinecap="square"
                opacity={0.92}
              />
              <line
                x1={a.x}
                y1={a.y}
                x2={b.x}
                y2={b.y}
                stroke="url(#wall-hatch)"
                strokeWidth={sw - 1}
                strokeLinecap="square"
              />
              {selected && (
                <line
                  x1={a.x}
                  y1={a.y}
                  x2={b.x}
                  y2={b.y}
                  stroke="var(--accent)"
                  strokeWidth={sw + 3}
                  strokeLinecap="square"
                  opacity={0.35}
                />
              )}
            </g>
          );
        })}

        {/* Auto exterior plot dimensions */}
        <CadDimension
          a={{ x: 0, y: 0 }}
          b={{ x: plotW, y: 0 }}
          offset={-0.55}
          toScreen={toScreen}
        />
        <CadDimension
          a={{ x: 0, y: 0 }}
          b={{ x: 0, y: plotD }}
          offset={-0.55}
          toScreen={toScreen}
        />

        {/* Selected wall dimension only — avoids label collisions */}
        {selection?.kind === 'wall' &&
          (() => {
            const wall = structuralWalls.find((w) => w.id === selection.id);
            if (!wall) return null;
            return (
              <CadDimension
                a={wall.start}
                b={wall.end}
                offset={0.45}
                toScreen={toScreen}
                color="var(--accent)"
              />
            );
          })()}

        {/* User dimensions from Dim tool */}
        {(safePlan.dimensions ?? []).map((dim) => (
          <CadDimension
            key={dim.id}
            a={dim.start}
            b={dim.end}
            offset={0.35}
            toScreen={toScreen}
            color="var(--accent)"
          />
        ))}

        {/* Doors */}
        {safePlan.doors.map((door, i) => {
          const wall = safePlan.walls.find((w) => w.id === door.wallId);
          if (!wall) return null;
          return (
            <CadDoorSymbol
              key={door.id}
              wall={wall}
              door={door}
              toScreen={toScreen}
              selected={selection?.kind === 'door' && selection.id === door.id}
              index={i + 1}
              onSelect={() => onSelect({ kind: 'door', id: door.id })}
            />
          );
        })}

        {/* Windows */}
        {safePlan.windows.map((win, i) => {
          const wall = safePlan.walls.find((w) => w.id === win.wallId);
          if (!wall) return null;
          return (
            <CadWindowSymbol
              key={win.id}
              wall={wall}
              win={win}
              toScreen={toScreen}
              scale={scale}
              selected={selection?.kind === 'window' && selection.id === win.id}
              index={i + 1}
              onSelect={() => onSelect({ kind: 'window', id: win.id })}
            />
          );
        })}

        {/* Columns */}
        {safePlan.columns.map((col) => {
          const p = toScreen(col.position);
          const s = Math.max(6, col.width * scale);
          const selected = selection?.kind === 'column' && selection.id === col.id;
          return (
            <rect
              key={col.id}
              x={p.x - s / 2}
              y={p.y - s / 2}
              width={s}
              height={s}
              fill={selected ? 'var(--accent)' : 'var(--foreground)'}
              stroke="var(--card)"
              strokeWidth={1}
              style={{ cursor: 'pointer' }}
              onPointerDown={(e) => {
                e.stopPropagation();
                onSelect({ kind: 'column', id: col.id });
              }}
            />
          );
        })}

        {/* Stairs */}
        {safePlan.stairs.map((st) => {
          const o = toScreen(st.origin);
          const w = st.width * scale;
          const d = st.going * st.steps * scale * 0.35;
          const selected = selection?.kind === 'stair' && selection.id === st.id;
          return (
            <g
              key={st.id}
              style={{ cursor: 'pointer' }}
              onPointerDown={(e) => {
                e.stopPropagation();
                onSelect({ kind: 'stair', id: st.id });
              }}
            >
              <rect
                x={o.x}
                y={o.y}
                width={w}
                height={Math.max(d, 24)}
                fill="color-mix(in oklab, var(--muted) 70%, transparent)"
                stroke={selected ? 'var(--accent)' : 'var(--foreground)'}
                strokeWidth={1.5}
              />
              {Array.from({ length: Math.min(st.steps, 10) }).map((_, i) => (
                <line
                  key={i}
                  x1={o.x}
                  y1={o.y + ((i + 1) * Math.max(d, 24)) / 10}
                  x2={o.x + w}
                  y2={o.y + ((i + 1) * Math.max(d, 24)) / 10}
                  stroke="var(--foreground)"
                  strokeWidth={0.8}
                  opacity={0.5}
                />
              ))}
              <text
                x={o.x + w / 2}
                y={o.y + Math.max(d, 24) / 2}
                textAnchor="middle"
                dominantBaseline="middle"
                fill="var(--muted-foreground)"
                style={{ fontSize: 10, fontWeight: 600 }}
              >
                STAIR
              </text>
            </g>
          );
        })}

        {/* Room labels (de-overlapped, with backdrop) */}
        {roomLabels.map((lb) => (
          <g key={lb.id} pointerEvents="none">
            <rect
              x={lb.x - lb.name.length * lb.fontSize * 0.28}
              y={lb.y - lb.fontSize * 1.35}
              width={Math.max(lb.name.length, lb.size.length) * lb.fontSize * 0.56}
              height={lb.fontSize * 2.55}
              rx={4}
              fill="var(--card)"
              opacity={0.88}
            />
            <text
              x={lb.x}
              y={lb.y - 4}
              textAnchor="middle"
              fill="var(--foreground)"
              style={{
                fontSize: lb.fontSize,
                fontWeight: 700,
                letterSpacing: '0.04em',
                fontFamily: 'var(--font-body)',
              }}
            >
              {lb.name}
            </text>
            <text
              x={lb.x}
              y={lb.y + lb.fontSize + 2}
              textAnchor="middle"
              fill="var(--muted-foreground)"
              style={{ fontSize: lb.fontSize - 1, fontFamily: 'var(--font-body)' }}
            >
              {lb.size}
            </text>
          </g>
        ))}

        {/* Room draft */}
        {roomPts.length > 0 && (
          <polyline
            points={[...roomPts, ...(cursor ? [cursor] : [])]
              .map((p) => {
                const s = toScreen(p);
                return `${s.x},${s.y}`;
              })
              .join(' ')}
            fill="none"
            stroke="var(--accent)"
            strokeWidth={1.5}
            strokeDasharray="5 4"
          />
        )}

        {/* Draft wall / dim */}
        {draftStart && cursor && (tool === 'wall' || tool === 'dimension') && (
          <g>
            <line
              x1={toScreen(draftStart).x}
              y1={toScreen(draftStart).y}
              x2={toScreen(cursor).x}
              y2={toScreen(cursor).y}
              stroke="var(--accent)"
              strokeWidth={2}
              strokeDasharray="5 4"
            />
            <text
              x={(toScreen(draftStart).x + toScreen(cursor).x) / 2}
              y={(toScreen(draftStart).y + toScreen(cursor).y) / 2 - 10}
              textAnchor="middle"
              fill="var(--accent)"
              style={{ fontSize: 11, fontWeight: 600 }}
            >
              {formatFtIn(wallLength(draftStart, cursor))}
            </text>
          </g>
        )}

        {cursor && snapEnabled && (
          <circle
            cx={toScreen(cursor).x}
            cy={toScreen(cursor).y}
            r={3.5}
            fill="var(--accent)"
            opacity={0.85}
          />
        )}
      </svg>

      <div className="pointer-events-none absolute bottom-3 left-3 right-3 flex items-end justify-between gap-2">
        <div className="rounded border border-[var(--border)] bg-[var(--card)]/95 px-2.5 py-1.5 font-mono text-[10px] tracking-wide text-[var(--muted-foreground)] backdrop-blur">
          {safePlan.plot.label} · {safePlan.plot.widthFt}′ × {safePlan.plot.depthFt}′ · Grid{' '}
          {(safePlan.gridSize * M_TO_FT * 12).toFixed(0)}″ ·{' '}
          {snapEnabled ? 'Snap on' : 'Snap off'} · {tool}
        </div>
        <div className="rounded border border-[color-mix(in_oklab,var(--accent)_35%,var(--border))] bg-[var(--card)]/95 px-2.5 py-1.5 text-[11px] font-medium text-[var(--foreground)] backdrop-blur">
          {toolHint}
        </div>
      </div>
    </div>
  );
}
