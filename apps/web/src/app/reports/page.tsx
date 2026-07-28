'use client';

import { useEstimate } from '@/hooks/use-estimate';
import { useProjectStore } from '@/store/project-store';
import { ReportWizard } from '@/components/reports/ReportWizard';
import { formatPKR } from '@/lib/format';

export default function ReportsPage() {
  const estimate = useEstimate();
  const project = useProjectStore((s) => s.project);
  const addRecentReport = useProjectStore((s) => s.addRecentReport);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <p className="text-xs font-medium uppercase tracking-wider text-[var(--accent)]">
          Report Center
        </p>
        <h1 className="font-display mt-1 text-3xl font-semibold">
          Export BOQ & estimates
        </h1>
        <p className="mt-2 max-w-3xl text-sm text-[var(--muted-foreground)]">
          Generate Excel, Word, or PDF reports from your area-based estimate.
          Current total {formatPKR(estimate.costs.grandTotal)} · {estimate.boq.length}{' '}
          BOQ items.
        </p>
      </div>

      <ReportWizard
        project={project}
        estimate={estimate}
        onGenerated={({ formats, total }) => {
          for (const type of formats) {
            if (type === 'xlsx' || type === 'docx' || type === 'pdf') {
              addRecentReport({
                name: project.name,
                type: type === 'xlsx' ? 'excel' : type === 'docx' ? 'word' : 'pdf',
                total,
              });
            }
          }
        }}
      />
    </div>
  );
}
