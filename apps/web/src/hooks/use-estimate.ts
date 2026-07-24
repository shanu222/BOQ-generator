'use client';

import { useMemo } from 'react';
import { calculateEstimate } from '@boq/engine';
import { useProjectStore } from '@/store/project-store';

export function useEstimate() {
  const project = useProjectStore((s) => s.project);
  return useMemo(() => calculateEstimate(project), [project]);
}
