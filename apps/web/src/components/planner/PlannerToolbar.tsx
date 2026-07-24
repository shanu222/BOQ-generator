'use client';

import {
  MousePointer2,
  Square,
  DoorOpen,
  AppWindow,
  Columns3,
  ArrowUpFromLine,
  Pentagon,
  Ruler,
  Trash2,
} from 'lucide-react';
import type { PlannerTool } from '@boq/geometry';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/cn';

const TOOLS: { id: PlannerTool; label: string; icon: typeof MousePointer2 }[] = [
  { id: 'select', label: 'Select', icon: MousePointer2 },
  { id: 'wall', label: 'Wall', icon: Square },
  { id: 'door', label: 'Door', icon: DoorOpen },
  { id: 'window', label: 'Window', icon: AppWindow },
  { id: 'column', label: 'Column', icon: Columns3 },
  { id: 'stair', label: 'Stair', icon: ArrowUpFromLine },
  { id: 'room', label: 'Room', icon: Pentagon },
  { id: 'dimension', label: 'Dim', icon: Ruler },
  { id: 'delete', label: 'Delete', icon: Trash2 },
];

export function PlannerToolbar({
  tool,
  onToolChange,
}: {
  tool: PlannerTool;
  onToolChange: (t: PlannerTool) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1 rounded-xl border border-[var(--border)] bg-[var(--card)] p-1.5">
      {TOOLS.map((t) => {
        const Icon = t.icon;
        const active = tool === t.id;
        return (
          <Button
            key={t.id}
            type="button"
            variant={active ? 'default' : 'ghost'}
            size="sm"
            className={cn('gap-1.5', !active && 'text-[var(--muted-foreground)]')}
            onClick={() => onToolChange(t.id)}
            title={t.label}
          >
            <Icon className="h-4 w-4" />
            <span className="hidden sm:inline">{t.label}</span>
          </Button>
        );
      })}
    </div>
  );
}
