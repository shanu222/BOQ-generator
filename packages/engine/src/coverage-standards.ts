/**
 * Pakistan residential coverage standards.
 * 1 Marla = 225 sq.ft. · 1 Kanal = 20 Marla = 4,500 sq.ft.
 *
 * First floor never equals ground floor:
 *   First = Ground − Terrace − Balcony
 *
 * Edit this file to maintain defaults without changing calculator logic.
 */

export type PlotUnit = 'sft' | 'marla' | 'kanal';
export type CoverageTemplate = 'standard' | 'compact' | 'luxury' | 'custom';

export const MARLA_TO_SFT = 225;
export const KANAL_TO_SFT = 20 * MARLA_TO_SFT; // 4,500

export interface OpenSpaceDefaults {
  /** Typical balcony area deducted from first floor (sft) */
  balconySft: number;
  /** Typical terrace area deducted from first floor (sft) */
  terraceSft: number;
  /** Suggested mumty area (sft) */
  mumtySft: number;
  /** Default ground floor covered area (sft) */
  groundCoveredSft: number;
}

export interface TemplateRatios {
  /** Ground floor covered ÷ plot area (when no named preset ground) */
  groundCoverage: number;
}

export const TEMPLATE_RATIOS: Record<Exclude<CoverageTemplate, 'custom'>, TemplateRatios> = {
  standard: { groundCoverage: 0.89 },
  compact: { groundCoverage: 0.95 },
  luxury: { groundCoverage: 0.7 },
};

export const TEMPLATE_LABELS: Record<CoverageTemplate, string> = {
  standard: 'Standard',
  compact: 'Compact',
  luxury: 'Luxury',
  custom: 'Custom',
};

export interface PlotPreset {
  id: string;
  label: string;
  plotSft: number;
  standards: OpenSpaceDefaults;
}

/**
 * Named plot presets — Pakistan practice defaults (all values in sq.ft.).
 * Ground covered is intentionally less than plot (open area remains).
 */
export const PLOT_PRESETS: PlotPreset[] = [
  {
    id: '3-marla',
    label: '3 Marla',
    plotSft: 3 * MARLA_TO_SFT, // 675
    standards: {
      groundCoveredSft: 600,
      balconySft: 25,
      terraceSft: 50,
      mumtySft: 80,
    },
  },
  {
    id: '5-marla',
    label: '5 Marla',
    plotSft: 5 * MARLA_TO_SFT, // 1,125
    standards: {
      groundCoveredSft: 1000,
      balconySft: 40,
      terraceSft: 100,
      mumtySft: 120,
    },
  },
  {
    id: '7-marla',
    label: '7 Marla',
    plotSft: 7 * MARLA_TO_SFT, // 1,575
    standards: {
      groundCoveredSft: 1400,
      balconySft: 50,
      terraceSft: 120,
      mumtySft: 150,
    },
  },
  {
    id: '10-marla',
    label: '10 Marla',
    plotSft: 10 * MARLA_TO_SFT, // 2,250
    standards: {
      groundCoveredSft: 2000,
      balconySft: 60,
      terraceSft: 150,
      mumtySft: 180,
    },
  },
  {
    id: '1-kanal',
    label: '1 Kanal',
    plotSft: KANAL_TO_SFT, // 4,500
    standards: {
      groundCoveredSft: 4000,
      balconySft: 100,
      terraceSft: 300,
      mumtySft: 250,
    },
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
  if (best && bestDiff / best.plotSft <= 0.08) return best;
  return null;
}

export function getOpenSpaceDefaults(plotSft: number): OpenSpaceDefaults {
  const preset = findNearestPreset(plotSft);
  if (preset) return { ...preset.standards };
  // Interpolate-ish fallback for custom plot sizes
  const scale = plotSft / (5 * MARLA_TO_SFT);
  return {
    groundCoveredSft: Math.round(Math.min(plotSft * 0.89, plotSft - 50)),
    balconySft: Math.max(20, Math.round(40 * scale)),
    terraceSft: Math.max(40, Math.round(100 * scale)),
    mumtySft: Math.max(60, Math.round(120 * scale)),
  };
}

/** First floor covered = ground − terrace − balcony (never equals ground). */
export function computeFirstFloorCovered(
  groundCoveredSft: number,
  terraceSft: number,
  balconySft: number,
): number {
  return Math.max(0, Math.round(groundCoveredSft - terraceSft - balconySft));
}

export function computeOpenArea(plotSft: number, groundCoveredSft: number): number {
  return Math.max(0, Math.round(plotSft - groundCoveredSft));
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
  balconySft: number;
  terraceSft: number;
  openAreaSft: number;
  totalCoveredSft: number;
}

/**
 * Seed covered / open / balcony / terrace from plot + template + floors.
 */
export function applyCoverageTemplate(input: CoverageInput): CoverageResult {
  const plot = Math.max(input.plotSft, 100);
  const defaults = getOpenSpaceDefaults(plot);
  const ratios =
    TEMPLATE_RATIOS[input.template === 'custom' ? 'standard' : input.template];

  let ground = 0;
  if (input.enableGround) {
    if (input.template === 'standard' || input.template === 'custom') {
      ground = defaults.groundCoveredSft;
    } else {
      ground = Math.round(plot * ratios.groundCoverage);
    }
  }
  if (ground > plot) ground = plot;

  const balcony = defaults.balconySft;
  const terrace = defaults.terraceSft;
  const first = input.enableFirst
    ? computeFirstFloorCovered(ground, terrace, balcony)
    : 0;
  const mumty = input.enableMumty ? defaults.mumtySft : 0;
  const open = computeOpenArea(plot, ground);
  const totalCovered = ground + first + mumty;

  return {
    groundCoveredSft: ground,
    firstCoveredSft: first,
    mumtyCoveredSft: mumty,
    balconySft: balcony,
    terraceSft: terrace,
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
