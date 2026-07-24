import type { EstimateResult, ProjectState } from '@boq/shared';
import type { PlanDocument } from '@boq/geometry';
import { polygonArea, M_TO_FT } from '@boq/geometry';
import {
  REPORT_STYLES,
  REPORT_TYPES,
  type ReportStyleId,
  type ReportWizardConfig,
} from './types';

export interface RoomSummaryRow {
  name: string;
  type: string;
  areaM2: number;
  areaSft: number;
}

export interface ReportContext {
  config: ReportWizardConfig;
  project: ProjectState;
  estimate: EstimateResult;
  plan: PlanDocument | null;
  style: (typeof REPORT_STYLES)[number];
  title: string;
  subtitle: string;
  plotLabel: string;
  templateName: string;
  dateLabel: string;
  version: string;
  companyName: string;
  generatedBy: string;
  rooms: RoomSummaryRow[];
  coveredSft: number;
  openSft: number;
  assumptions: string[];
  engineeringNotes: string[];
  rateBreakdown: { label: string; amount: number; pct: number }[];
}

function moneyPct(part: number, total: number) {
  if (!total) return 0;
  return (part / total) * 100;
}

export function buildReportContext(
  config: ReportWizardConfig,
  project: ProjectState,
  estimate: EstimateResult,
  plan: PlanDocument | null,
): ReportContext {
  const type = REPORT_TYPES.find((t) => t.id === config.reportType)!;
  const style =
    REPORT_STYLES.find((s) => s.id === config.style) ?? REPORT_STYLES[1];

  const rooms: RoomSummaryRow[] =
    plan?.rooms.map((r) => {
      const areaM2 = polygonArea(r.polygon);
      return {
        name: r.name,
        type: r.roomType,
        areaM2,
        areaSft: areaM2 * M_TO_FT * M_TO_FT,
      };
    }) ?? [];

  const coveredM2 = rooms
    .filter((r) => r.type !== 'porch')
    .reduce((s, r) => s + r.areaM2, 0);
  const plotM2 = plan ? plan.plot.widthM * plan.plot.depthM : 0;
  const sft = M_TO_FT * M_TO_FT;

  const c = estimate.costs;
  const rateBreakdown = [
    { label: 'Material', amount: c.material },
    { label: 'Labour', amount: c.labour },
    { label: 'Equipment', amount: c.equipment },
    { label: 'Transportation', amount: c.transportation },
    { label: 'Loading / Unloading', amount: c.loadingUnloading },
    { label: 'Waste', amount: c.waste },
    { label: 'Overhead', amount: c.overhead },
    { label: 'Contractor Profit', amount: c.contractorProfit },
    { label: 'Taxes', amount: c.tax },
  ].map((row) => ({
    ...row,
    pct: moneyPct(row.amount, c.grandTotal),
  }));

  return {
    config,
    project,
    estimate,
    plan,
    style,
    title: config.meta.reportTitle || type.name,
    subtitle: project.name || 'Untitled Project',
    plotLabel: plan
      ? `${plan.plot.label} (${plan.plot.widthFt}′ × ${plan.plot.depthFt}′)`
      : project.location || '—',
    templateName: plan?.name || 'Manual measurements',
    dateLabel: project.date || new Date().toISOString().slice(0, 10),
    version: config.meta.reportVersion || '1.0',
    companyName: config.meta.companyName || 'BOQ Pro Engineering',
    generatedBy: config.meta.generatedBy || project.preparedBy || '—',
    rooms,
    coveredSft: coveredM2 * sft,
    openSft: Math.max(0, plotM2 - coveredM2) * sft,
    assumptions: [
      'Quantities are derived from geometric measurements or planner geometry.',
      'Unit rates are based on the project rate database (Pakistan market defaults unless overridden).',
      'Storey height, wall thickness, and finishes follow plan properties where available.',
      'Wastage, overhead, profit, and tax follow the configured rate analysis factors.',
      'This report is suitable for estimation and tender guidance; site verification is recommended.',
    ],
    engineeringNotes: [
      ...(estimate.warnings.slice(0, 12).map((w) => `${w.title}: ${w.message}`)),
      'All amounts are in Pakistani Rupees (PKR) unless otherwise stated.',
      'BOQ item numbers follow the internal estimation sequence.',
      plan
        ? 'Floor plan geometry is embedded from the Smart House Planner vector model.'
        : 'No floor plan was linked; quantities rely on measurement module entries.',
    ],
    rateBreakdown,
  };
}

export function styleColors(styleId: ReportStyleId) {
  return REPORT_STYLES.find((s) => s.id === styleId) ?? REPORT_STYLES[1];
}
