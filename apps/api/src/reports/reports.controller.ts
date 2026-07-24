import { Body, Controller, Header, Post, Res, StreamableFile } from '@nestjs/common';
import type { Response } from 'express';
import type { EstimateResult, ProjectState } from '@boq/shared';
import { ReportsService } from './reports.service';

@Controller('reports')
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  @Post('excel')
  @Header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  async excel(
    @Body() body: { state: ProjectState; result: EstimateResult },
    @Res({ passthrough: true }) res: Response,
  ) {
    const buffer = await this.reports.buildExcel(body.state, body.result);
    res.set({
      'Content-Disposition': `attachment; filename="BOQ-${slug(body.state.name)}.xlsx"`,
    });
    return new StreamableFile(buffer);
  }

  @Post('word')
  @Header('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')
  async word(
    @Body() body: { state: ProjectState; result: EstimateResult },
    @Res({ passthrough: true }) res: Response,
  ) {
    const buffer = await this.reports.buildWord(body.state, body.result);
    res.set({
      'Content-Disposition': `attachment; filename="BOQ-${slug(body.state.name)}.docx"`,
    });
    return new StreamableFile(buffer);
  }

  @Post('pdf')
  @Header('Content-Type', 'application/pdf')
  async pdf(
    @Body() body: { state: ProjectState; result: EstimateResult },
    @Res({ passthrough: true }) res: Response,
  ) {
    const buffer = await this.reports.buildPdf(body.state, body.result);
    res.set({
      'Content-Disposition': `attachment; filename="BOQ-${slug(body.state.name)}.pdf"`,
    });
    return new StreamableFile(buffer);
  }
}

function slug(name: string) {
  return (name || 'Estimate').replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '') || 'Estimate';
}
