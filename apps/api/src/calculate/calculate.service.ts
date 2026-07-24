import { Injectable } from '@nestjs/common';
import type { ProjectState } from '@boq/shared';
import { answerEngineeringQuestion, calculateEstimate } from '@boq/engine';

@Injectable()
export class CalculateService {
  run(state: ProjectState) {
    return calculateEstimate(state);
  }

  advise(question: string, state: ProjectState) {
    const result = calculateEstimate(state);
    const answer = answerEngineeringQuestion(question, {
      entryCount: state.entries.length,
      grandTotal: result.costs.grandTotal,
      materialCost: result.costs.material,
      labourCost: result.costs.labour,
      equipmentCost: result.costs.equipment,
      warnings: result.warnings,
      topMaterials: result.materials
        .slice()
        .sort((a, b) => b.amount - a.amount)
        .map((m) => ({ name: m.name, quantity: m.quantity, unit: m.unit })),
    });
    return { answer, warnings: result.warnings };
  }
}
