import {
  AlignmentType,
  BorderStyle,
  Document,
  Footer,
  Header,
  HeadingLevel,
  Packer,
  PageBreak,
  PageNumber,
  Paragraph,
  Table,
  TableCell,
  TableOfContents,
  TableRow,
  TextRun,
  WidthType,
  convertInchesToTwip,
} from 'docx';
import type { ReportContext } from './assemble';
import { formatPKRReport, formatQty } from './naming';

function p(text: string, opts?: { bold?: boolean; size?: number; color?: string; center?: boolean }) {
  return new Paragraph({
    alignment: opts?.center ? AlignmentType.CENTER : AlignmentType.LEFT,
    spacing: { after: 120 },
    children: [
      new TextRun({
        text,
        bold: opts?.bold,
        size: opts?.size ?? 20,
        color: opts?.color?.replace('#', ''),
        font: 'Calibri',
      }),
    ],
  });
}

function h1(text: string, color: string) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 360, after: 160 },
    children: [new TextRun({ text, bold: true, color: color.replace('#', ''), font: 'Calibri', size: 28 })],
  });
}

function cell(text: string, opts?: { bold?: boolean; width?: number; shade?: string }) {
  return new TableCell({
    width: { size: opts?.width ?? 1500, type: WidthType.DXA },
    shading: opts?.shade ? { fill: opts.shade.replace('#', '') } : undefined,
    borders: {
      top: { style: BorderStyle.SINGLE, size: 4, color: 'CCCCCC' },
      bottom: { style: BorderStyle.SINGLE, size: 4, color: 'CCCCCC' },
      left: { style: BorderStyle.SINGLE, size: 4, color: 'CCCCCC' },
      right: { style: BorderStyle.SINGLE, size: 4, color: 'CCCCCC' },
    },
    children: [
      new Paragraph({
        children: [
          new TextRun({
            text,
            bold: opts?.bold,
            size: 16,
            font: 'Calibri',
          }),
        ],
      }),
    ],
  });
}

function simpleTable(headers: string[], rows: string[][], headerShade: string) {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        tableHeader: true,
        children: headers.map((h) => cell(h, { bold: true, shade: headerShade })),
      }),
      ...rows.map(
        (r) =>
          new TableRow({
            children: r.map((c) => cell(c)),
          }),
      ),
    ],
  });
}

