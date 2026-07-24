'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { getModule } from '@boq/engine';
import type { ModuleId } from '@boq/shared';
import { MeasurementForm } from '@/components/measure/MeasurementForm';
import { ModuleIcon } from '@/lib/module-icons';
import { Badge } from '@/components/ui/badge';

export default function MeasureModulePage() {
  const params = useParams();
  const moduleId = String(params.moduleId ?? '') as ModuleId;
  const mod = getModule(moduleId);

  if (!mod) {
    return (
      <div className="mx-auto max-w-lg py-20 text-center">
        <p className="font-display text-xl font-semibold">Module not found</p>
        <Link href="/measure" className="mt-4 inline-block text-sm text-[var(--accent)]">
          Back to modules
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex items-start gap-4">
        <Link
          href="/measure"
          className="mt-1 flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--border)] hover:bg-[var(--muted)]"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-[var(--accent-muted)] text-[var(--accent)]">
            <ModuleIcon icon={mod.icon} className="h-5 w-5" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-display text-2xl font-semibold sm:text-3xl">
                {mod.name}
              </h1>
              <Badge variant="secondary">{mod.category}</Badge>
            </div>
            <p className="mt-1 text-sm text-[var(--muted-foreground)]">
              {mod.description}
            </p>
          </div>
        </div>
      </div>
      <MeasurementForm moduleId={moduleId} />
    </div>
  );
}
