'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  BOQItem,
  EquipmentRate,
  LabourRate,
  MaterialRate,
  MeasurementEntry,
  ModuleId,
  ProjectState,
  RateAnalysisFactors,
} from '@boq/shared';
import {
  applyAreaToProject,
  applyCoverageTemplate,
  computeFirstFloorCovered,
  computeOpenArea,
  createDefaultProject,
  createEntry,
  getModule,
  getOpenSpaceDefaults,
  mergeRateCatalog,
  normalizeRateFactors,
  plotToSft,
  totalCoveredSft,
  type CalculatorMode,
  type CoverageTemplate,
  type PlotUnit,
} from '@boq/engine';

const MAX_HISTORY = 50;

function cloneProject(p: ProjectState): ProjectState {
  return structuredClone(p);
}

export interface RecentReport {
  id: string;
  name: string;
  type: 'excel' | 'word' | 'pdf' | 'csv' | 'json';
  createdAt: string;
  total: number;
}

export interface CalculatorFloors {
  ground: boolean;
  first: boolean;
  mumty: boolean;
}

export interface CalculatorState {
  mode: CalculatorMode;
  /** Total covered (GF + FF + Mumty) — kept in sync */
  areaSft: number;
  costPerSft: number;
  durationMonths: number;
  calculated: boolean;
  plotValue: number;
  plotUnit: PlotUnit;
  plotAreaSft: number;
  floors: CalculatorFloors;
  groundCoveredSft: number;
  firstCoveredSft: number;
  mumtyCoveredSft: number;
  balconySft: number;
  terraceSft: number;
  openAreaSft: number;
  /** When true, open area is not auto-recomputed from plot − ground */
  openAreaManual: boolean;
  /** When true, first floor is not auto-recomputed from GF − terrace − balcony */
  firstFloorManual: boolean;
  template: CoverageTemplate;
  includeExternalWorks: boolean;
}

export interface QuotationState {
  clientName: string;
  projectName: string;
  projectAddress: string;
  notes: string;
  signatoryName: string;
}

/**
 * Recalculate derived fields:
 * Open = Plot − Ground
 * First = Ground − Terrace − Balcony (unless manually overridden)
 * Total covered = GF + FF + Mumty
 */
function syncCoveredTotals(c: CalculatorState): CalculatorState {
  const ground = c.floors.ground ? c.groundCoveredSft : 0;
  const openAreaSft = c.openAreaManual
    ? c.openAreaSft
    : computeOpenArea(c.plotAreaSft, ground);

  let firstCoveredSft = c.firstCoveredSft;
  if (c.floors.first) {
    if (!c.firstFloorManual) {
      firstCoveredSft = computeFirstFloorCovered(
        ground,
        c.terraceSft,
        c.balconySft,
      );
    }
  } else {
    firstCoveredSft = 0;
  }

  const mumty = c.floors.mumty ? c.mumtyCoveredSft : 0;
  const areaSft = totalCoveredSft(ground, firstCoveredSft, mumty, {
    ground: c.floors.ground,
    first: c.floors.first,
    mumty: c.floors.mumty,
  });

  return {
    ...c,
    firstCoveredSft,
    openAreaSft,
    areaSft,
  };
}

function seedFromPlot(
  plotValue: number,
  plotUnit: PlotUnit,
  template: CoverageTemplate,
  floors: CalculatorFloors,
): Pick<
  CalculatorState,
  | 'plotValue'
  | 'plotUnit'
  | 'plotAreaSft'
  | 'groundCoveredSft'
  | 'firstCoveredSft'
  | 'mumtyCoveredSft'
  | 'balconySft'
  | 'terraceSft'
  | 'openAreaSft'
  | 'areaSft'
  | 'openAreaManual'
  | 'firstFloorManual'
  | 'template'
  | 'floors'
