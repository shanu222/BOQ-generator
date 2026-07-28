import type { Row, Worksheet } from 'exceljs';
import { classifyBOQItem } from '@boq/engine';
import type { ReportContext } from './assemble';
import { formatQty } from './naming';

function styleHeader(row: Row, fill: string) {
  row.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
  row.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: fill.replace('#', 'FF') },
  };
  row.alignment = { vertical: 'middle', wrapText: true };
  row.height = 22;
}

function autoWidth(sheet: Worksheet, min = 10, max = 42) {
  sheet.columns.forEach((col) => {
    let best = min;
    col.eachCell?.({ includeEmpty: false }, (cell) => {
      const len = String(cell.value ?? '').length + 2;
      if (len > best) best = Math.min(max, len);
    });
    col.width = best;
  });
}

function moneyCol(sheet: Worksheet, cols: number[]) {
  for (const c of cols) {
    sheet.getColumn(c).numFmt = '#,##0';
  }
}

export async function generateExcelReport(ctx: ReportContext): Promise<Blob> {
  const ExcelJS = (await import('exceljs')).default;
  const wb = new ExcelJS.Workbook();
  wb.creator = ctx.companyName;
  wb.created = new Date();
  wb.title = ctx.title;
  const accent = ctx.style.primary.replace('#', 'FF');
  const s = ctx.config.sections;
  const { estimate: e, project: p } = ctx;

  // —— Sheet: Project Summary ——
  const summary = wb.addWorksheet('Project Summary', {
    views: [{ state: 'frozen', ySplit: 1 }],
    pageSetup: { orientation: 'portrait', fitToPage: true },
  });
  summary.addRow([ctx.title]).font = { bold: true, size: 16, color: { argb: accent } };
  summary.addRow([ctx.companyName]).font = { size: 12 };
  summary.addRow([]);
  const meta = [
    ['Project', p.name],
    ['Client', p.client || '—'],
    ['Location', p.location],
    ['Prepared By', ctx.generatedBy],
    ['Date', ctx.dateLabel],
    ['Report Version', ctx.version],
    ...(ctx.plot.plotAreaSft > 0
      ? ([['Plot Area (sft)', Math.round(ctx.plot.plotAreaSft)]] as [
          string,
          string | number,
        ][])
      : []),
    ...(ctx.plot.groundCoveredSft > 0
      ? ([['Ground Floor (sft)', Math.round(ctx.plot.groundCoveredSft)]] as [
          string,
          string | number,
        ][])
      : []),
    ...(ctx.plot.balconySft > 0
      ? ([['Balcony (sft)', Math.round(ctx.plot.balconySft)]] as [
          string,
          string | number,
        ][])
      : []),
    ...(ctx.plot.terraceSft > 0
      ? ([['Terrace (sft)', Math.round(ctx.plot.terraceSft)]] as [
          string,
          string | number,
        ][])
      : []),
    ...(ctx.plot.firstCoveredSft > 0
      ? ([['First Floor (sft)', Math.round(ctx.plot.firstCoveredSft)]] as [
          string,
          string | number,
        ][])
      : []),
    ...(ctx.plot.mumtyCoveredSft > 0
      ? ([['Mumty (sft)', Math.round(ctx.plot.mumtyCoveredSft)]] as [
          string,
          string | number,
        ][])
      : []),
    ...(ctx.coveredAreaSft > 0
      ? ([['Total Covered Area (sft)', Math.round(ctx.coveredAreaSft)]] as [
          string,
          string | number,
        ][])
      : []),
    ...(ctx.plot.openAreaSft > 0
      ? ([['Open Area (sft)', Math.round(ctx.plot.openAreaSft)]] as [
          string,
          string | number,
        ][])
      : []),
    ...(ctx.plot.costPerSft
      ? ([['Rate / Sq.ft (PKR)', ctx.plot.costPerSft]] as [string, string | number][])
      : []),
    ['Style', ctx.style.name],
  ];
  for (const [k, v] of meta) summary.addRow([k, v]);
  summary.addRow([]);
  if (s.costSummary || s.grandTotal) {
    summary.addRow(['Cost Summary']).font = { bold: true, size: 13 };
    const costRows: [string, number][] = [
      ['A. Grey Structure', ctx.costSummary.greyStructure.subtotal],
      ['B. Finishing', ctx.costSummary.finishing.subtotal],
      ['C. External Development', ctx.costSummary.external.subtotal],
      ['E. Miscellaneous', ctx.costSummary.miscellaneous.subtotal],
      ['Material', e.costs.material],
      ['Labour', e.costs.labour],
      ['Equipment', e.costs.equipment],
      ['Transportation', e.costs.transportation],
      ['Loading / Unloading', e.costs.loadingUnloading],
      ['Waste', e.costs.waste],
      ['Overhead', e.costs.overhead],
      ['Contractor Profit', e.costs.contractorProfit],
      ['Contingency', e.costs.contingency ?? 0],
      ['Tax', e.costs.tax],
      ['Subtotal (after profit)', e.costs.subtotal],
      ['Grand Total', e.costs.grandTotal],
    ];
    for (const [label, amt] of costRows) {
      const row = summary.addRow([label, amt]);
      row.getCell(2).numFmt = '#,##0';
      if (label === 'Grand Total') row.font = { bold: true };
    }

    const packages = wb.addWorksheet('Cost Packages');
    styleHeader(
      packages.addRow([
        'Package',
        'Sub-package',
        'Material',
        'Labour',
        'Equipment',
        'Subtotal',
        '% of Total',
      ]),
      ctx.style.primary,
    );
    for (const g of ctx.costSummary.groups) {
      packages.addRow([
        `${g.code}. ${g.label}`,
        '',
        g.material,
        g.labour,
        g.equipment,
        g.subtotal,
        g.percentOfTotal,
      ]).font = { bold: true };
      for (const sg of g.subgroups) {
        packages.addRow([
          '',
          sg.label,
          sg.material,
          sg.labour,
          sg.equipment,
          sg.amount ?? sg.subtotal,
          '',
        ]);
      }
    }
    packages.addRow([
      'MEP Electrical (info)',
      '',
      ctx.costSummary.mep.electrical.material,
      ctx.costSummary.mep.electrical.labour,
      ctx.costSummary.mep.electrical.equipment,
      ctx.costSummary.mep.electrical.subtotal,
      '',
    ]);
    packages.addRow([
      'MEP Plumbing (info)',
      '',
      ctx.costSummary.mep.plumbing.material,
      ctx.costSummary.mep.plumbing.labour,
      ctx.costSummary.mep.plumbing.equipment,
      ctx.costSummary.mep.plumbing.subtotal,
      '',
    ]);
    moneyCol(packages, [3, 4, 5, 6]);
    autoWidth(packages);
  }
  autoWidth(summary);

  if (s.boq) {
    const boq = wb.addWorksheet('BOQ', {
      views: [{ state: 'frozen', ySplit: 1 }],
      pageSetup: { orientation: 'landscape', fitToPage: true },
    });
    const header = boq.addRow([
      'Item No.',
      'Description',
      'Specification',
      'Unit',
      'Quantity',
      'Unit Rate',
      'Amount',
      'Trade Category',
      'Cost Package',
      'Sub-package',
    ]);
    styleHeader(header, ctx.style.primary);
    for (const item of e.boq) {
      const cls = classifyBOQItem(item.moduleId);
      boq.addRow([
        item.itemNo,
        item.description,
        item.specification,
        item.unit,
        item.quantity,
        item.rate,
        item.amount,
        item.category,
        cls.groupLabel,
        cls.subgroupLabel,
      ]);
    }
    const total = boq.addRow([
      '',
      'GRAND TOTAL',
      '',
      '',
      '',
      '',
      { formula: `SUM(G2:G${e.boq.length + 1})` },
      '',
      '',
      '',
    ]);
    total.font = { bold: true };
    moneyCol(boq, [5, 6, 7]);
    boq.autoFilter = { from: 'A1', to: `J${e.boq.length + 1}` };
    autoWidth(boq);
  }

  if (s.materialTakeoff || s.materialCost) {
    const mto = wb.addWorksheet('Material Takeoff', {
      views: [{ state: 'frozen', ySplit: 1 }],
    });
    styleHeader(
      mto.addRow(['Material', 'Category', 'Unit', 'Quantity', 'Rate', 'Amount']),
      ctx.style.primary,
    );
    for (const m of e.materials) {
      mto.addRow([m.name, m.category, m.unit, m.quantity, m.rate, m.amount]);
    }
    mto.addRow([
      'TOTAL',
      '',
      '',
      '',
      '',
      { formula: `SUM(F2:F${e.materials.length + 1})` },
    ]).font = { bold: true };
    moneyCol(mto, [4, 5, 6]);
    mto.autoFilter = { from: 'A1', to: `F${Math.max(1, e.materials.length)}` };
    autoWidth(mto);
  }

  if (s.labourCost) {
    const lab = wb.addWorksheet('Labour Cost', { views: [{ state: 'frozen', ySplit: 1 }] });
    styleHeader(lab.addRow(['Description', 'Unit', 'Quantity', 'Rate', 'Amount']), ctx.style.primary);
    for (const l of e.labour) lab.addRow([l.name, l.unit, l.quantity, l.rate, l.amount]);
    moneyCol(lab, [3, 4, 5]);
    autoWidth(lab);
  }

  if (s.equipmentCost) {
    const eq = wb.addWorksheet('Equipment Cost', { views: [{ state: 'frozen', ySplit: 1 }] });
    styleHeader(eq.addRow(['Description', 'Unit', 'Quantity', 'Rate', 'Amount']), ctx.style.primary);
    for (const x of e.equipment) eq.addRow([x.name, x.unit, x.quantity, x.rate, x.amount]);
    moneyCol(eq, [3, 4, 5]);
    autoWidth(eq);
  }

  if (s.rateAnalysis) {
    const ra = wb.addWorksheet('Rate Analysis');
    styleHeader(ra.addRow(['Component', 'Amount (PKR)', '% of Grand Total']), ctx.style.primary);
    for (const row of ctx.rateBreakdown) {
      ra.addRow([row.label, row.amount, Number(row.pct.toFixed(2))]);
    }
    ra.addRow(['Grand Total', e.costs.grandTotal, 100]).font = { bold: true };
    moneyCol(ra, [2]);
    autoWidth(ra);
  }

  if (s.quantitySummary) {
    const qty = wb.addWorksheet('Quantity Summary', { views: [{ state: 'frozen', ySplit: 1 }] });
    styleHeader(qty.addRow(['Description', 'Unit', 'Quantity', 'Category']), ctx.style.primary);
    for (const q of e.quantities) {
      qty.addRow([q.description, q.unit, q.quantity, q.category]);
    }
    autoWidth(qty);
  }

  if (s.charts || s.costSummary) {
    const charts = wb.addWorksheet('Charts Data');
    charts.addRow(['Cost Component', 'Amount']).font = { bold: true };
    for (const row of ctx.rateBreakdown) {
      if (row.amount > 0) charts.addRow([row.label, row.amount]);
    }
    autoWidth(charts);
  }

  if (s.assumptions) {
    const notes = wb.addWorksheet('Assumptions');
    notes.addRow(['Engineering Assumptions']).font = { bold: true, size: 13 };
    ctx.assumptions.forEach((a, i) => notes.addRow([`${i + 1}. ${a}`]));
    notes.addRow([]);
    notes.addRow(['Engineering Notes']).font = { bold: true, size: 13 };
    ctx.engineeringNotes.forEach((a, i) => notes.addRow([`${i + 1}. ${a}`]));
    autoWidth(notes, 20, 100);
  }

  // Touch formatQty to avoid unused if tree-shaken oddly
  void formatQty;

  const buf = await wb.xlsx.writeBuffer();
  return new Blob([buf], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}
