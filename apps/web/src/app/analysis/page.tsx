'use client';

import { useEstimate } from '@/hooks/use-estimate';
import { useProjectStore } from '@/store/project-store';
import { formatPKR } from '@/lib/format';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export default function AnalysisPage() {
  const estimate = useEstimate();
  const factors = useProjectStore((s) => s.project.rateFactors);
  const { costs } = estimate;

  const base = costs.material + costs.labour + costs.equipment;

  const rows = [
    { label: 'Materials', value: costs.material, note: 'Sum of material takeoff' },
    { label: 'Labour', value: costs.labour, note: 'Sum of labour lines' },
    { label: 'Equipment', value: costs.equipment, note: 'Sum of equipment lines' },
    {
      label: 'Transportation',
      value: costs.transportation,
      note: `${factors.transportationPercent}% of base (${formatPKR(base)})`,
    },
    {
      label: 'Loading / unloading',
      value: costs.loadingUnloading,
      note: `${factors.loadingUnloadingPercent}% of base`,
    },
    {
      label: 'Waste',
      value: costs.waste,
      note: `${factors.wastePercent}% of materials`,
    },
    {
      label: 'Overhead',
      value: costs.overhead,
      note: `${factors.overheadPercent}% after transport, loading & waste`,
    },
    {
      label: 'Contractor profit',
      value: costs.contractorProfit,
      note: `${factors.contractorProfitPercent}% after overhead`,
    },
    {
      label: 'Tax',
      value: costs.tax,
      note: `${factors.taxPercent}% of subtotal`,
    },
  ];

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <p className="text-xs font-medium uppercase tracking-wider text-[var(--accent)]">
          Rate analysis
        </p>
        <h1 className="font-display mt-1 text-3xl font-semibold">Analysis</h1>
        <p className="mt-1 text-sm text-[var(--muted-foreground)]">
          Transparent cost build-up from measurements to grand total
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Card>
          <CardContent className="p-5">
            <p className="text-xs text-[var(--muted-foreground)]">Direct costs</p>
            <p className="font-display mt-1 text-xl font-semibold tabular-nums">
              {formatPKR(base)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-xs text-[var(--muted-foreground)]">Subtotal</p>
            <p className="font-display mt-1 text-xl font-semibold tabular-nums">
              {formatPKR(costs.subtotal)}
            </p>
          </CardContent>
        </Card>
        <Card className="border-[color-mix(in_oklab,var(--accent)_35%,var(--border))] bg-[color-mix(in_oklab,var(--accent-muted)_50%,var(--card))]">
          <CardContent className="p-5">
            <p className="text-xs text-[var(--muted-foreground)]">Grand total</p>
            <p className="font-display mt-1 text-xl font-semibold tabular-nums">
              {formatPKR(costs.grandTotal)}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Breakdown</CardTitle>
          <CardDescription>
            Generated {new Date(estimate.generatedAt).toLocaleString()}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Component</TableHead>
                <TableHead>Basis</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.label}>
                  <TableCell className="font-medium">{r.label}</TableCell>
                  <TableCell className="text-xs text-[var(--muted-foreground)]">
                    {r.note}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatPKR(r.value, true)}
                  </TableCell>
                </TableRow>
              ))}
              <TableRow className="bg-[var(--muted)]/40 hover:bg-[var(--muted)]/40">
                <TableCell colSpan={2} className="font-semibold">
                  Grand total
                </TableCell>
                <TableCell className="text-right font-semibold tabular-nums">
                  {formatPKR(costs.grandTotal, true)}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
