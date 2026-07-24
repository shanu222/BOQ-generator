import type { ReportTypeId, ExportFormat } from './types';
import type { ReportContext } from './assemble';

function slug(s: string) {
  return s
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '_')
    .replace(/_+/g, '_')
    .slice(0, 48);
}

const TYPE_SLUG: Record<ReportTypeId, string> = {
  'complete-boq': 'BOQ',
  'material-takeoff': 'Material_Takeoff',
  'detailed-estimate': 'Detailed_Estimate',
  'rate-analysis': 'Rate_Analysis',
  'quantity-summary': 'Quantity_Summary',
  'cost-summary': 'Cost_Summary',
  'complete-engineering': 'Complete_Engineering_Report',
};

const EXT: Record<ExportFormat, string> = {
  xlsx: 'xlsx',
  docx: 'docx',
  pdf: 'pdf',
};

/** Professional auto file name, e.g. BOQ_3Marla_Modern_Template_2026-07-24.pdf */
export function buildReportFilename(ctx: ReportContext, format: ExportFormat): string {
  const type = TYPE_SLUG[ctx.config.reportType];
  const plot = slug(ctx.plan?.plot.label || ctx.project.location || 'Plot');
  const template = slug(ctx.templateName || 'Layout');
  const date = ctx.dateLabel.slice(0, 10);
  return `${type}_${plot}_${template}_${date}.${EXT[format]}`;
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function formatPKRReport(n: number): string {
  return new Intl.NumberFormat('en-PK', {
    style: 'currency',
    currency: 'PKR',
    maximumFractionDigits: 0,
  }).format(n || 0);
}

export function formatQty(n: number, digits = 3): string {
  if (!Number.isFinite(n)) return '0';
  return n.toLocaleString('en-PK', {
    maximumFractionDigits: digits,
    minimumFractionDigits: 0,
  });
}
