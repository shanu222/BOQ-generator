/**
 * Legacy single-template helpers — now backed by the template catalog.
 * Prefer listTemplatesForPlot / instantiateTemplate for new UI.
 */

import { instantiateTemplate, listTemplatesForPlot } from './template-catalog';
import type { PlanDocument, PlotSpec } from './types';
import { PLOT_PRESETS } from './types';

/** @deprecated Use instantiateTemplate with a catalog id */
export function buildResidentialTemplate(plot: PlotSpec): PlanDocument {
  const key = plot.key === 'custom' ? '5-marla' : plot.key;
  const templates = listTemplatesForPlot(key as Exclude<typeof key, 'custom'>);
  const preferred =
    templates.find((t) => t.id.includes('traditional') || t.style === 'traditional') ??
    templates[0];
  if (!preferred) {
    throw new Error(`No templates registered for plot ${key}`);
  }
  return instantiateTemplate(preferred.id, plot)!;
}

export function createTemplateForPlotKey(
  key: keyof typeof PLOT_PRESETS,
): PlanDocument {
  return buildResidentialTemplate(PLOT_PRESETS[key]);
}
