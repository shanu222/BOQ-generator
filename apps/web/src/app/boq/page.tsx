'use client';

import { BOQTable } from '@/components/boq/BOQTable';

export default function BOQPage() {
  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div>
        <p className="text-xs font-medium uppercase tracking-wider text-[var(--accent)]">
          Bill of Quantities
        </p>
        <h1 className="font-display mt-1 text-3xl font-semibold">BOQ</h1>
        <p className="mt-1 text-sm text-[var(--muted-foreground)]">
          Editable items with live rate × quantity amounts
        </p>
      </div>
      <BOQTable />
    </div>
  );
}
