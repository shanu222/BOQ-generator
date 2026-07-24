/**
 * Report Center — configuration types & presets
 */

export type ReportTypeId =
  | 'complete-boq'
  | 'material-takeoff'
  | 'detailed-estimate'
  | 'rate-analysis'
  | 'quantity-summary'
  | 'cost-summary'
  | 'complete-engineering';

export type ExportFormat = 'xlsx' | 'docx' | 'pdf';

export type ReportStyleId =
  | 'modern'
  | 'professional'
  | 'government'
  | 'contractor'
  | 'consultant';

export interface ReportSectionFlags {
  coverPage: boolean;
  projectInfo: boolean;
  plotInfo: boolean;
  floorPlan: boolean;
  roomSummary: boolean;
  dimensionDrawings: boolean;
  boq: boolean;
  materialTakeoff: boolean;
  materialCost: boolean;
  labourCost: boolean;
  equipmentCost: boolean;
  rateAnalysis: boolean;
  quantitySummary: boolean;
  costSummary: boolean;
  engineeringNotes: boolean;
  assumptions: boolean;
  calculationSummary: boolean;
  grandTotal: boolean;
  charts: boolean;
}

export interface ReportMetaOverrides {
  companyName: string;
  companyLogoDataUrl: string | null;
  generatedBy: string;
  reportVersion: string;
  reportTitle: string;
}

export interface ReportWizardConfig {
  reportType: ReportTypeId;
  formats: ExportFormat[];
  style: ReportStyleId;
  sections: ReportSectionFlags;
  meta: ReportMetaOverrides;
}

export interface ReportTypeDef {
  id: ReportTypeId;
  name: string;
  description: string;
  defaultSections: ReportSectionFlags;
}

const allOff = (): ReportSectionFlags => ({
  coverPage: false,
  projectInfo: false,
  plotInfo: false,
  floorPlan: false,
  roomSummary: false,
  dimensionDrawings: false,
  boq: false,
  materialTakeoff: false,
  materialCost: false,
  labourCost: false,
  equipmentCost: false,
  rateAnalysis: false,
  quantitySummary: false,
  costSummary: false,
  engineeringNotes: false,
  assumptions: false,
  calculationSummary: false,
  grandTotal: false,
  charts: false,
});

function sectionsWith(partial: Partial<ReportSectionFlags>): ReportSectionFlags {
  return { ...allOff(), coverPage: true, projectInfo: true, grandTotal: true, ...partial };
}

export const REPORT_TYPES: ReportTypeDef[] = [
  {
    id: 'complete-boq',
    name: 'Complete BOQ Report',
    description: 'Bill of Quantities with rates, amounts, and section totals.',
    defaultSections: sectionsWith({
      boq: true,
      costSummary: true,
      calculationSummary: true,
    }),
  },
  {
    id: 'material-takeoff',
    name: 'Material Takeoff Report',
    description: 'Full material schedule with quantities, rates, and cost summary.',
    defaultSections: sectionsWith({
      materialTakeoff: true,
      materialCost: true,
      charts: true,
    }),
  },
  {
    id: 'detailed-estimate',
    name: 'Detailed Estimate',
    description: 'BOQ, materials, labour, equipment, and executive cost summary.',
    defaultSections: sectionsWith({
      plotInfo: true,
      boq: true,
      materialTakeoff: true,
      labourCost: true,
      equipmentCost: true,
      costSummary: true,
      charts: true,
    }),
  },
  {
    id: 'rate-analysis',
    name: 'Rate Analysis',
    description: 'Engineering rate build-up: material, labour, equipment, overhead, profit, tax.',
    defaultSections: sectionsWith({
      rateAnalysis: true,
      costSummary: true,
      assumptions: true,
    }),
  },
  {
    id: 'quantity-summary',
    name: 'Quantity Summary',
    description: 'Civil quantities organised by category for checking and submission.',
    defaultSections: sectionsWith({
      quantitySummary: true,
      roomSummary: true,
      calculationSummary: true,
    }),
  },
  {
    id: 'cost-summary',
    name: 'Cost Summary',
    description: 'Executive cost breakdown suitable for client presentation.',
    defaultSections: sectionsWith({
      costSummary: true,
      charts: true,
      grandTotal: true,
    }),
  },
  {
    id: 'complete-engineering',
    name: 'Complete Engineering Report',
    description: 'Full consulting deliverable — cover, drawings, BOQ, MTO, rates, and notes.',
    defaultSections: {
      coverPage: true,
      projectInfo: true,
      plotInfo: true,
      floorPlan: true,
      roomSummary: true,
      dimensionDrawings: true,
      boq: true,
      materialTakeoff: true,
      materialCost: true,
      labourCost: true,
      equipmentCost: true,
      rateAnalysis: true,
      quantitySummary: true,
      costSummary: true,
      engineeringNotes: true,
      assumptions: true,
      calculationSummary: true,
      grandTotal: true,
      charts: true,
    },
  },
];

