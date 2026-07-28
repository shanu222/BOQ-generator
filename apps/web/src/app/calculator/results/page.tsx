'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo } from 'react';
import { buildAreaPresentation } from '@boq/engine';
import { useEstimate } from '@/hooks/use-estimate';
import { useProjectStore } from '@/store/project-store';
import { formatNumber, formatPKR } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

export default function CalculatorResultsPage() {
  const router = useRouter();
  const calculator = useProjectStore((s) => s.calculator);
  const project = useProjectStore((s) => s.project);
  const setMaterialRate = useProjectStore((s) => s.setMaterialRate);
  const hydrated = useProjectStore((s) => s.hydrated);
  const estimate = useEstimate();

  const view = useMemo(
    () =>
      buildAreaPresentation(project, estimate, {
        areaSft: calculator.areaSft,
        costPerSft: calculator.costPerSft,
        durationMonths: calculator.durationMonths,
        mode: calculator.mode,
      }),
    [project, estimate, calculator],
  );

  if (!hydrated) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-[var(--muted-foreground)]">
        Loading…
      </div>
    );
  }

  if (!calculator.calculated || project.entries.length === 0) {
    return (
      <div className="mx-auto max-w-lg space-y-4 py-16 text-center">
        <p className="text-[var(--muted-foreground)]">
          No calculation yet. Run the Construction Cost Calculator first.
        </p>
        <Button asChild>
          <Link href="/calculator">Open calculator</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 pb-16">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-[var(--accent)]">
            Results
          </p>
          <h1 className="font-display mt-1 text-3xl font-semibold">Project Summary</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => router.push('/calculator')}>
            Edit inputs
          </Button>
          <Button asChild variant="secondary">
            <Link href="/boq">Generate BOQ</Link>
          </Button>
          <Button asChild>
            <Link href="/quotation">Generate Quotation</Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-5">
            <p className="text-xs text-[var(--muted-foreground)]">Plot area</p>
            <p className="font-display mt-1 text-2xl font-semibold tabular-nums">
              {formatNumber(calculator.plotAreaSft ?? 0, 0)}{' '}
              <span className="text-sm font-normal">Sq.ft.</span>
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-xs text-[var(--muted-foreground)]">Total covered</p>
            <p className="font-display mt-1 text-2xl font-semibold tabular-nums">
              {formatNumber(view.areaSft, 0)}{' '}
              <span className="text-sm font-normal">Sq.ft.</span>
            </p>
            <p className="mt-1 text-xs text-[var(--muted-foreground)]">
              GF {formatNumber(calculator.groundCoveredSft ?? 0, 0)}
              {calculator.floors?.first
                ? ` · FF ${formatNumber(calculator.firstCoveredSft ?? 0, 0)} (−${formatNumber((calculator.terraceSft ?? 0) + (calculator.balconySft ?? 0), 0)} terrace/balcony)`
                : ''}
              {calculator.floors?.mumty
                ? ` · Mumty ${formatNumber(calculator.mumtyCoveredSft ?? 0, 0)}`
                : ''}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-xs text-[var(--muted-foreground)]">Open area</p>
            <p className="font-display mt-1 text-2xl font-semibold tabular-nums">
              {formatNumber(calculator.openAreaSft ?? 0, 0)}{' '}
              <span className="text-sm font-normal">Sq.ft.</span>
            </p>
            <p className="mt-1 text-xs text-[var(--muted-foreground)]">
              {view.durationMonths} months
            </p>
          </CardContent>
        </Card>
        <Card className="border-[color-mix(in_oklab,var(--accent)_35%,var(--border))] bg-[color-mix(in_oklab,var(--accent-muted)_50%,var(--card))]">
          <CardContent className="p-5">
            <p className="text-xs text-[var(--muted-foreground)]">Estimated Cost</p>
            <p className="font-display mt-1 text-2xl font-semibold tabular-nums">
              {formatPKR(view.estimatedCost)}
            </p>
            <p className="mt-1 text-xs text-[var(--muted-foreground)]">
              {formatPKR(
                view.areaSft > 0
                  ? Math.round(view.estimatedCost / view.areaSft)
                  : view.costPerSft,
              )}
              /sft
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Material Quantity</CardTitle>
          <CardDescription>Derived from covered area using Pakistan practice ratios</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="border-b border-[var(--border)] bg-[var(--muted)]/40 text-left text-xs text-[var(--muted-foreground)]">
              <tr>
                <th className="px-4 py-2.5">Material</th>
                <th className="px-4 py-2.5 text-right">Quantity</th>
                <th className="px-4 py-2.5">Unit</th>
              </tr>
            </thead>
            <tbody>
              {view.materials.map((m) => (
                <tr key={m.id} className="border-b border-[var(--border)]">
                  <td className="px-4 py-3 font-medium">{m.label}</td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {formatNumber(m.quantity)}
                  </td>
                  <td className="px-4 py-3 text-[var(--muted-foreground)]">{m.unit}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Material Rates</CardTitle>
          <CardDescription>Edit rates — totals update instantly</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="border-b border-[var(--border)] bg-[var(--muted)]/40 text-left text-xs text-[var(--muted-foreground)]">
              <tr>
                <th className="px-4 py-2.5">Material</th>
                <th className="px-4 py-2.5 text-right">Qty</th>
                <th className="px-4 py-2.5 text-right">Rate</th>
                <th className="px-4 py-2.5 text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {view.materials.map((m) => (
                <tr key={m.id} className="border-b border-[var(--border)]">
                  <td className="px-4 py-2.5 font-medium">{m.label}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-[var(--muted-foreground)]">
                    {formatNumber(m.quantity)} {m.unit}
                  </td>
                  <td className="px-4 py-2">
                    <Input
                      type="number"
                      className="ml-auto h-9 w-28 text-right tabular-nums"
                      value={m.rate}
                      onChange={(e) =>
                        setMaterialRate(m.id, Number(e.target.value) || 0)
                      }
                    />
                  </td>
                  <td className="px-4 py-2.5 text-right font-medium tabular-nums">
                    {formatPKR(m.amount, true)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Card className="border-[color-mix(in_oklab,var(--accent)_30%,var(--border))]">
        <CardContent className="flex items-center justify-between gap-4 p-6">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-[var(--muted-foreground)]">
              Total Material Cost
            </p>
            <p className="font-display mt-1 text-3xl font-semibold tabular-nums">
              {formatPKR(view.totalMaterialCost)}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Work Cost Summary</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="border-b border-[var(--border)] bg-[var(--muted)]/40 text-left text-xs text-[var(--muted-foreground)]">
              <tr>
                <th className="px-4 py-2.5">Work</th>
                <th className="px-4 py-2.5 text-right">Amount</th>
                <th className="px-4 py-2.5">Unit</th>
              </tr>
            </thead>
            <tbody>
              {view.works.map((w) => (
                <tr key={w.work} className="border-b border-[var(--border)]">
                  <td className="px-4 py-3">{w.work}</td>
                  <td className="px-4 py-3 text-right tabular-nums font-medium">
                    {formatPKR(w.amount, true)}
                  </td>
                  <td className="px-4 py-3 text-[var(--muted-foreground)]">{w.unit}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Labour & Material Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {(
            [
              ['Labour', view.labour],
              ['Material', view.material],
              ['Equipment', view.equipment],
              ['Contractor Profit', view.contractorProfit],
              ['Contingency', view.contingency],
            ] as const
          ).map(([label, value]) => (
            <div key={label} className="flex justify-between gap-4 border-b border-[var(--border)] py-2">
              <span className="text-[var(--muted-foreground)]">{label}</span>
              <span className="tabular-nums font-medium">{formatPKR(value)}</span>
            </div>
          ))}
          <div className="flex justify-between gap-4 pt-2 text-base font-semibold">
            <span>Grand Total</span>
            <span className="tabular-nums">{formatPKR(view.grandTotal)}</span>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-[color-mix(in_oklab,var(--accent)_12%,var(--card))]">
        <CardContent className="p-8 text-center">
          <p className="text-xs font-medium uppercase tracking-wider text-[var(--muted-foreground)]">
            Total Construction Cost
          </p>
          <p className="font-display mt-2 text-4xl font-semibold tabular-nums tracking-tight">
            {formatPKR(view.grandTotal)}
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            <Button asChild size="lg">
              <Link href="/boq">Generate BOQ</Link>
            </Button>
            <Button asChild size="lg" variant="secondary">
              <Link href="/mto">Material Takeoff</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/quotation">Generate Quotation</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/reports">Export Reports</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
