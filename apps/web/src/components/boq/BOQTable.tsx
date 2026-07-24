'use client';

import { useMemo, useState } from 'react';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';
import { useEstimate } from '@/hooks/use-estimate';
import { useProjectStore } from '@/store/project-store';
import { formatPKR } from '@/lib/format';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/cn';

function overrideKey(entryId: string, description: string) {
  return `${entryId}:${description}`;
}

function SortableSection({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
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
      className={cn('space-y-2', isDragging && 'opacity-80')}
    >
      <div className="flex items-center gap-2">
        <button
          type="button"
          className="cursor-grab text-[var(--muted-foreground)] active:cursor-grabbing"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-4 w-4" />
        </button>
        <h3 className="font-display text-sm font-semibold">{title}</h3>
        <Badge variant="secondary">{id}</Badge>
      </div>
      {children}
    </div>
  );
}

export function BOQTable() {
  const estimate = useEstimate();
  const setBoqOverride = useProjectStore((s) => s.setBoqOverride);
  const sectionOrder = useProjectStore((s) => s.project.sectionOrder);
  const setSectionOrder = useProjectStore((s) => s.setSectionOrder);

  const categories = useMemo(() => {
    const set = new Set(estimate.boq.map((b) => b.category));
    const fromItems = [...set];
    if (sectionOrder.length === 0) return fromItems;
    const ordered = sectionOrder.filter((c) => set.has(c));
    const missing = fromItems.filter((c) => !ordered.includes(c));
    return [...ordered, ...missing];
  }, [estimate.boq, sectionOrder]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  const [editing, setEditing] = useState<Record<string, string>>({});

  function onDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = categories.indexOf(String(active.id));
    const newIndex = categories.indexOf(String(over.id));
    if (oldIndex < 0 || newIndex < 0) return;
    setSectionOrder(arrayMove(categories, oldIndex, newIndex));
  }

  const total = estimate.boq.reduce((s, b) => s + b.amount, 0);

  if (estimate.boq.length === 0) {
    return (
      <Card>
        <CardContent className="py-16 text-center text-sm text-[var(--muted-foreground)]">
          No BOQ items yet. Add measurements from Measure modules.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle>Bill of Quantities</CardTitle>
            <CardDescription>
              Edit rates, quantities, and descriptions — drag sections to reorder
            </CardDescription>
          </div>
          <p className="font-display text-lg font-semibold tabular-nums">
            {formatPKR(total)}
          </p>
        </CardHeader>
      </Card>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={categories} strategy={verticalListSortingStrategy}>
          {categories.map((cat) => {
            const items = estimate.boq.filter((b) => b.category === cat);
            const sub = items.reduce((s, b) => s + b.amount, 0);
            return (
              <SortableSection key={cat} id={cat} title={cat}>
                <Card>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-16">No.</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead className="w-20">Unit</TableHead>
                          <TableHead className="w-28 text-right">Qty</TableHead>
                          <TableHead className="w-32 text-right">Rate</TableHead>
                          <TableHead className="w-32 text-right">Amount</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {items.map((item) => {
                          const key = overrideKey(item.entryId, item.description);
                          return (
                            <TableRow key={item.id}>
                              <TableCell className="tabular-nums text-[var(--muted-foreground)]">
                                {item.itemNo}
                              </TableCell>
                              <TableCell>
                                <Input
                                  className="h-8 border-transparent bg-transparent px-1 shadow-none hover:border-[var(--border)] focus:border-[var(--input)]"
                                  defaultValue={item.description}
                                  onBlur={(e) => {
                                    if (e.target.value !== item.description) {
                                      setBoqOverride(key, {
                                        description: e.target.value,
                                      });
                                    }
                                  }}
                                />
                                {item.specification && (
                                  <p className="mt-0.5 px-1 text-[11px] text-[var(--muted-foreground)]">
                                    {item.specification}
                                  </p>
                                )}
                              </TableCell>
                              <TableCell className="text-[var(--muted-foreground)]">
                                {item.unit}
                              </TableCell>
                              <TableCell>
                                <Input
                                  type="number"
                                  step="0.001"
                                  className="h-8 text-right tabular-nums"
                                  value={
                                    editing[`${key}:qty`] ??
                                    String(item.quantity)
                                  }
                                  onChange={(e) =>
                                    setEditing((s) => ({
                                      ...s,
                                      [`${key}:qty`]: e.target.value,
                                    }))
                                  }
                                  onBlur={(e) => {
                                    const n = Number(e.target.value);
                                    if (Number.isFinite(n) && n !== item.quantity) {
                                      setBoqOverride(key, { quantity: n });
                                    }
                                    setEditing((s) => {
                                      const next = { ...s };
                                      delete next[`${key}:qty`];
                                      return next;
                                    });
                                  }}
                                />
                              </TableCell>
                              <TableCell>
                                <Input
                                  type="number"
                                  step="0.01"
                                  className="h-8 text-right tabular-nums"
                                  value={
                                    editing[`${key}:rate`] ?? String(item.rate)
                                  }
                                  onChange={(e) =>
                                    setEditing((s) => ({
                                      ...s,
                                      [`${key}:rate`]: e.target.value,
                                    }))
                                  }
                                  onBlur={(e) => {
                                    const n = Number(e.target.value);
                                    if (Number.isFinite(n) && n !== item.rate) {
                                      setBoqOverride(key, { rate: n });
                                    }
                                    setEditing((s) => {
                                      const next = { ...s };
                                      delete next[`${key}:rate`];
                                      return next;
                                    });
                                  }}
                                />
                              </TableCell>
                              <TableCell className="text-right font-medium tabular-nums">
                                {formatPKR(item.amount, true)}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                        <TableRow className="bg-[var(--muted)]/30 hover:bg-[var(--muted)]/30">
                          <TableCell colSpan={5} className="text-right text-xs font-medium uppercase tracking-wide text-[var(--muted-foreground)]">
                            Subtotal
                          </TableCell>
                          <TableCell className="text-right font-semibold tabular-nums">
                            {formatPKR(sub)}
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </SortableSection>
            );
          })}
        </SortableContext>
      </DndContext>
    </div>
  );
}
