import type { EngineeringWarning, MeasurementEntry, QuantityLine } from '@boq/shared';
import { num } from './constants';
import { uid } from './helpers';

/** Rule-based engineering advisor — never replaces deterministic calculations */
export function analyzeEngineering(
  entries: MeasurementEntry[],
  quantities: QuantityLine[],
): EngineeringWarning[] {
  const warnings: EngineeringWarning[] = [];

  for (const entry of entries) {
    const L = num(entry.fields.length);
    const W = num(entry.fields.width);
    const H = num(entry.fields.height, num(entry.fields.depth, num(entry.fields.thickness)));
    const Q = num(entry.fields.quantity, 1);

    if ([L, W, H].some((v) => v < 0) || Q < 0) {
      warnings.push({
        id: uid('warn'),
        severity: 'error',
        entryId: entry.id,
        moduleId: entry.moduleId,
        title: 'Negative dimension',
        message: `"${entry.label}" has a negative measurement.`,
        suggestion: 'Correct all dimensions to positive values.',
      });
    }

    if (
      (entry.moduleId === 'foundation' || entry.moduleId === 'footings' || entry.moduleId === 'excavation') &&
      H > 6
    ) {
      warnings.push({
        id: uid('warn'),
        severity: 'warning',
        entryId: entry.id,
        moduleId: entry.moduleId,
        title: 'Unusual excavation depth',
        message: `Depth of ${H}m is unusually deep for typical residential/commercial work.`,
        suggestion: 'Confirm geotechnical requirements and shoring needs.',
      });
    }

    if (entry.moduleId === 'columns') {
      const a = num(entry.fields.length);
      const b = num(entry.fields.width);
      if (a > 0 && b > 0 && (a < 0.2 || b < 0.2)) {
        warnings.push({
          id: uid('warn'),
          severity: 'warning',
          entryId: entry.id,
          moduleId: entry.moduleId,
          title: 'Slender column section',
          message: `Column section ${a}×${b}m may be below practical minimums.`,
          suggestion: 'Verify structural design; typical min. ~230×230mm for buildings.',
        });
      }
    }

    if (entry.moduleId === 'slabs') {
      const thk = num(entry.fields.thickness);
      if (thk > 0 && thk < 0.1) {
        warnings.push({
          id: uid('warn'),
          severity: 'warning',
          entryId: entry.id,
          moduleId: entry.moduleId,
          title: 'Thin slab',
          message: `Slab thickness ${thk * 1000}mm is below common residential practice (125mm+).`,
          suggestion: 'Confirm with structural drawings.',
        });
      }
    }

    if (entry.moduleId === 'staircase') {
      const rise = num(entry.fields.rise);
      const going = num(entry.fields.going);
      if (rise > 0 && going > 0) {
        const rule = 2 * rise + going;
        if (rule < 0.55 || rule > 0.7) {
          warnings.push({
            id: uid('warn'),
            severity: 'info',
            entryId: entry.id,
            moduleId: entry.moduleId,
            title: 'Stair proportion check',
            message: `2R+G = ${rule.toFixed(3)}m (preferred ~0.55–0.70m).`,
            suggestion: 'Adjust rise/going for comfortable and code-friendly stairs.',
          });
        }
      }
    }
  }

  // Duplicate detection
  const fingerprints = new Map<string, string[]>();
  for (const entry of entries) {
    const fp = `${entry.moduleId}|${JSON.stringify(entry.fields)}`;
    const list = fingerprints.get(fp) ?? [];
    list.push(entry.id);
    fingerprints.set(fp, list);
  }
  for (const [, ids] of fingerprints) {
    if (ids.length > 1) {
      warnings.push({
        id: uid('warn'),
        severity: 'warning',
        entryId: ids[0],
        title: 'Possible duplicate measurements',
        message: `${ids.length} entries share identical module and dimensions.`,
        suggestion: 'Merge duplicates or increase quantity on a single entry.',
      });
    }
  }

  // Missing common items heuristic
  const modules = new Set(entries.map((e) => e.moduleId));
  if (modules.has('masonry') && !modules.has('plaster')) {
    warnings.push({
      id: uid('warn'),
      severity: 'info',
      title: 'Missing plaster?',
      message: 'Masonry is present but no plaster measurement was found.',
      suggestion: 'Add plaster for both faces if finishes are in scope.',
    });
  }
  if ((modules.has('foundation') || modules.has('footings')) && !modules.has('columns') && !modules.has('rcc')) {
    warnings.push({
      id: uid('warn'),
      severity: 'info',
      title: 'Missing superstructure?',
      message: 'Foundations exist without columns/RCC entries.',
      suggestion: 'Add columns, beams, and slabs if the building frame is in scope.',
    });
  }

  if (quantities.length === 0 && entries.length === 0) {
    warnings.push({
      id: uid('warn'),
      severity: 'info',
      title: 'No measurements yet',
      message: 'Add component measurements to generate BOQ and material takeoff.',
    });
  }

  return warnings;
}

