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
  computeOpenArea,
  createDefaultProject,
  createEntry,
  getModule,
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
  /** @deprecated use totalCovered — kept in sync for older UI/reports */
  areaSft: number;
  costPerSft: number;
  durationMonths: number;
  calculated: boolean;
  /** Plot size as entered by user */
  plotValue: number;
  plotUnit: PlotUnit;
  /** Cached plot area in sft */
  plotAreaSft: number;
  floors: CalculatorFloors;
  groundCoveredSft: number;
  firstCoveredSft: number;
  mumtyCoveredSft: number;
  openAreaSft: number;
  /** When true, open area is not auto-recomputed from plot − ground */
  openAreaManual: boolean;
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

function syncCoveredTotals(c: CalculatorState): CalculatorState {
  const areaSft = totalCoveredSft(
    c.groundCoveredSft,
    c.firstCoveredSft,
    c.mumtyCoveredSft,
    c.floors,
  );
  const openAreaSft = c.openAreaManual
    ? c.openAreaSft
    : computeOpenArea(c.plotAreaSft, c.floors.ground ? c.groundCoveredSft : 0);
  return { ...c, areaSft, openAreaSft };
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
  | 'openAreaSft'
  | 'areaSft'
  | 'openAreaManual'
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
    openAreaSft: coverage.openAreaSft,
    areaSft: coverage.totalCoveredSft,
    openAreaManual: false,
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
  const merged: CalculatorState = {
    ...base,
    ...raw,
    floors: {
      ground: raw.floors?.ground ?? true,
      first: raw.floors?.first ?? false,
      mumty: raw.floors?.mumty ?? false,
    },
  };
  // Legacy: only areaSft was stored
  if (
    raw.plotAreaSft == null &&
    typeof raw.areaSft === 'number' &&
    raw.areaSft > 0 &&
    raw.groundCoveredSft == null
  ) {
    merged.plotValue = raw.areaSft;
    merged.plotUnit = 'sft';
    merged.plotAreaSft = raw.areaSft;
    merged.groundCoveredSft = Math.round(raw.areaSft * 0.8);
    merged.firstCoveredSft = 0;
    merged.mumtyCoveredSft = 0;
    merged.openAreaSft = Math.max(0, raw.areaSft - merged.groundCoveredSft);
    merged.floors = { ground: true, first: false, mumty: false };
    merged.areaSft = merged.groundCoveredSft;
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
          // Editing covered areas switches to custom and may refresh open area
          if (
            partial.groundCoveredSft != null ||
            partial.firstCoveredSft != null ||
            partial.mumtyCoveredSft != null
          ) {
            next.template = 'custom';
          }
          if (partial.openAreaSft != null && partial.openAreaManual !== false) {
            next.openAreaManual = true;
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

          // Preserve custom edits when only toggling floors
          if (
            s.calculator.template === 'custom' &&
            floorsChanged &&
            !templateChanged &&
            !plotChanged
          ) {
            const coverage = applyCoverageTemplate({
              plotSft: plotToSft(plotValue, plotUnit),
              template: 'standard',
              enableGround: true,
              enableFirst: floors.first,
              enableMumty: floors.mumty,
            });
            const next = syncCoveredTotals({
              ...s.calculator,
              floors,
              plotValue,
              plotUnit,
              plotAreaSft: plotToSft(plotValue, plotUnit),
              groundCoveredSft: s.calculator.groundCoveredSft,
              firstCoveredSft: floors.first
                ? s.calculator.firstCoveredSft || coverage.firstCoveredSft
                : 0,
              mumtyCoveredSft: floors.mumty
                ? s.calculator.mumtyCoveredSft || coverage.mumtyCoveredSft
                : 0,
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
        const covered = totalCoveredSft(
          calculator.groundCoveredSft,
          calculator.firstCoveredSft,
          calculator.mumtyCoveredSft,
          calculator.floors,
        );
        const next = applyAreaToProject(project, {
          coveredAreaSft: Math.max(covered, 100),
          plotAreaSft: calculator.plotAreaSft,
          openAreaSft: calculator.openAreaSft,
          groundCoveredSft: calculator.groundCoveredSft,
          firstCoveredSft: calculator.firstCoveredSft,
          mumtyCoveredSft: calculator.mumtyCoveredSft,
          includeExternalWorks: calculator.includeExternalWorks,
        });
        set({
          past: [...past, cloneProject(project)].slice(-MAX_HISTORY),
          future: [],
          project: next,
          calculator: {
            ...calculator,
            areaSft: covered,
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
