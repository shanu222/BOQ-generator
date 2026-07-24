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
import { createDefaultProject, createEntry, getModule } from '@boq/engine';
import {
  extractMeasurements,
  mergePlannerEntries,
  type PlanDocument,
} from '@boq/geometry';

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

interface ProjectStore {
  project: ProjectState;
  /** Smart House Planner geometry (null = not using planner) */
  plan: PlanDocument | null;
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
  setPlan: (plan: PlanDocument | null) => void;
  updatePlan: (mutator: (plan: PlanDocument) => PlanDocument) => void;
  clearPlan: () => void;
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

function syncPlanIntoProject(
  project: ProjectState,
  plan: PlanDocument | null,
): ProjectState {
  if (!plan) {
    return {
      ...project,
      entries: project.entries.filter((e) => !e.label.startsWith('[Plan]')),
    };
  }
  const normalized = { ...plan, dimensions: plan.dimensions ?? [] };
  const extracted = extractMeasurements(normalized);
  return {
    ...project,
    entries: mergePlannerEntries(project.entries, extracted),
    name: project.name === 'Untitled Estimate' ? plan.name : project.name,
  };
}

export const useProjectStore = create<ProjectStore>()(
  persist(
    (set, get) => ({
      project: createDefaultProject(),
      plan: null,
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
        set({ plan: null });
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
          entries: p.entries
            .filter((e) => e.id !== id)
            .map((e, i) => ({ ...e, order: i })),
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
            m.id === id ? { ...m, rate } : m,
          ),
        })),

      setLabourRate: (id, rate) =>
        withHistory(set, get, (p) => ({
          ...p,
          labourRates: p.labourRates.map((m) =>
            m.id === id ? { ...m, rate } : m,
          ),
        })),

      setEquipmentRate: (id, rate) =>
        withHistory(set, get, (p) => ({
          ...p,
          equipmentRates: p.equipmentRates.map((m) =>
            m.id === id ? { ...m, rate } : m,
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

      setPlan: (plan) => {
        const { project, past } = get();
        set({
          past: [...past, cloneProject(project)].slice(-MAX_HISTORY),
          future: [],
          plan,
          project: syncPlanIntoProject(cloneProject(project), plan),
          lastSavedAt: new Date().toISOString(),
        });
      },

      updatePlan: (mutator) => {
        const { plan, project, past } = get();
        if (!plan) return;
        const nextPlan = mutator(structuredClone(plan));
        set({
          past: [...past, cloneProject(project)].slice(-MAX_HISTORY),
          future: [],
          plan: nextPlan,
          project: syncPlanIntoProject(cloneProject(project), nextPlan),
          lastSavedAt: new Date().toISOString(),
        });
      },

      clearPlan: () => {
        get().setPlan(null);
      },
    }),
    {
      name: 'boq-pro-project',
      partialize: (s) => ({
        project: s.project,
        plan: s.plan,
        recentReports: s.recentReports,
        lastSavedAt: s.lastSavedAt,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHydrated(true);
      },
    },
  ),
);
