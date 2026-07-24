'use client';

import {
  updateColumn,
  updateDoor,
  updateRoom,
  updateStair,
  updateWall,
  updateWindow,
  wallLength,
  polygonArea,
  M_TO_FT,
  formatFtIn,
  type PlanDocument,
  type RoomType,
} from '@boq/geometry';
import { Input, Label, Select } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatNumber } from '@/lib/format';
import type { PlannerSelection } from '@/components/planner/PlannerCanvas';

const ROOM_TYPES: { value: RoomType; label: string }[] = [
  { value: 'bedroom', label: 'Bedroom' },
  { value: 'kitchen', label: 'Kitchen' },
  { value: 'washroom', label: 'Washroom' },
  { value: 'drawing-room', label: 'Drawing Room' },
  { value: 'lounge', label: 'Lounge' },
  { value: 'dining', label: 'Dining' },
  { value: 'store', label: 'Store' },
  { value: 'garage', label: 'Garage' },
  { value: 'porch', label: 'Porch' },
  { value: 'stair', label: 'Stair' },
  { value: 'corridor', label: 'Corridor' },
  { value: 'other', label: 'Other' },
];

export function PlannerProperties({
  plan,
  selection,
  onPlanChange,
}: {
  plan: PlanDocument;
  selection: PlannerSelection;
  onPlanChange: (mutator: (p: PlanDocument) => PlanDocument) => void;
}) {
  if (!selection) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Properties</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-[var(--muted-foreground)]">
          <p>Select a wall, door, window, room, column, or stair to edit.</p>
          <ul className="space-y-1 tabular-nums">
            <li>Walls: {plan.walls.filter((w) => w.structuralType !== 'boundary').length}</li>
            <li>Doors: {plan.doors.length}</li>
            <li>Windows: {plan.windows.length}</li>
            <li>Rooms: {plan.rooms.length}</li>
            <li>Columns: {plan.columns.length}</li>
            <li>Stairs: {plan.stairs.length}</li>
            <li>Storey: {formatNumber(plan.storeyHeight)} m</li>
          </ul>
        </CardContent>
      </Card>
    );
  }

  if (selection.kind === 'wall') {
    const wall = plan.walls.find((w) => w.id === selection.id);
    if (!wall) return null;
    const len = wallLength(wall.start, wall.end);
    return (
      <Card>
        <CardHeader>
          <CardTitle>Wall</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm tabular-nums text-[var(--muted-foreground)]">
            Length {formatFtIn(len)} ({formatNumber(len)} m)
          </p>
          <Field
            label="Thickness (m)"
            type="number"
            step={0.01}
            value={wall.thickness}
            onChange={(v) =>
              onPlanChange((p) => updateWall(p, wall.id, { thickness: v || wall.thickness }))
            }
          />
          <Field
            label="Height (m)"
            type="number"
            step={0.01}
            value={wall.height}
            onChange={(v) =>
              onPlanChange((p) => updateWall(p, wall.id, { height: v || wall.height }))
            }
          />
          <div>
            <Label>Material</Label>
            <Select
              className="mt-1"
              value={wall.material}
              onChange={(e) =>
                onPlanChange((p) =>
                  updateWall(p, wall.id, { material: e.target.value as typeof wall.material }),
                )
              }
            >
              <option value="brick">Brick Masonry</option>
              <option value="block">Block</option>
              <option value="rcc">RCC</option>
            </Select>
          </div>
          <div>
            <Label>Type</Label>
            <Select
              className="mt-1"
              value={wall.structuralType}
              onChange={(e) =>
                onPlanChange((p) =>
                  updateWall(p, wall.id, {
                    structuralType: e.target.value as typeof wall.structuralType,
                  }),
                )
              }
            >
              <option value="load-bearing">Load bearing</option>
              <option value="partition">Partition</option>
              <option value="boundary">Boundary</option>
            </Select>
          </div>
          <div>
            <Label>Foundation</Label>
            <Select
              className="mt-1"
              value={wall.foundationType}
              onChange={(e) =>
                onPlanChange((p) =>
                  updateWall(p, wall.id, {
                    foundationType: e.target.value as typeof wall.foundationType,
                  }),
                )
              }
            >
              <option value="strip">Strip</option>
              <option value="isolated">Isolated</option>
              <option value="raft">Raft</option>
              <option value="none">None</option>
            </Select>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (selection.kind === 'door') {
    const door = plan.doors.find((d) => d.id === selection.id);
    if (!door) return null;
    return (
      <Card>
        <CardHeader>
          <CardTitle>Door</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Field
            label="Width (m)"
            type="number"
            step={0.05}
            value={door.width}
            onChange={(v) =>
              onPlanChange((p) => updateDoor(p, door.id, { width: v || door.width }))
            }
          />
          <Field
            label="Height (m)"
            type="number"
            step={0.05}
            value={door.height}
            onChange={(v) =>
              onPlanChange((p) => updateDoor(p, door.id, { height: v || door.height }))
            }
          />
          <Field
            label="Position along wall (0–1)"
            type="number"
            step={0.01}
            value={Math.round(door.t * 100) / 100}
            onChange={(v) =>
              onPlanChange((p) =>
                updateDoor(p, door.id, {
                  t: Math.round(Math.max(0.05, Math.min(0.95, v)) * 100) / 100,
                }),
              )
            }
          />
          <p className="text-xs text-[var(--muted-foreground)]">
            {(door.width * 1000).toFixed(0)} mm × {(door.height * 1000).toFixed(0)} mm
          </p>
        </CardContent>
      </Card>
    );
  }

  if (selection.kind === 'window') {
    const win = plan.windows.find((w) => w.id === selection.id);
    if (!win) return null;
    return (
      <Card>
        <CardHeader>
          <CardTitle>Window</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Field
            label="Width (m)"
            type="number"
            step={0.05}
            value={win.width}
            onChange={(v) =>
              onPlanChange((p) => updateWindow(p, win.id, { width: v || win.width }))
            }
          />
          <Field
            label="Height (m)"
            type="number"
            step={0.05}
            value={win.height}
            onChange={(v) =>
              onPlanChange((p) => updateWindow(p, win.id, { height: v || win.height }))
            }
          />
          <Field
            label="Sill height (m)"
            type="number"
            step={0.05}
            value={win.sillHeight}
            onChange={(v) =>
              onPlanChange((p) => updateWindow(p, win.id, { sillHeight: v || win.sillHeight }))
            }
          />
          <Field
            label="Position along wall (0–1)"
            type="number"
            step={0.01}
            value={Math.round(win.t * 100) / 100}
            onChange={(v) =>
              onPlanChange((p) =>
                updateWindow(p, win.id, {
                  t: Math.round(Math.max(0.05, Math.min(0.95, v)) * 100) / 100,
                }),
              )
            }
          />
        </CardContent>
      </Card>
    );
  }

  if (selection.kind === 'room') {
    const room = plan.rooms.find((r) => r.id === selection.id);
    if (!room) return null;
    const area = polygonArea(room.polygon);
    return (
      <Card>
        <CardHeader>
          <CardTitle>{room.name}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label>Name</Label>
            <Input
              className="mt-1"
              value={room.name}
              onChange={(e) =>
                onPlanChange((p) => updateRoom(p, room.id, { name: e.target.value }))
              }
            />
          </div>
          <div>
            <Label>Type</Label>
            <Select
              className="mt-1"
              value={room.roomType}
              onChange={(e) =>
                onPlanChange((p) =>
                  updateRoom(p, room.id, { roomType: e.target.value as RoomType }),
                )
              }
            >
              {ROOM_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Floor finish</Label>
            <Select
              className="mt-1"
              value={room.floorFinish}
              onChange={(e) =>
                onPlanChange((p) =>
                  updateRoom(p, room.id, {
                    floorFinish: e.target.value as typeof room.floorFinish,
                  }),
                )
              }
            >
              <option value="tiles">Tiles</option>
              <option value="concrete">Concrete</option>
              <option value="none">None</option>
            </Select>
          </div>
          <div>
            <Label>Ceiling</Label>
            <Select
              className="mt-1"
              value={room.ceilingFinish}
              onChange={(e) =>
                onPlanChange((p) =>
                  updateRoom(p, room.id, {
                    ceilingFinish: e.target.value as typeof room.ceilingFinish,
                  }),
                )
              }
            >
              <option value="gypsum">Gypsum</option>
              <option value="plaster">Plaster</option>
              <option value="none">None</option>
            </Select>
          </div>
          <p className="text-sm tabular-nums text-[var(--muted-foreground)]">
            Area {formatNumber(area)} m² ({(area * M_TO_FT * M_TO_FT).toFixed(0)} sft)
          </p>
        </CardContent>
      </Card>
    );
  }

  if (selection.kind === 'column') {
    const col = plan.columns.find((c) => c.id === selection.id);
    if (!col) return null;
    return (
      <Card>
        <CardHeader>
          <CardTitle>Column</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Field
            label="Width (m)"
            type="number"
            step={0.01}
            value={col.width}
            onChange={(v) =>
              onPlanChange((p) => updateColumn(p, col.id, { width: v || col.width }))
            }
          />
          <Field
            label="Depth (m)"
            type="number"
            step={0.01}
            value={col.depth}
            onChange={(v) =>
              onPlanChange((p) => updateColumn(p, col.id, { depth: v || col.depth }))
            }
          />
          <Field
            label="Height (m)"
            type="number"
            step={0.01}
            value={col.height}
            onChange={(v) =>
              onPlanChange((p) => updateColumn(p, col.id, { height: v || col.height }))
            }
          />
        </CardContent>
      </Card>
    );
  }

  if (selection.kind === 'stair') {
    const st = plan.stairs.find((s) => s.id === selection.id);
    if (!st) return null;
    return (
      <Card>
        <CardHeader>
          <CardTitle>Staircase</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Field
            label="Width (m)"
            type="number"
            step={0.05}
            value={st.width}
            onChange={(v) =>
              onPlanChange((p) => updateStair(p, st.id, { width: v || st.width }))
            }
          />
          <Field
            label="Going (m)"
            type="number"
            step={0.01}
            value={st.going}
            onChange={(v) =>
              onPlanChange((p) => updateStair(p, st.id, { going: v || st.going }))
            }
          />
          <Field
            label="Rise (m)"
            type="number"
            step={0.01}
            value={st.rise}
            onChange={(v) =>
              onPlanChange((p) => updateStair(p, st.id, { rise: v || st.rise }))
            }
          />
          <Field
            label="Steps"
            type="number"
            step={1}
            value={st.steps}
            onChange={(v) =>
              onPlanChange((p) => updateStair(p, st.id, { steps: Math.max(1, Math.round(v)) }))
            }
          />
        </CardContent>
      </Card>
    );
  }

  return null;
}

function Field({
  label,
  value,
  onChange,
  type = 'number',
  step,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  type?: string;
  step?: number;
}) {
  return (
    <div>
      <Label>{label}</Label>
      <Input
        className="mt-1"
        type={type}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </div>
  );
}
