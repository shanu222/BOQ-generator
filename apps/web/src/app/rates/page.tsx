'use client';

import { useMemo, useState } from 'react';
import { RefreshCw, Search } from 'lucide-react';
import type { MaterialCategory, MaterialRate, Unit } from '@boq/shared';
import { MATERIAL_CATEGORY_LABELS, UNIT_LABELS } from '@boq/shared';
import { createDefaultProject, mergeRateCatalog } from '@boq/engine';
import { useProjectStore } from '@/store/project-store';
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
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<string | null>(null);

  const q = search.trim().toLowerCase();

  const materials = useMemo(() => {
    return project.materialRates.filter(
      (m) =>
        !q ||
        m.name.toLowerCase().includes(q) ||
        m.id.includes(q) ||
        m.category.includes(q),
    );
  }, [project.materialRates, q]);

  const labour = useMemo(() => {
    return project.labourRates.filter(
      (m) => !q || m.name.toLowerCase().includes(q) || m.id.includes(q),
    );
  }, [project.labourRates, q]);

  const equipment = useMemo(() => {
    return project.equipmentRates.filter(
      (m) => !q || m.name.toLowerCase().includes(q) || m.id.includes(q),
    );
  }, [project.equipmentRates, q]);

  function resetDefaults() {
    const fresh = createDefaultProject();
    replaceMaterialRates(fresh.materialRates);
    replaceLabourRates(fresh.labourRates);
    replaceEquipmentRates(fresh.equipmentRates);
    setRateFactors(fresh.rateFactors);
    setStatus('Reset to default Pakistan rates.');
  }

  function mergeCatalog() {
    const merged = mergeRateCatalog(project);
    replaceMaterialRates(merged.materialRates);
    replaceLabourRates(merged.labourRates);
    replaceEquipmentRates(merged.equipmentRates);
    setStatus('Merged latest catalog (kept your rates).');
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
            Pakistan construction rates
          </p>
          <h1 className="font-display mt-1 text-3xl font-semibold">Rates</h1>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">
            Editable PKR database — changes update BOQ instantly
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={mergeCatalog}>
            Merge catalog
          </Button>
          <Button variant="outline" onClick={resetDefaults}>
            <RefreshCw className="h-4 w-4" />
            Reset defaults
          </Button>
        </div>
      </div>

      {status && <p className="text-sm text-[var(--muted-foreground)]">{status}</p>}

      <div className="flex w-fit flex-wrap gap-1 rounded-lg border border-[var(--border)] bg-[var(--card)] p-1">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`rounded-md px-3 py-1.5 text-sm ${
              tab === t.id
                ? 'bg-[var(--accent-muted)] font-medium text-[var(--accent)]'
                : 'text-[var(--muted-foreground)]'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab !== 'factors' && (
        <div className="relative max-w-md">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-[var(--muted-foreground)]" />
          <Input
            className="pl-8"
            placeholder="Search rates…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      )}

      {tab === 'materials' && (
        <Card>
          <CardHeader>
            <CardTitle>Materials</CardTitle>
            <CardDescription>
              {materials.length} of {project.materialRates.length}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Material</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Unit</TableHead>
                  <TableHead className="w-36 text-right">Rate (PKR)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {materials.map((m: MaterialRate) => (
                  <TableRow key={m.id}>
                    <TableCell>
                      <p className="font-medium">{m.name}</p>
                      <p className="text-xs text-[var(--muted-foreground)]">{m.description}</p>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {MATERIAL_CATEGORY_LABELS[m.category as MaterialCategory] ??
                          m.category}
                      </Badge>
                    </TableCell>
                    <TableCell>{UNIT_LABELS[m.unit as Unit] ?? m.unit}</TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        className="text-right tabular-nums"
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
          <CardHeader>
            <CardTitle>Labour</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Labour</TableHead>
                  <TableHead>Unit</TableHead>
                  <TableHead className="w-36 text-right">Rate (PKR)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {labour.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell>
                      <p className="font-medium">{m.name}</p>
                      <p className="text-xs text-[var(--muted-foreground)]">{m.description}</p>
                    </TableCell>
                    <TableCell>{UNIT_LABELS[m.unit] ?? m.unit}</TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        className="text-right tabular-nums"
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
          <CardHeader>
            <CardTitle>Equipment</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Equipment</TableHead>
                  <TableHead>Unit</TableHead>
                  <TableHead className="w-36 text-right">Rate (PKR)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {equipment.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell>
                      <p className="font-medium">{m.name}</p>
                      <p className="text-xs text-[var(--muted-foreground)]">{m.description}</p>
                    </TableCell>
                    <TableCell>{UNIT_LABELS[m.unit] ?? m.unit}</TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        className="text-right tabular-nums"
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
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {(
              [
                ['transportationPercent', 'Transportation %'],
                ['loadingUnloadingPercent', 'Loading / unloading %'],
                ['wastePercent', 'Waste %'],
                ['overheadPercent', 'Overhead %'],
                ['contractorProfitPercent', 'Contractor profit %'],
                ['contingencyPercent', 'Contingency %'],
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
                  value={project.rateFactors[key] ?? 0}
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