> {
  const plotAreaSft = plotToSft(plotValue, plotUnit);
  const coverage = applyCoverageTemplate({
    plotSft: plotAreaSft,
    template: template === 'custom' ? 'standard' : template,
    enableGround: floors.ground,
    enableFirst: floors.first,
    enableMumty: floors.mumty,
  });
  return {
    plotValue,
    plotUnit,
    plotAreaSft,
    floors,
    groundCoveredSft: coverage.groundCoveredSft,
    firstCoveredSft: coverage.firstCoveredSft,
    mumtyCoveredSft: coverage.mumtyCoveredSft,
    balconySft: coverage.balconySft,
    terraceSft: coverage.terraceSft,
    openAreaSft: coverage.openAreaSft,
    areaSft: coverage.totalCoveredSft,
    openAreaManual: false,
    firstFloorManual: false,
    template,
  };
}

const defaultCalculator = (): CalculatorState => ({
  mode: 'advanced',
  costPerSft: 4490,
  durationMonths: 6,
  calculated: false,
  includeExternalWorks: true,
  ...seedFromPlot(5, 'marla', 'standard', {
    ground: true,
    first: false,
    mumty: false,
  }),
});

function migrateCalculator(raw: Partial<CalculatorState> | undefined): CalculatorState {
  const base = defaultCalculator();
  if (!raw) return base;
  const plotAreaSft =
    raw.plotAreaSft ??
    (typeof raw.areaSft === 'number' ? raw.areaSft : base.plotAreaSft);
  const defaults = getOpenSpaceDefaults(plotAreaSft);

  const merged: CalculatorState = {
    ...base,
    ...raw,
    floors: {
      ground: raw.floors?.ground ?? true,
      first: raw.floors?.first ?? false,
      mumty: raw.floors?.mumty ?? false,
    },
    balconySft: raw.balconySft ?? defaults.balconySft,
    terraceSft: raw.terraceSft ?? defaults.terraceSft,
    firstFloorManual: raw.firstFloorManual ?? false,
  };

  if (
    raw.plotAreaSft == null &&
    typeof raw.areaSft === 'number' &&
    raw.areaSft > 0 &&
    raw.groundCoveredSft == null
  ) {
    merged.plotValue = raw.areaSft;
    merged.plotUnit = 'sft';
    merged.plotAreaSft = raw.areaSft;
    const d = getOpenSpaceDefaults(raw.areaSft);
    merged.groundCoveredSft = d.groundCoveredSft;
    merged.balconySft = d.balconySft;
    merged.terraceSft = d.terraceSft;
    merged.firstCoveredSft = 0;
    merged.mumtyCoveredSft = 0;
    merged.openAreaSft = computeOpenArea(raw.areaSft, d.groundCoveredSft);
    merged.floors = { ground: true, first: false, mumty: false };
    merged.firstFloorManual = false;
  }

  return syncCoveredTotals(merged);
}

interface ProjectStore {
  project: ProjectState;
  calculator: CalculatorState;
  quotation: QuotationState;
  past: ProjectState[];
  future: ProjectState[];
  hydrated: boolean;
  lastSavedAt: string | null;
  recentReports: RecentReport[];
  setHydrated: (v: boolean) => void;
  pushHistory: () => void;
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
  resetProject: () => void;
  updateMeta: (
    partial: Partial<
      Pick<ProjectState, 'name' | 'location' | 'client' | 'preparedBy' | 'date'>
    >,
  ) => void;
  addEntry: (
    moduleId: ModuleId,
    fields: Record<string, number | string>,
    label?: string,
  ) => void;
  updateEntry: (id: string, patch: Partial<MeasurementEntry>) => void;
  removeEntry: (id: string) => void;
  reorderEntries: (orderedIds: string[]) => void;
  setMaterialRate: (id: string, rate: number) => void;
  setLabourRate: (id: string, rate: number) => void;
  setEquipmentRate: (id: string, rate: number) => void;
  replaceMaterialRates: (rates: MaterialRate[]) => void;
  replaceLabourRates: (rates: LabourRate[]) => void;
  replaceEquipmentRates: (rates: EquipmentRate[]) => void;
  setRateFactors: (factors: Partial<RateAnalysisFactors>) => void;
  setBoqOverride: (key: string, override: Partial<BOQItem>) => void;
  clearBoqOverride: (key: string) => void;
  setSectionOrder: (order: string[]) => void;
  touchSaved: () => void;
  addRecentReport: (report: Omit<RecentReport, 'id' | 'createdAt'>) => void;
  setCalculator: (partial: Partial<CalculatorState>) => void;
  applyPlotAndTemplate: (opts?: {
    plotValue?: number;
    plotUnit?: PlotUnit;
    template?: CoverageTemplate;
    floors?: Partial<CalculatorFloors>;
  }) => void;
  resetCalculator: () => void;
  runAreaCalculation: () => void;
  setQuotation: (partial: Partial<QuotationState>) => void;
}

