'use client';

import { useMemo, useState } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Plus, Trash2 } from 'lucide-react';
import type { ModuleDefinition, ModuleId } from '@boq/shared';
import { calculateEstimate, createEntry, getModule } from '@boq/engine';
import { Button } from '@/components/ui/button';
import { Input, Label, Select } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatNumber, formatPKR } from '@/lib/format';
import { useProjectStore } from '@/store/project-store';
import { cn } from '@/lib/cn';

function defaultFields(mod: ModuleDefinition): Record<string, number | string> {
  const fields: Record<string, number | string> = {};
  for (const f of mod.fields) {
    if (f.defaultValue !== undefined) fields[f.key] = f.defaultValue;
    else if (f.type === 'number') fields[f.key] = 0;
    else if (f.options?.[0]) fields[f.key] = f.options[0].value;
    else fields[f.key] = '';
  }
  return fields;
}

function SortableEntry({
  id,
  label,
  summary,
  onRemove,
  selected,
  onSelect,
}: {
  id: string;
  label: string;
  summary: string;
  onRemove: () => void;
  selected: boolean;
  onSelect: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      className={cn(
        'flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--card)] px-2 py-2 text-sm',
        selected && 'border-[var(--accent)] ring-1 ring-[var(--accent)]',
        isDragging && 'opacity-70 shadow-md',
      )}
    >
      <button
        type="button"
        className="cursor-grab touch-none text-[var(--muted-foreground)] active:cursor-grabbing"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <button
        type="button"
        className="min-w-0 flex-1 text-left"
        onClick={onSelect}
      >
        <p className="truncate font-medium">{label}</p>
        <p className="truncate text-xs text-[var(--muted-foreground)]">{summary}</p>
      </button>
      <Button variant="ghost" size="icon" onClick={onRemove} aria-label="Remove">
        <Trash2 className="h-4 w-4 text-[var(--danger)]" />
      </Button>
    </div>
  );
}

