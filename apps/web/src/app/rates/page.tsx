'use client';

import { useState } from 'react';
import { RefreshCw, Download } from 'lucide-react';
import type { EquipmentRate, LabourRate, MaterialRate } from '@boq/shared';
import { createDefaultProject } from '@boq/engine';
import { useProjectStore } from '@/store/project-store';
import { fetchCostDatabase, isApiConfigured } from '@/lib/api';
import { formatPKR } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

type Tab = 'materials' | 'labour' | 'equipment' | 'factors';

function asMaterialRates(raw: unknown[], fallback: MaterialRate[]): MaterialRate[] {
  return raw.map((item, i) => {
    const m = item as Partial<MaterialRate>;
    const existing = fallback[i];
    return {
      id: String(m.id ?? existing?.id ?? `mat-${i}`),
      name: String(m.name ?? existing?.name ?? 'Material'),
      description: String(m.description ?? existing?.description ?? ''),
      category: m.category ?? existing?.category ?? 'other',
      unit: m.unit ?? existing?.unit ?? 'nos',
      defaultRate: Number(m.defaultRate ?? m.rate ?? existing?.defaultRate ?? 0),
      rate: Number(m.rate ?? m.defaultRate ?? existing?.rate ?? 0),
      consumptionNote: m.consumptionNote ?? existing?.consumptionNote,
    };
  });
}

function asLabourRates(raw: unknown[], fallback: LabourRate[]): LabourRate[] {
  return raw.map((item, i) => {
    const m = item as Partial<LabourRate>;
    const existing = fallback[i];
    return {
      id: String(m.id ?? existing?.id ?? `lab-${i}`),
      name: String(m.name ?? existing?.name ?? 'Labour'),
      description: String(m.description ?? existing?.description ?? ''),
      unit: m.unit ?? existing?.unit ?? 'job',
      defaultRate: Number(m.defaultRate ?? m.rate ?? existing?.defaultRate ?? 0),
      rate: Number(m.rate ?? m.defaultRate ?? existing?.rate ?? 0),
    };
  });
}

function asEquipmentRates(raw: unknown[], fallback: EquipmentRate[]): EquipmentRate[] {
  return raw.map((item, i) => {
    const m = item as Partial<EquipmentRate>;
    const existing = fallback[i];
    return {
      id: String(m.id ?? existing?.id ?? `eq-${i}`),
      name: String(m.name ?? existing?.name ?? 'Equipment'),
      description: String(m.description ?? existing?.description ?? ''),
      unit: m.unit ?? existing?.unit ?? 'job',
      defaultRate: Number(m.defaultRate ?? m.rate ?? existing?.defaultRate ?? 0),
      rate: Number(m.rate ?? m.defaultRate ?? existing?.rate ?? 0),
    };
  });
}