export const SECTION_LABELS: { key: keyof ReportSectionFlags; label: string }[] = [
  { key: 'coverPage', label: 'Cover Page' },
  { key: 'projectInfo', label: 'Project Information' },
  { key: 'plotInfo', label: 'Plot Information' },
  { key: 'floorPlan', label: 'Floor Plan' },
  { key: 'roomSummary', label: 'Room Summary' },
  { key: 'dimensionDrawings', label: 'Dimension Drawings' },
  { key: 'boq', label: 'BOQ' },
  { key: 'materialTakeoff', label: 'Material Takeoff' },
  { key: 'materialCost', label: 'Material Cost' },
  { key: 'labourCost', label: 'Labour Cost' },
  { key: 'equipmentCost', label: 'Equipment Cost' },
  { key: 'rateAnalysis', label: 'Rate Analysis' },
  { key: 'quantitySummary', label: 'Quantity Summary' },
  { key: 'costSummary', label: 'Cost Summary' },
  { key: 'engineeringNotes', label: 'Engineering Notes' },
  { key: 'assumptions', label: 'Assumptions' },
  { key: 'calculationSummary', label: 'Calculation Summary' },
  { key: 'grandTotal', label: 'Grand Total' },
  { key: 'charts', label: 'Charts' },
];

export const REPORT_STYLES: {
  id: ReportStyleId;
  name: string;
  description: string;
  primary: string;
  accent: string;
}[] = [
  {
    id: 'modern',
    name: 'Modern',
    description: 'Clean contemporary layout for client presentations.',
    primary: '#0F172A',
    accent: '#0D9488',
  },
  {
    id: 'professional',
    name: 'Professional',
    description: 'Classic consulting firm styling.',
    primary: '#1E3A5F',
    accent: '#C4A35A',
  },
  {
    id: 'government',
    name: 'Government',
    description: 'Formal tender-ready formatting.',
    primary: '#111827',
    accent: '#374151',
  },
  {
    id: 'contractor',
    name: 'Contractor',
    description: 'Practical site-focused report layout.',
    primary: '#1C1917',
    accent: '#B45309',
  },
  {
    id: 'consultant',
    name: 'Consultant',
    description: 'Quantity surveyor / design consultant look.',
    primary: '#1E293B',
    accent: '#2563EB',
  },
];

export function defaultWizardConfig(): ReportWizardConfig {
  const type = REPORT_TYPES.find((t) => t.id === 'complete-engineering')!;
  return {
    reportType: type.id,
    formats: ['pdf'],
    style: 'professional',
    sections: { ...type.defaultSections },
    meta: {
      companyName: '',
      companyLogoDataUrl: null,
      generatedBy: '',
      reportVersion: '1.0',
      reportTitle: '',
    },
  };
}

export function applyReportType(
  config: ReportWizardConfig,
  typeId: ReportTypeId,
): ReportWizardConfig {
  const type = REPORT_TYPES.find((t) => t.id === typeId)!;
  return {
    ...config,
    reportType: typeId,
    sections: { ...type.defaultSections },
    meta: {
      ...config.meta,
      reportTitle: config.meta.reportTitle || type.name,
    },
  };
}
