'use client';

import { MTOTable } from '@/components/mto/MTOTable';

export default function MTOPage() {
  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div>
        <p className="text-xs font-medium uppercase tracking-wider text-[var(--accent)]">
          Material Takeoff
        </p>
        <h1 className="font-display mt-1 text-3xl font-semibold">MTO</h1>
        <p className="mt-1 text-sm text-[var(--muted-foreground)]">
          Consolidated materials and category summaries
        </p>
      </div>
      <MTOTable />
    </div>
  );
}