export function answerEngineeringQuestion(
  question: string,
  context: {
    entryCount: number;
    grandTotal: number;
    materialCost: number;
    labourCost: number;
    equipmentCost: number;
    warnings: EngineeringWarning[];
    topMaterials: { name: string; quantity: number; unit: string }[];
  },
): string {
  const q = question.toLowerCase().trim();

  if (!q) {
    return 'Ask about quantities, rate analysis, missing items, or how a calculation works.';
  }

  if (q.includes('total') || q.includes('cost') || q.includes('estimate')) {
    return [
      `Current estimate grand total is PKR ${context.grandTotal.toLocaleString('en-PK')}.`,
      `Breakdown — Materials: PKR ${context.materialCost.toLocaleString('en-PK')}, Labour: PKR ${context.labourCost.toLocaleString('en-PK')}, Equipment: PKR ${context.equipmentCost.toLocaleString('en-PK')}.`,
      'Rates and overhead factors are editable; changing them recalculates instantly.',
    ].join('\n');
  }

  if (q.includes('cement') || q.includes('steel') || q.includes('material')) {
    if (context.topMaterials.length === 0) {
      return 'No materials calculated yet. Add measurements in the Measurement modules.';
    }
    const lines = context.topMaterials
      .slice(0, 8)
      .map((m) => `• ${m.name}: ${m.quantity} ${m.unit}`)
      .join('\n');
    return `Material takeoff highlights:\n${lines}\n\nQuantities come from deterministic mix ratios (Pakistan practice). Edit unit rates in Rates to update costs.`;
  }

  if (q.includes('warning') || q.includes('issue') || q.includes('problem') || q.includes('review')) {
    if (context.warnings.length === 0) {
      return `Reviewed ${context.entryCount} measurement(s). No engineering warnings detected.`;
    }
    return (
      `Found ${context.warnings.length} note(s):\n` +
      context.warnings
        .slice(0, 6)
        .map((w) => `• [${w.severity}] ${w.title}: ${w.message}`)
        .join('\n')
    );
  }

  if (q.includes('missing') || q.includes('suggest') || q.includes('add')) {
    return [
      'Common items often missing from early estimates:',
      '• Plaster (both faces) after masonry',
      '• Paint / primer after plaster',
      '• Formwork is auto-included in RCC modules',
      '• Binding wire is auto-included with steel',
      '• DPC, skirting, and electrical/plumbing are out of structural modules — add manually via matching finishes if needed',
      '• Boundary wall coping if compound wall is in scope',
    ].join('\n');
  }

  if (q.includes('how') || q.includes('explain') || q.includes('formula') || q.includes('calculat')) {
    return [
      'Calculation principles (deterministic — AI does not invent quantities):',
      '• Excavation / concrete volume = L × W × D × Nos',
      '• Cement/sand/crush from mix ratios (e.g. 1:2:4 → ~6.4 bags cement/m³)',
      '• Steel ≈ element kg/m³ × concrete volume (or BBS: d²/162 × length × bars)',
      '• Brickwork ≈ 500 bricks/m³ + mortar',
      '• Rate analysis adds transport, waste, overhead, profit & tax on editable %',
    ].join('\n');
  }

  if (q.includes('assumption') || q.includes('exclusion') || q.includes('note')) {
    return [
      'Suggested assumptions:',
      '• Ordinary soil; no rock excavation or dewatering',
      '• Local Pakistan market rates (editable)',
      '• Lead for disposal ~50m unless noted',
      '• Structural design by others — quantities are measurement-based',
      '',
      'Suggested exclusions:',
      '• Contingencies beyond waste %',
      '• Provisional sums, utilities, landscaping',
      '• Escalation / GST unless tax % is set',
    ].join('\n');
  }

  if (q.includes('econom') || q.includes('save') || q.includes('alternative')) {
    return [
      'Economical alternatives (engineering judgment required):',
      '• Use leaner PCC 1:4:8 under footings instead of richer mixes',
      '• Prefer blockwork over brick where structural walls allow',
      '• Optimize steel via proper BBS rather than flat kg/m³ allowances',
      '• Reduce wastage with accurate openings deductions',
      '• Review overhead/profit % for competitive tenders',
    ].join('\n');
  }

  return [
    'I can help with:',
    '• Reviewing warnings and impossible dimensions',
    '• Explaining formulas and material quantities',
    '• Suggesting missing construction items',
    '• Cost / rate analysis overview',
    '• Assumptions & exclusions for reports',
    '',
    `You currently have ${context.entryCount} measurement entries and a grand total of PKR ${context.grandTotal.toLocaleString('en-PK')}.`,
  ].join('\n');
}