export default function RatesPage() {
  const project = useProjectStore((s) => s.project);
  const setMaterialRate = useProjectStore((s) => s.setMaterialRate);
  const setLabourRate = useProjectStore((s) => s.setLabourRate);
  const setEquipmentRate = useProjectStore((s) => s.setEquipmentRate);
  const setRateFactors = useProjectStore((s) => s.setRateFactors);
  const replaceMaterialRates = useProjectStore((s) => s.replaceMaterialRates);
  const replaceLabourRates = useProjectStore((s) => s.replaceLabourRates);
  const replaceEquipmentRates = useProjectStore((s) => s.replaceEquipmentRates);
  const [tab, setTab] = useState<Tab>('materials');
  const [syncStatus, setSyncStatus] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);

  async function syncFromApi() {
    setSyncing(true);
    setSyncStatus(null);
    if (!isApiConfigured()) {
      setSyncStatus(
        'API URL not set — using local engine defaults. Set NEXT_PUBLIC_API_URL on the web project to enable sync.',
      );
      setSyncing(false);
      return;
    }
    const data = await fetchCostDatabase();
    if (!data) {
      setSyncStatus(
        'Could not reach the cost-database API (network, CORS, or timeout). Using local engine defaults.',
      );
      setSyncing(false);
      return;
    }
    try {
      if (Array.isArray(data.materials) && data.materials.length) {
        replaceMaterialRates(asMaterialRates(data.materials, project.materialRates));
      }
      if (Array.isArray(data.labour) && data.labour.length) {
        replaceLabourRates(asLabourRates(data.labour, project.labourRates));
      }
      if (Array.isArray(data.equipment) && data.equipment.length) {
        replaceEquipmentRates(asEquipmentRates(data.equipment, project.equipmentRates));
      }
      setSyncStatus('Synced rates from API.');
    } catch {
      setSyncStatus('Could not parse API response.');
    }
    setSyncing(false);
  }

  function resetDefaults() {
    const fresh = createDefaultProject();
    replaceMaterialRates(fresh.materialRates);
    replaceLabourRates(fresh.labourRates);
    replaceEquipmentRates(fresh.equipmentRates);
    setRateFactors(fresh.rateFactors);
    setSyncStatus('Reset to engine defaults.');
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: 'materials', label: 'Materials' },
    { id: 'labour', label: 'Labour' },
    { id: 'equipment', label: 'Equipment' },
    { id: 'factors', label: 'Factors' },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-[var(--accent)]">
            Cost database
          </p>
          <h1 className="font-display mt-1 text-3xl font-semibold">Rates</h1>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">
            Edit unit rates and rate-analysis factors (PKR)
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={syncFromApi} disabled={syncing}>
            <Download className="h-4 w-4" />
            Sync API
          </Button>
          <Button variant="outline" onClick={resetDefaults}>
            <RefreshCw className="h-4 w-4" />
            Reset defaults
          </Button>
        </div>
      </div>

      {syncStatus && (
        <p className="text-sm text-[var(--muted-foreground)]">{syncStatus}</p>
      )}

      <div className="flex w-fit flex-wrap gap-1 rounded-lg border border-[var(--border)] bg-[var(--card)] p-1">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`rounded-md px-3 py-1.5 text-sm transition-colors ${
              tab === t.id
                ? 'bg-[var(--accent)] text-[var(--accent-foreground)]'
                : 'text-[var(--muted-foreground)] hover:bg-[var(--muted)]'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'materials' && (
        <Card>
          <CardHeader>
            <CardTitle>Material rates</CardTitle>
            <CardDescription>
              {project.materialRates.length} items · defaults shown for reference
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Material</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Unit</TableHead>
                  <TableHead className="text-right">Default</TableHead>
                  <TableHead className="w-36 text-right">Rate (PKR)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {project.materialRates.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell>
                      <p className="font-medium">{m.name}</p>
                      <p className="text-xs text-[var(--muted-foreground)]">
                        {m.description}
                      </p>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{m.category}</Badge>
                    </TableCell>
                    <TableCell>{m.unit}</TableCell>
                    <TableCell className="text-right tabular-nums text-[var(--muted-foreground)]">
                      {formatPKR(m.defaultRate, true)}
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        className="h-8 text-right tabular-nums"
                        value={m.rate}
                        onChange={(e) =>
                          setMaterialRate(m.id, Number(e.target.value) || 0)
                        }
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {tab === 'labour' && (
        <Card>
          <CardContent className="p-0 pt-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Labour</TableHead>
                  <TableHead>Unit</TableHead>
                  <TableHead className="text-right">Default</TableHead>
                  <TableHead className="w-36 text-right">Rate</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {project.labourRates.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell>
                      <p className="font-medium">{m.name}</p>
                      <p className="text-xs text-[var(--muted-foreground)]">
                        {m.description}
                      </p>
                    </TableCell>
                    <TableCell>{m.unit}</TableCell>
                    <TableCell className="text-right tabular-nums text-[var(--muted-foreground)]">
                      {formatPKR(m.defaultRate, true)}
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        className="h-8 text-right"
                        value={m.rate}
                        onChange={(e) =>
                          setLabourRate(m.id, Number(e.target.value) || 0)
                        }
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {tab === 'equipment' && (
        <Card>
          <CardContent className="p-0 pt-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Equipment</TableHead>
                  <TableHead>Unit</TableHead>
                  <TableHead className="text-right">Default</TableHead>
                  <TableHead className="w-36 text-right">Rate</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {project.equipmentRates.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell>
                      <p className="font-medium">{m.name}</p>
                      <p className="text-xs text-[var(--muted-foreground)]">
                        {m.description}
                      </p>
                    </TableCell>
                    <TableCell>{m.unit}</TableCell>
                    <TableCell className="text-right tabular-nums text-[var(--muted-foreground)]">
                      {formatPKR(m.defaultRate, true)}
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        className="h-8 text-right"
                        value={m.rate}
                        onChange={(e) =>
                          setEquipmentRate(m.id, Number(e.target.value) || 0)
                        }
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {tab === 'factors' && (
        <Card>
          <CardHeader>
            <CardTitle>Rate analysis factors</CardTitle>
            <CardDescription>Percentages applied in cost breakdown</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {(
              [
                ['transportationPercent', 'Transportation %'],
                ['loadingUnloadingPercent', 'Loading / unloading %'],
                ['wastePercent', 'Waste %'],
                ['overheadPercent', 'Overhead %'],
                ['contractorProfitPercent', 'Contractor profit %'],
                ['taxPercent', 'Tax / GST %'],
              ] as const
            ).map(([key, label]) => (
              <div key={key}>
                <Label htmlFor={key}>{label}</Label>
                <Input
                  id={key}
                  type="number"
                  step="0.1"
                  className="mt-1"
                  value={project.rateFactors[key]}
                  onChange={(e) =>
                    setRateFactors({ [key]: Number(e.target.value) || 0 })
                  }
                />
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
