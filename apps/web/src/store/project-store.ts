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
  createDefaultProject,
  createEntry,
  getModule,
  mergeRateCatalog,
  normalizeRateFactors,
  type CalculatorMode,
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

export interface CalculatorState {
  mode: CalculatorMode;
  areaSft: number;
  costPerSft: number;
  durationMonths: number;
  calculated: boolean;
}

export interface QuotationState {
  clientName: string;
  projectName: string;
  projectAddress: string;
  notes: string;
  signatoryName: string;
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

const defaultCalculator = (): CalculatorState => ({
  mode: 'advanced',
  areaSft: 2025,
  costPerSft: 4490,
  durationMonths: 6,
  calculated: false,
});

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
        set((s) => ({ calculator: { ...s.calculator, ...partial } })),

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
        const next = applyAreaToProject(project, calculator.areaSft);
        set({
          past: [...past, cloneProject(project)].slice(-MAX_HISTORY),
          future: [],
          project: next,
          calculator: { ...calculator, calculated: true },
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
        if (state && !state.calculator) {
          state.calculator = defaultCalculator();
        }
        if (state && !state.quotation) {
          state.quotation = defaultQuotation();
        }
        state?.setHydrated(true);
      },
    },
  ),
);