export async function generateWordReport(ctx: ReportContext): Promise<Blob> {
  const s = ctx.config.sections;
  const color = ctx.style.primary;
  const blocks: (Paragraph | Table | TableOfContents)[] = [];

  // Cover
  if (s.coverPage) {
    blocks.push(new Paragraph({ spacing: { before: 800 } , children: [] }));
    blocks.push(p(ctx.companyName.toUpperCase(), { bold: true, size: 22, color, center: true }));
    blocks.push(p('ENGINEERING ESTIMATION REPORT', { bold: true, size: 36, center: true }));
    blocks.push(p(ctx.title, { size: 28, center: true, color: ctx.style.accent }));
    blocks.push(p(''));
    blocks.push(p(ctx.subtitle, { bold: true, size: 26, center: true }));
    blocks.push(p(`Location: ${ctx.project.location || '—'}`, { center: true }));
    if (ctx.plot.plotAreaSft > 0) {
      blocks.push(p(`Plot area: ${Math.round(ctx.plot.plotAreaSft)} sft`, { center: true }));
    }
    if (ctx.coveredAreaSft > 0) {
      blocks.push(
        p(`Total covered area: ${Math.round(ctx.coveredAreaSft)} sft`, { center: true }),
      );
    }
    if (ctx.plot.openAreaSft > 0) {
      blocks.push(p(`Open area: ${Math.round(ctx.plot.openAreaSft)} sft`, { center: true }));
    }
    blocks.push(p(`Date: ${ctx.dateLabel}  ·  Version ${ctx.version}`, { center: true }));
    blocks.push(p(`Prepared by: ${ctx.generatedBy}`, { center: true }));
    blocks.push(p(`Client: ${ctx.project.client || '—'}`, { center: true }));
    blocks.push(
      new Paragraph({
        children: [new PageBreak()],
      }),
    );
  }

  // TOC
  blocks.push(h1('Table of Contents', color));
  blocks.push(
    new TableOfContents('Table of Contents', {
      hyperlink: true,
      stylesWithLevels: [
        { styleName: 'Heading1', level: 1 },
        { styleName: 'Heading2', level: 2 },
      ],
    }),
  );
  blocks.push(
    new Paragraph({
      children: [
        new TextRun({
          text: '(Update fields in Word to refresh page numbers: right-click TOC → Update Field)',
          italics: true,
          size: 16,
          color: '666666',
        }),
      ],
      spacing: { after: 200 },
    }),
  );

  if (s.projectInfo) {
    blocks.push(h1('1. Project Information', color));
    blocks.push(
      simpleTable(
        ['Field', 'Value'],
        [
          ['Project', ctx.project.name],
          ['Client', ctx.project.client || '—'],
          ['Location', ctx.project.location],
          ['Prepared By', ctx.generatedBy],
          ['Date', ctx.dateLabel],
          ['Report Version', ctx.version],
          ...(ctx.plot.plotAreaSft > 0
            ? [['Plot Area', `${Math.round(ctx.plot.plotAreaSft)} sft`]]
            : []),
          ...(ctx.plot.groundCoveredSft > 0
            ? [['Ground Floor', `${Math.round(ctx.plot.groundCoveredSft)} sft`]]
            : []),
          ...(ctx.plot.balconySft > 0
            ? [['Balcony', `${Math.round(ctx.plot.balconySft)} sft`]]
            : []),
          ...(ctx.plot.terraceSft > 0
            ? [['Terrace', `${Math.round(ctx.plot.terraceSft)} sft`]]
            : []),
          ...(ctx.plot.firstCoveredSft > 0
            ? [['First Floor', `${Math.round(ctx.plot.firstCoveredSft)} sft`]]
            : []),
          ...(ctx.plot.mumtyCoveredSft > 0
            ? [['Mumty', `${Math.round(ctx.plot.mumtyCoveredSft)} sft`]]
            : []),
          ...(ctx.coveredAreaSft > 0
            ? [['Total Covered Area', `${Math.round(ctx.coveredAreaSft)} sft`]]
            : []),
          ...(ctx.plot.openAreaSft > 0
            ? [['Open Area', `${Math.round(ctx.plot.openAreaSft)} sft`]]
            : []),
        ],
        color,
      ),
    );
  }

  if (s.costSummary || s.grandTotal) {
    blocks.push(h1('2. Cost Summary', color));
    blocks.push(
      simpleTable(
        ['Package', 'Amount (PKR)', '%'],
        [
          ...ctx.costSummary.groups.map((g) => [
            `${g.code}. ${g.label}`,
            formatPKRReport(g.subtotal),
            `${g.percentOfTotal.toFixed(1)}%`,
          ]),
          [
            'Grand Total',
            formatPKRReport(ctx.estimate.costs.grandTotal),
            '100%',
          ],
        ],
        color,
      ),
    );
    blocks.push(p('Package detail', { bold: true, size: 22 }));
    blocks.push(
      simpleTable(
        ['Package', 'Sub-package', 'Amount (PKR)'],
        ctx.costSummary.groups.flatMap((g) =>
          g.subgroups.map((sg) => [
            `${g.code}. ${g.label}`,
            sg.label,
            formatPKRReport(sg.amount ?? sg.subtotal),
          ]),
        ),
        color,
      ),
    );
    blocks.push(p('MEP summary (informative)', { bold: true, size: 22 }));
    blocks.push(
      simpleTable(
        ['Service', 'Amount (PKR)'],
        [
          [
            ctx.costSummary.mep.electrical.label,
            formatPKRReport(ctx.costSummary.mep.electrical.subtotal),
          ],
          [
            ctx.costSummary.mep.plumbing.label,
            formatPKRReport(ctx.costSummary.mep.plumbing.subtotal),
          ],
        ],
        color,
      ),
    );
    blocks.push(p('Rate analysis build-up', { bold: true, size: 22 }));
    blocks.push(
      simpleTable(
        ['Component', 'Amount (PKR)'],
        ctx.rateBreakdown
          .filter((r) => r.amount > 0)
          .map((r) => [r.label, formatPKRReport(r.amount)]),
        color,
      ),
    );
    blocks.push(p(`Grand Total: ${formatPKRReport(ctx.estimate.costs.grandTotal)}`, { bold: true, size: 24 }));
  }

  if (s.boq) {
    blocks.push(h1('6. Bill of Quantities', color));
    const slice = ctx.estimate.boq;
    blocks.push(
      simpleTable(
        ['Item', 'Description', 'Unit', 'Qty', 'Rate', 'Amount'],
        slice.map((b) => [
          b.itemNo,
          b.description.slice(0, 60),
          b.unit,
          formatQty(b.quantity),
          formatQty(b.rate, 0),
          formatQty(b.amount, 0),
        ]),
        color,
      ),
    );
  }

  if (s.materialTakeoff) {
    blocks.push(h1('7. Material Takeoff', color));
    blocks.push(
      simpleTable(
        ['Material', 'Unit', 'Qty', 'Rate', 'Amount'],
        ctx.estimate.materials.map((m) => [
          m.name,
          m.unit,
          formatQty(m.quantity),
          formatQty(m.rate, 0),
          formatQty(m.amount, 0),
        ]),
        color,
      ),
    );
  }

  if (s.labourCost) {
    blocks.push(h1('8. Labour Cost', color));
    blocks.push(
      simpleTable(
        ['Description', 'Unit', 'Qty', 'Rate', 'Amount'],
        ctx.estimate.labour.map((l) => [
          l.name,
          l.unit,
          formatQty(l.quantity),
          formatQty(l.rate, 0),
          formatQty(l.amount, 0),
        ]),
        color,
      ),
    );
  }

  if (s.equipmentCost) {
    blocks.push(h1('9. Equipment Cost', color));
    blocks.push(
      simpleTable(
        ['Description', 'Unit', 'Qty', 'Rate', 'Amount'],
        ctx.estimate.equipment.map((x) => [
          x.name,
          x.unit,
          formatQty(x.quantity),
          formatQty(x.rate, 0),
          formatQty(x.amount, 0),
        ]),
        color,
      ),
    );
  }

  if (s.rateAnalysis) {
    blocks.push(h1('10. Rate Analysis', color));
    blocks.push(
      simpleTable(
        ['Component', 'Amount', '%'],
        ctx.rateBreakdown.map((r) => [
          r.label,
          formatPKRReport(r.amount),
          `${r.pct.toFixed(1)}%`,
        ]),
        color,
      ),
    );
  }

  if (s.quantitySummary) {
    blocks.push(h1('11. Quantity Summary', color));
    blocks.push(
      simpleTable(
        ['Description', 'Unit', 'Quantity', 'Category'],
        ctx.estimate.quantities.map((q) => [
          q.description,
          q.unit,
          formatQty(q.quantity),
          q.category,
        ]),
        color,
      ),
    );
  }

  if (s.assumptions) {
    blocks.push(h1('12. Assumptions', color));
    ctx.assumptions.forEach((a, i) => blocks.push(p(`${i + 1}. ${a}`)));
  }

  if (s.engineeringNotes) {
    blocks.push(h1('13. Engineering Notes', color));
    ctx.engineeringNotes.forEach((a, i) => blocks.push(p(`${i + 1}. ${a}`)));
  }

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: convertInchesToTwip(0.75),
              bottom: convertInchesToTwip(0.75),
              left: convertInchesToTwip(0.85),
              right: convertInchesToTwip(0.75),
            },
          },
        },
        headers: {
          default: new Header({
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: `${ctx.companyName}  ·  ${ctx.title}`,
                    size: 16,
                    color: '666666',
                    font: 'Calibri',
                  }),
                ],
              }),
            ],
          }),
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({ text: 'Page ', size: 16, font: 'Calibri' }),
                  new TextRun({ children: [PageNumber.CURRENT], size: 16 }),
                  new TextRun({ text: ' of ', size: 16 }),
                  new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 16 }),
                  new TextRun({
                    text: `  ·  ${ctx.subtitle}  ·  Rev ${ctx.version}`,
                    size: 16,
                    color: '666666',
                  }),
                ],
              }),
            ],
          }),
        },
        children: blocks as never[],
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  return blob;
}
