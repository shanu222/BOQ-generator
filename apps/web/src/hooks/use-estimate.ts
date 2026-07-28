'use client';

import { useMemo } from 'react';
import { calculateEstimate, buildProjectCostSummary } from '@boq/engine';
import { useProjectStore } from '@/store/project-store';

export function useEstimate() {
  const project = useProjectStore((s) => s.project);
  return useMemo(() => calculateEstimate(project), [project]);
}

export function useProjectCostSummary() {
  const project = useProjectStore((s) => s.project);
  const estimate = useEstimate();
  return useMemo(
    () => buildProjectCostSummary(project, estimate),
    [project, estimate],
  );
}
