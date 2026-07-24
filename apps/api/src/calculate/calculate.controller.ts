import { Body, Controller, Post } from '@nestjs/common';
import type { ProjectState } from '@boq/shared';
import { CalculateService } from './calculate.service';

@Controller('calculate')
export class CalculateController {
  constructor(private readonly calculate: CalculateService) {}

  @Post()
  run(@Body() body: ProjectState) {
    return this.calculate.run(body);
  }

  @Post('advise')
  advise(@Body() body: { question: string; state: ProjectState }) {
    return this.calculate.advise(body.question, body.state);
  }
}
