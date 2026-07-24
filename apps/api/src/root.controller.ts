import { Controller, Get } from '@nestjs/common';

/** Public root — excluded from global `api` prefix so Vercel `/` is not a 404. */
@Controller()
export class RootController {
  @Get()
  info() {
    return {
      service: 'BOQ Pro API',
      status: 'ok',
      version: '1.0.0',
      docs: {
        health: '/api/health',
        costDatabase: '/api/cost-database',
        materials: '/api/materials',
        labour: '/api/labour',
        equipment: '/api/equipment',
        modules: '/api/modules',
        calculate: 'POST /api/calculate',
        advise: 'POST /api/calculate/advise',
        reports: {
          excel: 'POST /api/reports/excel',
          word: 'POST /api/reports/word',
          pdf: 'POST /api/reports/pdf',
        },
      },
    };
  }
}
