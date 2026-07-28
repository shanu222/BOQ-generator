import type { EstimateResult, ProjectState } from '@boq/shared';
import { buildReportContext, type PlotAreaSummary } from './assemble';
import { buildReportFilename, downloadBlob } from './naming';
import type { ExportFormat, ReportWizardConfig } from './types';
import type { ReportContext } from './assemble';

export interface GeneratedReportFile {
  format: ExportFormat;
  filename: string;
  blob: Blob;
}

async function buildBlob(format: ExportFormat, ctx: ReportContext): Promise<Blob> {
  if (format === 'xlsx') {
    const { generateExcelReport } = await import('./generate-excel');
    return generateExcelReport(ctx);
  }
  if (format === 'docx') {
    const { generateWordReport } = await import('./generate-word');
    return generateWordReport(ctx);
  }
  const { generatePdfReport } = await import('./generate-pdf');
  return generatePdfReport(ctx);
}

export async function generateReports(
  config: ReportWizardConfig,
  project: ProjectState,
  estimate: EstimateResult,
  plotOrCovered: number | PlotAreaSummary = 0,
): Promise<GeneratedReportFile[]> {
  if (config.formats.length === 0) {
    throw new Error('Select at least one export format.');
  }

  const ctx = buildReportContext(config, project, estimate, plotOrCovered);
  const files: GeneratedReportFile[] = [];

  for (const format of config.formats) {
    const blob = await buildBlob(format, ctx);
    files.push({ format, filename: buildReportFilename(ctx, format), blob });
  }

  return files;
}

export async function generateAndDownloadReports(
  config: ReportWizardConfig,
  project: ProjectState,
  estimate: EstimateResult,
  plotOrCovered: number | PlotAreaSummary = 0,
): Promise<GeneratedReportFile[]> {
  const files = await generateReports(config, project, estimate, plotOrCovered);
  for (const file of files) {
    downloadBlob(file.blob, file.filename);
    await new Promise((r) => setTimeout(r, 250));
  }
  return files;
}