function withHistory(
  set: (fn: (s: ProjectStore) => Partial<ProjectStore>) => void,
  get: () => ProjectStore,
  mutate: (project: ProjectState) => ProjectState,
) {
  const { project, past } = get();
  const nextPast = [...past, cloneProject(project)].slice(-MAX_HISTORY);
  set(() => ({
    past: nextPast,
    future: [],
    project: mutate(cloneProject(project)),
    lastSavedAt: new Date().toISOString(),
  }));
}

const defaultQuotation = (): QuotationState => ({
  clientName: '',
  projectName: '',
  projectAddress: '',
  notes: '',
  signatoryName: '',
});

export const useProjectStore = create<ProjectStore>()(
  persist(
    (set, get) => ({
      project: createDefaultProject(),
      calculator: defaultCalculator(),
      quotation: defaultQuotation(),
      past: [],
      future: [],
      hydrated: false,
      lastSavedAt: null,
      recentReports: [],

      setHydrated: (v) => set({ hydrated: v }),

      pushHistory: () => {
        const { project, past } = get();
        set({
          past: [...past, cloneProject(project)].slice(-MAX_HISTORY),
          future: [],
        });
      },

      undo: () => {
        const { past, project, future } = get();
        if (past.length === 0) return;
        const previous = past[past.length - 1];
        set({
          past: past.slice(0, -1),
          future: [cloneProject(project), ...future].slice(0, MAX_HISTORY),
          project: previous,
          lastSavedAt: new Date().toISOString(),
        });
      },

      redo: () => {
        const { past, project, future } = get();
        if (future.length === 0) return;
        const next = future[0];
        set({
          past: [...past, cloneProject(project)].slice(-MAX_HISTORY),
          future: future.slice(1),
          project: next,
          lastSavedAt: new Date().toISOString(),
        });
      },

      canUndo: () => get().past.length > 0,
      canRedo: () => get().future.length > 0,

      resetProject: () => {
        withHistory(set, get, () => createDefaultProject());
        set({ calculator: defaultCalculator(), quotation: defaultQuotation() });
      },

      updateMeta: (partial) =>
        withHistory(set, get, (p) => ({ ...p, ...partial })),

      addEntry: (moduleId, fields, label) =>
        withHistory(set, get, (p) => {
          const mod = getModule(moduleId);
          const order = p.entries.length;
          const entry = createEntry(
            moduleId,
            fields,
            label ?? `${mod?.name ?? moduleId} #${order + 1}`,
            order,
          );
          return { ...p, entries: [...p.entries, entry] };
        }),

      updateEntry: (id, patch) =>
        withHistory(set, get, (p) => ({
          ...p,
          entries: p.entries.map((e) =>
            e.id === id
              ? { ...e, ...patch, updatedAt: new Date().toISOString() }
              : e,
          ),
        })),

      removeEntry: (id) =>
        withHistory(set, get, (p) => ({
          ...p,
          entries: p.entries.filter((e) => e.id !== id),
        })),

      reorderEntries: (orderedIds) =>
        withHistory(set, get, (p) => {
          const map = new Map(p.entries.map((e) => [e.id, e]));
          const entries = orderedIds
            .map((id, i) => {
              const e = map.get(id);
              return e ? { ...e, order: i } : null;
            })
            .filter(Boolean) as MeasurementEntry[];
          return { ...p, entries };
        }),

      setMaterialRate: (id, rate) =>
        withHistory(set, get, (p) => ({
          ...p,
          materialRates: p.materialRates.map((m) =>
            m.id === id
              ? { ...m, rate, updatedAt: new Date().toISOString() }
              : m,
          ),
        })),

      setLabourRate: (id, rate) =>
        withHistory(set, get, (p) => ({
          ...p,
          labourRates: p.labourRates.map((m) =>
            m.id === id
              ? { ...m, rate, updatedAt: new Date().toISOString() }
              : m,
          ),
        })),

      setEquipmentRate: (id, rate) =>
        withHistory(set, get, (p) => ({
          ...p,
          equipmentRates: p.equipmentRates.map((m) =>
            m.id === id
              ? { ...m, rate, updatedAt: new Date().toISOString() }
              : m,
          ),
        })),

      replaceMaterialRates: (rates) =>
        withHistory(set, get, (p) => ({ ...p, materialRates: rates })),

      replaceLabourRates: (rates) =>
        withHistory(set, get, (p) => ({ ...p, labourRates: rates })),

      replaceEquipmentRates: (rates) =>
        withHistory(set, get, (p) => ({ ...p, equipmentRates: rates })),

      setRateFactors: (factors) =>
        withHistory(set, get, (p) => ({
          ...p,
          rateFactors: { ...p.rateFactors, ...factors },
        })),

      setBoqOverride: (key, override) =>
        withHistory(set, get, (p) => ({
          ...p,
          boqOverrides: {
            ...p.boqOverrides,
            [key]: { ...p.boqOverrides[key], ...override },
          },
        })),

      clearBoqOverride: (key) =>
        withHistory(set, get, (p) => {
          const next = { ...p.boqOverrides };
          delete next[key];
          return { ...p, boqOverrides: next };
        }),

      setSectionOrder: (order) =>
        withHistory(set, get, (p) => ({ ...p, sectionOrder: order })),

      touchSaved: () => set({ lastSavedAt: new Date().toISOString() }),

      addRecentReport: (report) =>
        set((s) => ({
          recentReports: [
            {
              ...report,
              id: `rpt-${Date.now()}`,
              createdAt: new Date().toISOString(),
            },
            ...s.recentReports,
          ].slice(0, 12),
        })),

      setCalculator: (partial) =>
        set((s) => {
          let next: CalculatorState = { ...s.calculator, ...partial };
          if (partial.floors) {
            next.floors = { ...s.calculator.floors, ...partial.floors };
          }

          const touchesDerived =
            partial.groundCoveredSft != null ||
            partial.balconySft != null ||
            partial.terraceSft != null ||
            partial.mumtyCoveredSft != null;

          if (touchesDerived) {
            next.template = 'custom';
            // Changing GF / balcony / terrace re-enables automatic first-floor formula
            if (
              partial.groundCoveredSft != null ||
              partial.balconySft != null ||
              partial.terraceSft != null
            ) {
              next.firstFloorManual = false;
            }
          }

          // Explicit first-floor edit locks the formula
          if (partial.firstCoveredSft != null && partial.firstFloorManual !== false) {
            next.firstFloorManual = true;
            next.template = 'custom';
          }

          if (partial.openAreaSft != null && partial.openAreaManual !== false) {
            next.openAreaManual = true;
          }

          // Enabling first floor: seed balcony/terrace from standards if zero
          if (partial.floors?.first === true && !s.calculator.floors.first) {
            const d = getOpenSpaceDefaults(next.plotAreaSft);
            if (!next.balconySft) next.balconySft = d.balconySft;
            if (!next.terraceSft) next.terraceSft = d.terraceSft;
            next.firstFloorManual = false;
          }

          // Enabling mumty: seed from standards if empty
          if (partial.floors?.mumty === true && !s.calculator.floors.mumty) {
            const d = getOpenSpaceDefaults(next.plotAreaSft);
            if (!next.mumtyCoveredSft) next.mumtyCoveredSft = d.mumtySft;
          }

          next = syncCoveredTotals(next);
          return { calculator: next };
        }),

      applyPlotAndTemplate: (opts = {}) =>
        set((s) => {
          const plotValue = opts.plotValue ?? s.calculator.plotValue;
          const plotUnit = opts.plotUnit ?? s.calculator.plotUnit;
          const floors: CalculatorFloors = {
            ...s.calculator.floors,
            ...opts.floors,
            ground: true,
          };
          const templateChanged = opts.template != null;
          const plotChanged =
            opts.plotValue != null || opts.plotUnit != null;
          const floorsChanged = opts.floors != null;

          // Preserve custom GF / balcony / terrace when only toggling floors
          if (
            s.calculator.template === 'custom' &&
            floorsChanged &&
            !templateChanged &&
            !plotChanged
          ) {
            const d = getOpenSpaceDefaults(plotToSft(plotValue, plotUnit));
            const next = syncCoveredTotals({
              ...s.calculator,
              floors,
              plotValue,
              plotUnit,
              plotAreaSft: plotToSft(plotValue, plotUnit),
              groundCoveredSft: s.calculator.groundCoveredSft,
              balconySft: s.calculator.balconySft || d.balconySft,
              terraceSft: s.calculator.terraceSft || d.terraceSft,
              mumtyCoveredSft: floors.mumty
                ? s.calculator.mumtyCoveredSft || d.mumtySft
                : 0,
              firstFloorManual: false,
              openAreaManual: false,
              template: 'custom',
              calculated: false,
            });
            return { calculator: next };
          }

          const template =
            opts.template ??
            (s.calculator.template === 'custom' && (plotChanged || floorsChanged)
              ? 'standard'
              : s.calculator.template);
          const seeded = seedFromPlot(plotValue, plotUnit, template, floors);
          return {
            calculator: {
              ...s.calculator,
              ...seeded,
              calculated: false,
            },
          };
        }),

      resetCalculator: () =>
        set({
          calculator: defaultCalculator(),
          project: {
            ...get().project,
            entries: [],
          },
        }),

      runAreaCalculation: () => {
        const { project, calculator, past } = get();
        const synced = syncCoveredTotals(calculator);
        const covered = synced.areaSft;
        const next = applyAreaToProject(project, {
          coveredAreaSft: Math.max(covered, 100),
          plotAreaSft: synced.plotAreaSft,
          openAreaSft: synced.openAreaSft,
          groundCoveredSft: synced.groundCoveredSft,
          firstCoveredSft: synced.firstCoveredSft,
          mumtyCoveredSft: synced.mumtyCoveredSft,
          balconySft: synced.balconySft,
          terraceSft: synced.terraceSft,
          includeExternalWorks: synced.includeExternalWorks,
        });
        set({
          past: [...past, cloneProject(project)].slice(-MAX_HISTORY),
          future: [],
          project: next,
          calculator: {
            ...synced,
            calculated: true,
          },
          quotation: {
            ...get().quotation,
            projectName: get().quotation.projectName || next.name,
          },
          lastSavedAt: new Date().toISOString(),
        });
      },

      setQuotation: (partial) =>
        set((s) => ({ quotation: { ...s.quotation, ...partial } })),
    }),
    {
      name: 'boq-pro-project',
      partialize: (s) => ({
        project: s.project,
        calculator: s.calculator,
        quotation: s.quotation,
        recentReports: s.recentReports,
        lastSavedAt: s.lastSavedAt,
      }),
      onRehydrateStorage: () => (state) => {
        if (state?.project) {
          state.project = mergeRateCatalog({
            ...state.project,
            rateFactors: normalizeRateFactors(state.project.rateFactors),
          });
        }
        if (state) {
          state.calculator = migrateCalculator(state.calculator);
        }
        if (state && !state.quotation) {
          state.quotation = defaultQuotation();
        }
        state?.setHydrated(true);
      },
    },
  ),
);
