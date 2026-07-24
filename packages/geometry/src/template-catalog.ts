/**
 * Public Template Catalog API
 * Source of truth: packages/geometry/templates/{plotKey}/*.json
 */

import { calculateEstimate, createDefaultProject } from '@boq/engine';
import { extractMeasurements } from './extract';
import { buildPlanFromTemplate, computeTemplateStats } from './template-builder';
import { TEMPLATE_CATALOG } from './template-catalog.generated';
import type { HouseTemplateDefinition, TemplateStats } from './template-schema';
import type { PlanDocument, PlotSizeKey, PlotSpec } from './types';
import { PLOT_PRESETS, customPlot } from './types';

export type { HouseTemplateDefinition, TemplateStats, TemplateCatalogEntry } from './template-schema';
export { buildPlanFromTemplate, computeTemplateStats, loadTemplateById } from './template-builder';
export { TEMPLATE_CATALOG };

export function listAllTemplates(): HouseTemplateDefinition[] {
  return TEMPLATE_CATALOG.map((e) => e.definition);
}

export function listTemplatesForPlot(
  plotKey: Exclude<PlotSizeKey, 'custom'>,
): HouseTemplateDefinition[] {
  return listAllTemplates().filter((t) => t.plotKey === plotKey);
}

export function getTemplateById(id: string): HouseTemplateDefinition | undefined {
  return listAllTemplates().find((t) => t.id === id);
}

/** Closest preset for custom plots — used to suggest templates that scale onto custom size */
export function nearestPlotKey(widthFt: number, depthFt: number): Exclude<PlotSizeKey, 'custom'> {
  const area = widthFt * depthFt;
  const presets = Object.values(PLOT_PRESETS).map((p) => ({
    key: p.key as Exclude<PlotSizeKey, 'custom'>,
    area: p.widthFt * p.depthFt,
  }));
  presets.sort((a, b) => Math.abs(a.area - area) - Math.abs(b.area - area));
  return presets[0].key;
}

export function resolvePlot(
  key: PlotSizeKey,
  custom?: { widthFt: number; depthFt: number },
): PlotSpec {
  if (key === 'custom') {
    return customPlot(custom?.widthFt ?? 30, custom?.depthFt ?? 60);
  }
  return PLOT_PRESETS[key];
}

export function instantiateTemplate(
  templateId: string,
  plot?: PlotSpec,
): PlanDocument | null {
  const def = getTemplateById(templateId);
  if (!def) return null;
  return buildPlanFromTemplate(def, plot ?? PLOT_PRESETS[def.plotKey]);
}

export function getTemplateStats(def: HouseTemplateDefinition, plot?: PlotSpec): TemplateStats {
  const plan = buildPlanFromTemplate(def, plot ?? PLOT_PRESETS[def.plotKey]);
  return computeTemplateStats(def, plan);
}

/** Live estimated grand total (PKR) using existing BOQ engine — no extra input. */
export function estimateTemplateCost(def: HouseTemplateDefinition, plot?: PlotSpec): number {
  const plan = buildPlanFromTemplate(def, plot ?? PLOT_PRESETS[def.plotKey]);
  const entries = extractMeasurements(plan);
  const project = createDefaultProject({ entries });
  return calculateEstimate(project).costs.grandTotal;
}

export function enrichTemplateCard(def: HouseTemplateDefinition, plot?: PlotSpec) {
  const plan = buildPlanFromTemplate(def, plot ?? PLOT_PRESETS[def.plotKey]);
  const stats = computeTemplateStats(def, plan);
  const entries = extractMeasurements(plan);
  const project = createDefaultProject({ entries });
  const estimate = calculateEstimate(project);
  return {
    definition: def,
    plan,
    stats,
    estimatedCost: estimate.costs.grandTotal,
  };
}
