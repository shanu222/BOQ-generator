import type { EstimateResult, ProjectCostSummary, ProjectState } from '@boq/shared';
import { buildProjectCostSummary } from '@boq/engine';
import {
  REPORT_STYLES,
  REPORT_TYPES,
  type ReportStyleId,
  type ReportWizardConfig,
} from './types';

export interface ReportContext {
  config: ReportWizardConfig;
  project: ProjectState;
  estimate: EstimateResult;
  style: (typeof REPORT_STYLES)[number];
  title: string;
  subtitle: string;
  dateLabel: string;
  version: string;
  companyName: string;
  generatedBy: string;
  coveredAreaSft: number;
  assumptions: string[];
  engineeringNotes: string[];
  rateBreakdown: { label: string; amount: number; pct: number }[];
  costSummary: ProjectCostSummary;
}

function moneyPct(part: number, total: number) {
  if (!total) return 0;
  return (part / total) * 100;
}

export function buildReportContext(
  config: ReportWizardConfig,
  project: ProjectState,
  estimate: EstimateResult,
  coveredAreaSft = 0,
): ReportContext {
  const type = REPORT_TYPES.find((t) => t.id === config.reportType)!;
  const style =
    REPORT_STYLES.find((s) => s.id === config.style) ?? REPORT_STYLES[1];

  const c = estimate.costs;
  const projectCostSummary = buildProjectCostSummary(project, estimate);

  const rateBreakdown = [
    { label: 'Material', amount: c.material },
    { label: 'Labour', amount: c.labour },
    { label: 'Equipment', amount: c.equipment },
    { label: 'Transportation', amount: c.transportation },
    { label: 'Loading / Unloading', amount: c.loadingUnloading },
    { label: 'Waste', amount: c.waste },
    { label: 'Overhead', amount: c.overhead },
    { label: 'Contractor Profit', amount: c.contractorProfit },
    { label: 'Contingency', amount: c.contingency ?? 0 },
    { label: 'Taxes', amount: c.tax },
  ].map((row) => ({
    ...row,
    pct: moneyPct(row.amount, c.grandTotal),
  }));

  return {
    config,
    project,
    estimate,
    style,
    title: config.meta.reportTitle || type.name,
    subtitle: project.name || 'Untitled Project',
    dateLabel: project.date || new Date().toISOString().slice(0, 10),
    version: config.meta.reportVersion || '1.0',
    companyName: config.meta.companyName || 'BOQ Pro Engineering',
    generatedBy: config.meta.generatedBy || project.preparedBy || '—',
    coveredAreaSft,
    assumptions: [
      'Quantities are derived from covered-area-based estimation inputs.',
      'Unit rates are based on the project rate database (Pakistan market defaults unless overridden).',
      'Costs are classified into Grey Structure, Finishing, External Development, and Miscellaneous packages.',
      'MEP summaries are informative and do not double-count amounts already in packages.',
      'Wastage, overhead, profit, contingency, and tax follow the configured rate analysis factors.',
      'This report is suitable for estimation and tender guidance; site verification is recommended.',
    ],
    engineeringNotes: [
      ...estimate.warnings.slice(0, 12).map((w) => `${w.title}: ${w.message}`),
      'All amounts are in Pakistani Rupees (PKR) unless otherwise stated.',
      'BOQ item numbers follow the internal estimation sequence.',
      coveredAreaSft > 0
        ? `Covered area used for this estimate: ${Math.round(coveredAreaSft)} sft.`
        : 'Covered area was not recorded on the project; quantities follow calculator entries.',
    ],
    rateBreakdown,
    costSummary: projectCostSummary,
  };
}

export function styleColors(styleId: ReportStyleId) {
  return REPORT_STYLES.find((s) => s.id === styleId) ?? REPORT_STYLES[1];
}
