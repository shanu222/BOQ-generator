import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { ReportContext } from './assemble';
import { formatPKRReport, formatQty } from './naming';
import { drawFloorPlan, type DrawSurface } from './floor-plan-draw';

type JsPdfDoc = jsPDF & {
  lastAutoTable?: { finalY: number };
};

function hexRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
}

export async function generatePdfReport(ctx: ReportContext): Promise<Blob> {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' }) as JsPdfDoc;
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 14;
  const s = ctx.config.sections;
  const [pr, pg, pb] = hexRgb(ctx.style.primary);
  const [ar, ag, ab] = hexRgb(ctx.style.accent);
  let page = 1;

  const footer = () => {
    const p = doc.getCurrentPageInfo().pageNumber;
    doc.setFontSize(8);
    doc.setTextColor(100);
    doc.text(
      `${ctx.companyName}  ·  ${ctx.subtitle}  ·  Rev ${ctx.version}`,
      margin,
      pageH - 8,
    );
    doc.text(`Page ${p}`, pageW - margin, pageH - 8, { align: 'right' });
  };

  const ensureSpace = (need: number, y: number) => {
    if (y + need > pageH - 18) {
      footer();
      doc.addPage();
      page += 1;
      return margin + 8;
    }
    return y;
  };

  const sectionTitle = (title: string, y: number) => {
    y = ensureSpace(16, y);
    doc.setFillColor(pr, pg, pb);
    doc.rect(margin, y, 3, 7, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(pr, pg, pb);
    doc.text(title, margin + 6, y + 5.5);
    return y + 12;
  };

  let y = margin;

  // —— Cover ——
  if (s.coverPage) {
    doc.setFillColor(pr, pg, pb);
    doc.rect(0, 0, pageW, 48, 'F');
    doc.setTextColor(255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text(ctx.companyName.toUpperCase(), margin, 18);
    doc.setFontSize(20);
    doc.text('ENGINEERING ESTIMATION REPORT', margin, 30);
    doc.setFontSize(12);
    doc.text(ctx.title, margin, 40);

    doc.setTextColor(30);
    y = 70;
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(ctx.subtitle, margin, y);
    y += 10;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.setTextColor(60);
    const coverLines = [
      `Plot: ${ctx.plotLabel}`,
      `Layout / Template: ${ctx.templateName}`,
      `Client: ${ctx.project.client || '—'}`,
      `Location: ${ctx.project.location}`,
      `Prepared by: ${ctx.generatedBy}`,
      `Date: ${ctx.dateLabel}`,
      `Report version: ${ctx.version}`,
      `Style: ${ctx.style.name}`,
    ];
    for (const line of coverLines) {
      doc.text(line, margin, y);
      y += 7;
    }

    doc.setFillColor(ar, ag, ab);
    doc.rect(margin, pageH - 40, pageW - margin * 2, 12, 'F');
    doc.setTextColor(255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text(
      `Grand Total  ${formatPKRReport(ctx.estimate.costs.grandTotal)}`,
      margin + 4,
      pageH - 32,
    );

    footer();
    doc.addPage();
    y = margin + 4;
  }

  // TOC
  y = sectionTitle('Table of Contents', y);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(40);
  const toc: string[] = [];
  if (s.projectInfo) toc.push('1. Project Information');
  if (s.plotInfo) toc.push('2. Plot Information');
  if (s.floorPlan) toc.push('3. Floor Plan');
  if (s.roomSummary) toc.push('4. Room Summary');
  if (s.costSummary) toc.push('5. Cost Summary');
  if (s.charts) toc.push('6. Cost Charts');
  if (s.boq) toc.push('7. Bill of Quantities');
  if (s.materialTakeoff) toc.push('8. Material Takeoff');
  if (s.labourCost) toc.push('9. Labour Cost');
  if (s.equipmentCost) toc.push('10. Equipment Cost');
  if (s.rateAnalysis) toc.push('11. Rate Analysis');
  if (s.quantitySummary) toc.push('12. Quantity Summary');
  if (s.assumptions) toc.push('13. Assumptions');
  if (s.engineeringNotes) toc.push('14. Engineering Notes');
  for (const t of toc) {
    y = ensureSpace(6, y);
    doc.text(t, margin + 2, y);
    y += 6;
  }
  y += 4;

  if (s.projectInfo) {
    y = sectionTitle('1. Project Information', y);
    autoTable(doc, {
      startY: y,
      head: [['Field', 'Value']],
      body: [
        ['Project', ctx.project.name],
        ['Client', ctx.project.client || '—'],
        ['Location', ctx.project.location],
        ['Prepared By', ctx.generatedBy],
        ['Date', ctx.dateLabel],
        ['Version', ctx.version],
      ],
      margin: { left: margin, right: margin },
      headStyles: { fillColor: [pr, pg, pb], textColor: 255, fontStyle: 'bold' },
      styles: { fontSize: 9, cellPadding: 2 },
    });
    y = (doc.lastAutoTable?.finalY ?? y) + 8;
  }

  if (s.plotInfo && ctx.plan) {
    y = sectionTitle('2. Plot Information', y);
    autoTable(doc, {
      startY: y,
      head: [['Field', 'Value']],
      body: [
        ['Plot', ctx.plan.plot.label],
        ['Size', `${ctx.plan.plot.widthFt}′ × ${ctx.plan.plot.depthFt}′`],
        ['Covered', `${Math.round(ctx.coveredSft)} sft`],
        ['Open', `${Math.round(ctx.openSft)} sft`],
        ['Template', ctx.templateName],
      ],
      margin: { left: margin, right: margin },
      headStyles: { fillColor: [pr, pg, pb], textColor: 255 },
      styles: { fontSize: 9, cellPadding: 2 },
    });
    y = (doc.lastAutoTable?.finalY ?? y) + 8;
  }

  if (s.floorPlan && ctx.plan) {
    y = sectionTitle('3. Floor Plan', y);
    y = ensureSpace(120, y);
    const box = { x: margin, y, w: pageW - margin * 2, h: 110 };
    doc.setDrawColor(200);
    doc.rect(box.x, box.y, box.w, box.h);

    const surface: DrawSurface = {
      setStroke(color, width) {
        const [r, g, b] = color.startsWith('#')
          ? hexRgb(color)
          : color.startsWith('rgb')
            ? [100, 100, 100]
            : [30, 30, 30];
        doc.setDrawColor(r, g, b);
        doc.setLineWidth(width * 0.2);
      },
      setFill(color) {
        if (color.includes('rgba')) {
          doc.setFillColor(240, 240, 240);
        } else if (color.startsWith('#')) {
          const [r, g, b] = hexRgb(color);
          doc.setFillColor(r, g, b);
        } else {
          doc.setFillColor(245, 245, 245);
        }
      },
      line(x1, y1, x2, y2) {
        doc.line(x1, y1, x2, y2);
      },
      rect(x, y0, w, h, fill) {
        if (fill) doc.rect(x, y0, w, h, 'F');
        else doc.rect(x, y0, w, h, 'S');
      },
      polygon(points, fill) {
        if (points.length < 2) return;
        const flat = points.flatMap((pt) => [pt.x, pt.y]);
        if (fill) {
          // jsPDF doesn't have native fill polygon easily — stroke path
          doc.setDrawColor(220);
        }
        for (let i = 0; i < points.length; i++) {
          const a = points[i];
          const b = points[(i + 1) % points.length];
          doc.line(a.x, a.y, b.x, b.y);
        }
        void flat;
      },
      text(str, x, y0, size, color) {
        doc.setFontSize(size * 0.7);
        if (color?.startsWith('#')) {
          const [r, g, b] = hexRgb(color);
          doc.setTextColor(r, g, b);
        }
        doc.text(str, x, y0, { align: 'center' });
      },
      circle(x, y0, r) {
        doc.circle(x, y0, r, 'S');
      },
    };

    drawFloorPlan(ctx.plan, surface, box, {
      primary: ctx.style.accent,
      ink: ctx.style.primary,
    });
    y = box.y + box.h + 8;
    doc.setFontSize(8);
    doc.setTextColor(100);
    doc.text('Figure — Ground Floor Plan (vector geometry)', pageW / 2, y, { align: 'center' });
    y += 8;
  }

  if (s.roomSummary && ctx.rooms.length) {
    y = sectionTitle('4. Room Summary', y);
    autoTable(doc, {
      startY: y,
      head: [['Room', 'Type', 'm²', 'sft']],
      body: ctx.rooms.map((r) => [
        r.name,
        r.type,
        formatQty(r.areaM2, 2),
        String(Math.round(r.areaSft)),
      ]),
      margin: { left: margin, right: margin },
      headStyles: { fillColor: [pr, pg, pb], textColor: 255 },
      styles: { fontSize: 8, cellPadding: 1.5 },
    });
    y = (doc.lastAutoTable?.finalY ?? y) + 8;
  }

  if (s.costSummary || s.grandTotal) {
    y = sectionTitle('5. Cost Summary', y);
    autoTable(doc, {
      startY: y,
      head: [['Component', 'Amount (PKR)', '%']],
      body: [
        ...ctx.rateBreakdown
          .filter((r) => r.amount > 0)
          .map((r) => [r.label, formatPKRReport(r.amount), `${r.pct.toFixed(1)}%`]),
        ['Grand Total', formatPKRReport(ctx.estimate.costs.grandTotal), '100%'],
      ],
      margin: { left: margin, right: margin },
      headStyles: { fillColor: [pr, pg, pb], textColor: 255 },
      styles: { fontSize: 9, cellPadding: 2 },
      didParseCell: (data) => {
        if (data.section === 'body' && data.row.index === data.table.body.length - 1) {
          data.cell.styles.fontStyle = 'bold';
        }
      },
    });
    y = (doc.lastAutoTable?.finalY ?? y) + 8;
  }

  if (s.charts) {
    y = sectionTitle('6. Cost Distribution', y);
    y = ensureSpace(55, y);
    const chartable = ctx.rateBreakdown.filter((r) => r.amount > 0).slice(0, 6);
    const max = Math.max(...chartable.map((c) => c.amount), 1);
    const barMaxW = pageW - margin * 2 - 55;
    let cy = y;
    for (const row of chartable) {
      const bw = (row.amount / max) * barMaxW;
      doc.setFontSize(8);
      doc.setTextColor(40);
      doc.text(row.label.slice(0, 16), margin, cy + 3.5);
      doc.setFillColor(ar, ag, ab);
      doc.rect(margin + 40, cy, bw, 4.5, 'F');
      doc.setFontSize(7);
      doc.text(formatPKRReport(row.amount), margin + 42 + bw, cy + 3.5);
      cy += 8;
    }
    y = cy + 6;
  }

  if (s.boq) {
    y = sectionTitle('7. Bill of Quantities', y);
    autoTable(doc, {
      startY: y,
      head: [['Item', 'Description', 'Unit', 'Qty', 'Rate', 'Amount']],
      body: ctx.estimate.boq.map((b) => [
        b.itemNo,
        b.description.slice(0, 42),
        b.unit,
        formatQty(b.quantity),
        formatQty(b.rate, 0),
        formatQty(b.amount, 0),
      ]),
      margin: { left: margin, right: margin },
      headStyles: { fillColor: [pr, pg, pb], textColor: 255, fontStyle: 'bold' },
      styles: { fontSize: 7.5, cellPadding: 1.2, overflow: 'linebreak' },
      columnStyles: {
        0: { cellWidth: 14 },
        1: { cellWidth: 70 },
        2: { cellWidth: 14 },
        3: { cellWidth: 18 },
        4: { cellWidth: 22 },
        5: { cellWidth: 24 },
      },
      showHead: 'everyPage',
      didDrawPage: () => {
        footer();
      },
    });
    y = (doc.lastAutoTable?.finalY ?? y) + 8;
  }

  if (s.materialTakeoff) {
    y = sectionTitle('8. Material Takeoff', y);
    autoTable(doc, {
      startY: y,
      head: [['Material', 'Unit', 'Qty', 'Rate', 'Amount']],
      body: ctx.estimate.materials.map((m) => [
        m.name.slice(0, 40),
        m.unit,
        formatQty(m.quantity),
        formatQty(m.rate, 0),
        formatQty(m.amount, 0),
      ]),
      margin: { left: margin, right: margin },
      headStyles: { fillColor: [pr, pg, pb], textColor: 255 },
      styles: { fontSize: 8, cellPadding: 1.4 },
      showHead: 'everyPage',
      didDrawPage: () => footer(),
    });
    y = (doc.lastAutoTable?.finalY ?? y) + 8;
  }

  if (s.labourCost) {
    y = sectionTitle('9. Labour Cost', y);
    autoTable(doc, {
      startY: y,
      head: [['Description', 'Unit', 'Qty', 'Rate', 'Amount']],
      body: ctx.estimate.labour.map((l) => [
        l.name,
        l.unit,
        formatQty(l.quantity),
        formatQty(l.rate, 0),
        formatQty(l.amount, 0),
      ]),
      margin: { left: margin, right: margin },
      headStyles: { fillColor: [pr, pg, pb], textColor: 255 },
      styles: { fontSize: 8, cellPadding: 1.4 },
      showHead: 'everyPage',
      didDrawPage: () => footer(),
    });
    y = (doc.lastAutoTable?.finalY ?? y) + 8;
  }

  if (s.equipmentCost) {
    y = sectionTitle('10. Equipment Cost', y);
    autoTable(doc, {
      startY: y,
      head: [['Description', 'Unit', 'Qty', 'Rate', 'Amount']],
      body: ctx.estimate.equipment.map((x) => [
        x.name,
        x.unit,
        formatQty(x.quantity),
        formatQty(x.rate, 0),
        formatQty(x.amount, 0),
      ]),
      margin: { left: margin, right: margin },
      headStyles: { fillColor: [pr, pg, pb], textColor: 255 },
      styles: { fontSize: 8, cellPadding: 1.4 },
      showHead: 'everyPage',
      didDrawPage: () => footer(),
    });
    y = (doc.lastAutoTable?.finalY ?? y) + 8;
  }

  if (s.rateAnalysis) {
    y = sectionTitle('11. Rate Analysis', y);
    autoTable(doc, {
      startY: y,
      head: [['Component', 'Amount', '% of Total']],
      body: ctx.rateBreakdown.map((r) => [
        r.label,
        formatPKRReport(r.amount),
        `${r.pct.toFixed(1)}%`,
      ]),
      margin: { left: margin, right: margin },
      headStyles: { fillColor: [pr, pg, pb], textColor: 255 },
      styles: { fontSize: 9, cellPadding: 2 },
    });
    y = (doc.lastAutoTable?.finalY ?? y) + 8;
  }

  if (s.quantitySummary) {
    y = sectionTitle('12. Quantity Summary', y);
    autoTable(doc, {
      startY: y,
      head: [['Description', 'Unit', 'Quantity', 'Category']],
      body: ctx.estimate.quantities.map((q) => [
        q.description.slice(0, 48),
        q.unit,
        formatQty(q.quantity),
        q.category,
      ]),
      margin: { left: margin, right: margin },
      headStyles: { fillColor: [pr, pg, pb], textColor: 255 },
      styles: { fontSize: 8, cellPadding: 1.4 },
      showHead: 'everyPage',
      didDrawPage: () => footer(),
    });
    y = (doc.lastAutoTable?.finalY ?? y) + 8;
  }

  if (s.assumptions) {
    y = sectionTitle('13. Assumptions', y);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(40);
    ctx.assumptions.forEach((a, i) => {
      y = ensureSpace(10, y);
      const lines = doc.splitTextToSize(`${i + 1}. ${a}`, pageW - margin * 2);
      doc.text(lines, margin, y);
      y += lines.length * 4.5 + 2;
    });
  }

  if (s.engineeringNotes) {
    y = sectionTitle('14. Engineering Notes', y);
    doc.setFontSize(9);
    ctx.engineeringNotes.forEach((a, i) => {
      y = ensureSpace(10, y);
      const lines = doc.splitTextToSize(`${i + 1}. ${a}`, pageW - margin * 2);
      doc.text(lines, margin, y);
      y += lines.length * 4.5 + 2;
    });
  }

  footer();
  void page;

  return doc.output('blob');
}