export function MeasurementForm({ moduleId }: { moduleId: ModuleId }) {
  const mod = getModule(moduleId);
  const project = useProjectStore((s) => s.project);
  const addEntry = useProjectStore((s) => s.addEntry);
  const updateEntry = useProjectStore((s) => s.updateEntry);
  const removeEntry = useProjectStore((s) => s.removeEntry);
  const reorderEntries = useProjectStore((s) => s.reorderEntries);

  const entries = useMemo(
    () =>
      project.entries
        .filter((e) => e.moduleId === moduleId)
        .sort((a, b) => a.order - b.order),
    [project.entries, moduleId],
  );

  const [fields, setFields] = useState(() =>
    mod ? defaultFields(mod) : ({} as Record<string, number | string>),
  );
  const [label, setLabel] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const preview = useMemo(() => {
    if (!mod) return null;
    const temp = createEntry(moduleId, fields, 'Preview', 0);
    return calculateEstimate({
      ...project,
      entries: [temp],
    });
  }, [mod, moduleId, fields, project]);

  if (!mod) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-[var(--muted-foreground)]">
          Unknown module
        </CardContent>
      </Card>
    );
  }

  const moduleDef: ModuleDefinition = mod;

  function onFieldChange(key: string, type: 'number' | 'select', value: string) {
    setFields((prev) => ({
      ...prev,
      [key]: type === 'number' ? (value === '' ? 0 : Number(value)) : value,
    }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (selectedId) {
      updateEntry(selectedId, {
        fields: { ...fields },
        label: label || moduleDef.name,
      });
      setSelectedId(null);
      setLabel('');
      setFields(defaultFields(moduleDef));
    } else {
      addEntry(moduleId, { ...fields }, label || undefined);
      setFields(defaultFields(moduleDef));
      setLabel('');
    }
  }

  function selectEntry(id: string) {
    const entry = entries.find((e) => e.id === id);
    if (!entry) return;
    setSelectedId(id);
    setFields({ ...entry.fields });
    setLabel(entry.label);
  }

  function onDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const ids = entries.map((e) => e.id);
    const oldIndex = ids.indexOf(String(active.id));
    const newIndex = ids.indexOf(String(over.id));
    if (oldIndex < 0 || newIndex < 0) return;
    const reordered = arrayMove(ids, oldIndex, newIndex);
    const allIds = project.entries
      .slice()
      .sort((a, b) => a.order - b.order)
      .map((e) => e.id);
    // Rebuild full order: keep other modules, replace this module's block
    const other = allIds.filter((id) => !ids.includes(id));
    const firstIdx = Math.min(
      ...entries.map((e) =>
        project.entries.findIndex((x) => x.id === e.id),
      ),
    );
    const merged = [...other];
    const insertAt = Number.isFinite(firstIdx)
      ? Math.min(firstIdx, merged.length)
      : merged.length;
    merged.splice(insertAt, 0, ...reordered);
    reorderEntries(merged);
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>{mod.name}</CardTitle>
            <CardDescription>{mod.description}</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="entry-label">Label</Label>
                <Input
                  id="entry-label"
                  className="mt-1"
                  placeholder={`${mod.name} entry`}
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                {mod.fields.map((f) => (
                  <div key={f.key}>
                    <Label htmlFor={f.key}>
                      {f.label}
                      {f.unit ? ` (${f.unit})` : ''}
                      {f.required ? ' *' : ''}
                    </Label>
                    {f.type === 'select' ? (
                      <Select
                        id={f.key}
                        className="mt-1"
                        value={String(fields[f.key] ?? '')}
                        onChange={(e) => onFieldChange(f.key, 'select', e.target.value)}
                      >
                        {f.options?.map((o) => (
                          <option key={o.value} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </Select>
                    ) : (
                      <Input
                        id={f.key}
                        type="number"
                        className="mt-1"
                        min={f.min}
                        step={f.step ?? 0.01}
                        value={fields[f.key] === undefined ? '' : String(fields[f.key])}
                        onChange={(e) => onFieldChange(f.key, 'number', e.target.value)}
                        title={f.tooltip}
                        required={f.required}
                      />
                    )}
                    {f.tooltip && (
                      <p className="mt-1 text-[11px] text-[var(--muted-foreground)]">
                        {f.tooltip}
                      </p>
                    )}
                  </div>
                ))}
              </div>
              <div className="flex flex-wrap gap-2">
                <Button type="submit">
                  <Plus className="h-4 w-4" />
                  {selectedId ? 'Update entry' : 'Add entry'}
                </Button>
                {selectedId && (
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => {
                      setSelectedId(null);
                      setLabel('');
                      setFields(defaultFields(moduleDef));
                    }}
                  >
                    Cancel edit
                  </Button>
                )}
              </div>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Entries ({entries.length})</CardTitle>
            <CardDescription>Drag to reorder within this module</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {entries.length === 0 ? (
              <p className="py-6 text-center text-sm text-[var(--muted-foreground)]">
                No entries yet — fill the form above.
              </p>
            ) : (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={onDragEnd}
              >
                <SortableContext
                  items={entries.map((e) => e.id)}
                  strategy={verticalListSortingStrategy}
                >
                  {entries.map((e) => {
                    const dims = Object.entries(e.fields)
                      .slice(0, 4)
                      .map(([k, v]) => `${k}: ${v}`)
                      .join(' · ');
                    return (
                      <SortableEntry
                        key={e.id}
                        id={e.id}
                        label={e.label}
                        summary={dims}
                        selected={selectedId === e.id}
                        onSelect={() => selectEntry(e.id)}
                        onRemove={() => removeEntry(e.id)}
                      />
                    );
                  })}
                </SortableContext>
              </DndContext>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="h-fit xl:sticky xl:top-20">
        <CardHeader>
          <CardTitle>Live preview</CardTitle>
          <CardDescription>Instant engine calculation</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {preview && (
            <>
              <div>
                <p className="text-xs text-[var(--muted-foreground)]">Preview total</p>
                <p className="font-display text-2xl font-semibold tabular-nums">
                  {formatPKR(preview.costs.grandTotal)}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary">
                  Mat {formatPKR(preview.costs.material)}
                </Badge>
                <Badge variant="secondary">
                  Lab {formatPKR(preview.costs.labour)}
                </Badge>
                <Badge variant="secondary">
                  Eq {formatPKR(preview.costs.equipment)}
                </Badge>
              </div>
              {preview.quantities.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-medium uppercase tracking-wide text-[var(--muted-foreground)]">
                    Quantities
                  </p>
                  {preview.quantities.slice(0, 8).map((q) => (
                    <div
                      key={q.id}
                      className="flex justify-between gap-2 text-sm"
                    >
                      <span className="truncate text-[var(--muted-foreground)]">
                        {q.description}
                      </span>
                      <span className="shrink-0 tabular-nums">
                        {formatNumber(q.quantity)} {q.unit}
                      </span>
                    </div>
                  ))}
                </div>
              )}
              {preview.materials.slice(0, 6).map((m) => (
                <div key={m.id} className="flex justify-between gap-2 text-sm">
                  <span className="truncate">{m.name}</span>
                  <span className="shrink-0 tabular-nums text-[var(--muted-foreground)]">
                    {formatNumber(m.quantity)} {m.unit}
                  </span>
                </div>
              ))}
              {preview.warnings.map((w) => (
                <div
                  key={w.id}
                  className="rounded-lg border border-[var(--border)] bg-[var(--muted)]/40 p-3 text-xs"
                >
                  <Badge
                    variant={
                      w.severity === 'error'
                        ? 'danger'
                        : w.severity === 'warning'
                          ? 'warning'
                          : 'secondary'
                    }
                  >
                    {w.severity}
                  </Badge>
                  <p className="mt-1 font-medium">{w.title}</p>
                  <p className="text-[var(--muted-foreground)]">{w.message}</p>
                </div>
              ))}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
