import { Injectable } from '@nestjs/common';
import { Document, HeadingLevel, Packer, Paragraph, Table, TableCell, TableRow, TextRun, WidthType } from 'docx';
import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';
import type { EstimateResult, ProjectState } from '@boq/shared';

@Injectable()
export class ReportsService {
  async buildExcel(state: ProjectState, result: EstimateResult): Promise<Buffer> {
    const wb = new ExcelJS.Workbook();
    wb.creator = 'BOQ Pro';
    wb.created = new Date();

    const summary = wb.addWorksheet('Executive Summary');
    summary.addRows([
      ['Project', state.name],
      ['Location', state.location],
      ['Client', state.client],
      ['Prepared By', state.preparedBy],
      ['Date', state.date],
      [],
      ['Material Cost (PKR)', result.costs.material],
      ['Labour Cost (PKR)', result.costs.labour],
      ['Equipment Cost (PKR)', result.costs.equipment],
      ['Transportation', result.costs.transportation],
      ['Loading & Unloading', result.costs.loadingUnloading],
      ['Waste Allowance', result.costs.waste],
      ['Overhead', result.costs.overhead],
      ['Contractor Profit', result.costs.contractorProfit],
      ['Tax', result.costs.tax],
      ['Grand Total (PKR)', result.costs.grandTotal],
    ]);

    const boq = wb.addWorksheet('BOQ');
    boq.addRow(['Item No', 'Description', 'Specification', 'Unit', 'Qty', 'Rate', 'Amount', 'Category', 'Remarks']);
    for (const item of result.boq) {
      boq.addRow([
        item.itemNo,
        item.description,
        item.specification,
        item.unit,
        item.quantity,
        item.rate,
        item.amount,
        item.category,
        item.remarks,
      ]);
    }

    const mto = wb.addWorksheet('Material Takeoff');
    mto.addRow(['Material', 'Category', 'Unit', 'Quantity', 'Rate', 'Amount']);
    for (const m of result.materials) {
      mto.addRow([m.name, m.category, m.unit, m.quantity, m.rate, m.amount]);
    }

    const labour = wb.addWorksheet('Labour');
    labour.addRow(['Description', 'Unit', 'Quantity', 'Rate', 'Amount']);
    for (const l of result.labour) {
      labour.addRow([l.name, l.unit, l.quantity, l.rate, l.amount]);
    }

    const equipment = wb.addWorksheet('Equipment');
    equipment.addRow(['Description', 'Unit', 'Quantity', 'Rate', 'Amount']);
    for (const e of result.equipment) {
      equipment.addRow([e.name, e.unit, e.quantity, e.rate, e.amount]);
    }

    const qty = wb.addWorksheet('Quantities');
    qty.addRow(['Description', 'Unit', 'Quantity', 'Category']);
    for (const q of result.quantities) {
      qty.addRow([q.description, q.unit, q.quantity, q.category]);
    }

    const buf = await wb.xlsx.writeBuffer();
    return Buffer.from(buf);
  }

  async buildWord(state: ProjectState, result: EstimateResult): Promise<Buffer> {
    const header = (text: string) =>
      new Paragraph({ text, heading: HeadingLevel.HEADING_1, spacing: { before: 240, after: 120 } });

    const money = (n: number) => `PKR ${n.toLocaleString('en-PK')}`;

    const boqRows = [
      new TableRow({
        children: ['Item', 'Description', 'Unit', 'Qty', 'Rate', 'Amount'].map(
          (t) => new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: t, bold: true })] })] }),
        ),
      }),
      ...result.boq.map(
        (item) =>
          new TableRow({
            children: [
              item.itemNo,
              item.description,
              item.unit,
              String(item.quantity),
              String(item.rate),
              String(item.amount),
            ].map((t) => new TableCell({ children: [new Paragraph(t)] })),
          }),
      ),
    ];

    const doc = new Document({
      sections: [
        {
          children: [
            new Paragraph({
              children: [new TextRun({ text: 'BOQ Pro — Professional Estimate', bold: true, size: 32 })],
            }),
            new Paragraph(`${state.name} | ${state.location} | ${state.date}`),
            new Paragraph(`Client: ${state.client || '—'}  |  Prepared by: ${state.preparedBy || '—'}`),
            header('Executive Cost Summary'),
            new Paragraph(`Material: ${money(result.costs.material)}`),
            new Paragraph(`Labour: ${money(result.costs.labour)}`),
            new Paragraph(`Equipment: ${money(result.costs.equipment)}`),
            new Paragraph(`Grand Total: ${money(result.costs.grandTotal)}`),
            header('Bill of Quantities'),
            new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: boqRows }),
            header('Material Takeoff'),
            ...result.materials.map(
              (m) => new Paragraph(`${m.name}: ${m.quantity} ${m.unit} @ ${m.rate} = ${money(m.amount)}`),
            ),
            header('Rate Analysis Notes'),
            new Paragraph(
              `Transport ${state.rateFactors.transportationPercent}%, Loading ${state.rateFactors.loadingUnloadingPercent}%, Waste ${state.rateFactors.wastePercent}%, Overhead ${state.rateFactors.overheadPercent}%, Profit ${state.rateFactors.contractorProfitPercent}%, Tax ${state.rateFactors.taxPercent}%`,
            ),
          ],
        },
      ],
    });

    return Buffer.from(await Packer.toBuffer(doc));
  }

  async buildPdf(state: ProjectState, result: EstimateResult): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50, size: 'A4' });
      const chunks: Buffer[] = [];
      doc.on('data', (c) => chunks.push(c));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      doc.fontSize(18).text('BOQ Pro — Professional Estimate', { underline: true });
      doc.moveDown(0.5);
      doc.fontSize(11).text(`${state.name}`);
      doc.text(`${state.location}  |  ${state.date}`);
      doc.text(`Client: ${state.client || '—'}  |  Prepared by: ${state.preparedBy || '—'}`);
      doc.moveDown();
      doc.fontSize(14).text('Executive Cost Summary');
      doc.fontSize(11);
      doc.text(`Material Cost: PKR ${result.costs.material.toLocaleString('en-PK')}`);
      doc.text(`Labour Cost: PKR ${result.costs.labour.toLocaleString('en-PK')}`);
      doc.text(`Equipment Cost: PKR ${result.costs.equipment.toLocaleString('en-PK')}`);
      doc.text(`Grand Total: PKR ${result.costs.grandTotal.toLocaleString('en-PK')}`);
      doc.moveDown();
      doc.fontSize(14).text('Bill of Quantities');
      doc.fontSize(9);
      for (const item of result.boq.slice(0, 40)) {
        doc.text(
          `${item.itemNo}  ${item.description}  |  ${item.quantity} ${item.unit}  @ ${item.rate}  = ${item.amount}`,
        );
      }
      if (result.boq.length > 40) {
        doc.text(`… and ${result.boq.length - 40} more items (see Excel export for full BOQ).`);
      }
      doc.moveDown();
      doc.fontSize(14).text('Material Takeoff Summary');
      doc.fontSize(9);
      for (const m of result.materials.slice(0, 30)) {
        doc.text(`${m.name}: ${m.quantity} ${m.unit} — PKR ${m.amount.toLocaleString('en-PK')}`);
      }
      doc.end();
    });
  }
}
