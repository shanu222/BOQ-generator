/**
 * Pakistan residential coverage standards — plot sizes, floor defaults,
 * and Standard / Compact / Luxury templates.
 * Update this file to change defaults without touching calculation logic.
 */

export type PlotUnit = 'sft' | 'marla' | 'kanal';
export type CoverageTemplate = 'standard' | 'compact' | 'luxury' | 'custom';

/** Punjab / Islamabad common residential measure */
export const MARLA_TO_SFT = 225;
export const KANAL_TO_SFT = 20 * MARLA_TO_SFT; // 4,500

export interface FloorCoverage {
  ground: number;
  first: number;
  mumty: number;
}

export interface TemplateRatios {
  /** Ground floor covered ÷ plot area */
  groundCoverage: number;
  /** First floor covered ÷ ground covered (when first enabled) */
  firstToGround: number;
  /** Mumty covered ÷ ground covered (when mumty enabled) */
  mumtyToGround: number;
}

export const TEMPLATE_RATIOS: Record<Exclude<CoverageTemplate, 'custom'>, TemplateRatios> = {
  standard: {
    groundCoverage: 0.8,
    firstToGround: 1,
    mumtyToGround: 0.15,
  },
  compact: {
    groundCoverage: 0.9,
    firstToGround: 1,
    mumtyToGround: 0.12,
  },
  luxury: {
    groundCoverage: 0.65,
    firstToGround: 0.95,
    mumtyToGround: 0.18,
  },
};

export const TEMPLATE_LABELS: Record<CoverageTemplate, string> = {
  standard: 'Standard',
  compact: 'Compact',
  luxury: 'Luxury',
  custom: 'Custom',
};

/** Named plot presets with Pakistan practice defaults (sft) */
export interface PlotPreset {
  id: string;
  label: string;
  plotSft: number;
  /** Default covered areas when Standard + typical floors */
  defaults: FloorCoverage;
}

export const PLOT_PRESETS: PlotPreset[] = [
  {
    id: '3-marla',
    label: '3 Marla',
    plotSft: 3 * MARLA_TO_SFT,
    defaults: { ground: 620, first: 620, mumty: 120 },
  },
  {
    id: '5-marla',
    label: '5 Marla',
    plotSft: 5 * MARLA_TO_SFT,
    defaults: { ground: 1200, first: 1200, mumty: 180 },
  },
  {
    id: '7-marla',
    label: '7 Marla',
    plotSft: 7 * MARLA_TO_SFT,
    defaults: { ground: 1550, first: 1550, mumty: 220 },
  },
  {
    id: '10-marla',
    label: '10 Marla',
    plotSft: 10 * MARLA_TO_SFT,
    defaults: { ground: 2250, first: 2250, mumty: 280 },
  },
  {
    id: '1-kanal',
    label: '1 Kanal',
    plotSft: KANAL_TO_SFT,
    defaults: { ground: 4500, first: 4300, mumty: 450 },
  },
];

export function plotToSft(value: number, unit: PlotUnit): number {
  const v = Math.max(0, value);
  if (unit === 'marla') return Math.round(v * MARLA_TO_SFT);
  if (unit === 'kanal') return Math.round(v * KANAL_TO_SFT);
  return Math.round(v);
}

export function sftToPlotUnit(sft: number, unit: PlotUnit): number {
  if (unit === 'marla') return Math.round((sft / MARLA_TO_SFT) * 100) / 100;
  if (unit === 'kanal') return Math.round((sft / KANAL_TO_SFT) * 100) / 100;
  return Math.round(sft);
}

export function findNearestPreset(plotSft: number): PlotPreset | null {
  if (plotSft <= 0) return null;
  let best: PlotPreset | null = null;
  let bestDiff = Infinity;
  for (const p of PLOT_PRESETS) {
    const d = Math.abs(p.plotSft - plotSft);
    if (d < bestDiff) {
      bestDiff = d;
      best = p;
    }
  }
  // Only snap if within ~8% of a named size
  if (best && bestDiff / best.plotSft <= 0.08) return best;
  return null;
}

export interface CoverageInput {
  plotSft: number;
  template: CoverageTemplate;
  enableGround: boolean;
  enableFirst: boolean;
  enableMumty: boolean;
}

export interface CoverageResult {
  groundCoveredSft: number;
  firstCoveredSft: number;
  mumtyCoveredSft: number;
  openAreaSft: number;
  totalCoveredSft: number;
}

/**
 * Populate covered / open areas from plot size + template + floors.
 * Ground floor is always assumed when enableGround is true.
 */
export function applyCoverageTemplate(input: CoverageInput): CoverageResult {
  const plot = Math.max(input.plotSft, 100);
  const preset = findNearestPreset(plot);

  let ground = 0;
  let first = 0;
  let mumty = 0;

  if (input.template === 'custom' && preset) {
    // Custom still seeds from Pakistan defaults for the nearest plot size
    ground = input.enableGround ? preset.defaults.ground : 0;
    first = input.enableFirst ? preset.defaults.first : 0;
    mumty = input.enableMumty ? preset.defaults.mumty : 0;
  } else {
    const ratios =
      TEMPLATE_RATIOS[input.template === 'custom' ? 'standard' : input.template];
    if (preset && input.template === 'standard') {
      ground = input.enableGround ? preset.defaults.ground : 0;
      first = input.enableFirst ? preset.defaults.first : 0;
      mumty = input.enableMumty ? preset.defaults.mumty : 0;
    } else {
      ground = input.enableGround
        ? Math.round(plot * ratios.groundCoverage)
        : 0;
      first = input.enableFirst
        ? Math.round(ground * ratios.firstToGround)
        : 0;
      mumty = input.enableMumty
        ? Math.max(100, Math.round(ground * ratios.mumtyToGround))
        : 0;
    }
  }

  // Cap ground so open area stays non-negative
  if (ground > plot) ground = plot;
  const open = Math.max(0, plot - ground);
  const totalCovered = ground + first + mumty;

  return {
    groundCoveredSft: ground,
    firstCoveredSft: first,
    mumtyCoveredSft: mumty,
    openAreaSft: open,
    totalCoveredSft: totalCovered,
  };
}

export function totalCoveredSft(
  ground: number,
  first: number,
  mumty: number,
  floors: { ground: boolean; first: boolean; mumty: boolean },
): number {
  return (
    (floors.ground ? ground : 0) +
    (floors.first ? first : 0) +
    (floors.mumty ? mumty : 0)
  );
}

export function computeOpenArea(plotSft: number, groundCoveredSft: number): number {
  return Math.max(0, Math.round(plotSft - groundCoveredSft));
}
