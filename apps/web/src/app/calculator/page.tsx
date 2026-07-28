'use client';

import { useRouter } from 'next/navigation';
import { Share2 } from 'lucide-react';
import {
  AREA_ADVANCE_MATERIALS,
  DURATION_OPTIONS,
} from '@boq/engine';
import { useProjectStore } from '@/store/project-store';
import { formatPKR } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

export default function CalculatorPage() {
  const router = useRouter();
  const calculator = useProjectStore((s) => s.calculator);
  const project = useProjectStore((s) => s.project);
  const setCalculator = useProjectStore((s) => s.setCalculator);
  const resetCalculator = useProjectStore((s) => s.resetCalculator);
  const runAreaCalculation = useProjectStore((s) => s.runAreaCalculation);
  const setMaterialRate = useProjectStore((s) => s.setMaterialRate);
  const hydrated = useProjectStore((s) => s.hydrated);

  if (!hydrated) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-[var(--muted-foreground)]">
        Loading…
      </div>
    );
  }

  function calculate() {
    runAreaCalculation();
    router.push('/calculator/results');
  }

  async function share() {
    const text = `BOQ Pro estimate — ${calculator.areaSft} sft @ ${formatPKR(calculator.costPerSft)}/sft (${calculator.durationMonths} months)`;
    try {
      if (navigator.share) {
        await navigator.share({ title: 'BOQ Pro', text });
      } else {
        await navigator.clipboard.writeText(text);
        alert('Estimate summary copied to clipboard.');
      }
    } catch {
      /* user cancelled */
    }
  }

  return (
    <div className="mx-auto max-w-lg space-y-6 pb-10">
      <div className="text-center sm:text-left">
        <p className="text-xs font-medium uppercase tracking-wider text-[var(--accent)]">
          Pakistan residential
        </p>
        <h1 className="font-display mt-1 text-3xl font-semibold">
          Construction Cost Calculator
        </h1>
        <p className="mt-1 text-sm text-[var(--muted-foreground)]">
          Area-based BOQ & estimation — no drawing required
        </p>
      </div>

      <div className="flex rounded-xl border border-[var(--border)] bg-[var(--card)] p-1">
        {(['simple', 'advanced'] as const).map((mode) => (
          <button
            key={mode}
            type="button"
            onClick={() => setCalculator({ mode })}
            className={`flex-1 rounded-lg py-2.5 text-sm font-medium capitalize transition-colors ${
              calculator.mode === mode
                ? 'bg-[var(--accent)] text-[var(--accent-foreground)]'
                : 'text-[var(--muted-foreground)] hover:bg-[var(--muted)]'
            }`}
          >
            {mode}
          </button>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            {calculator.mode === 'simple' ? 'Simple estimate' : 'Advanced rates'}
          </CardTitle>
          <CardDescription>
            {calculator.mode === 'simple'
              ? 'Enter covered area, cost per square foot, and project duration.'
              : 'Same area input with editable Pakistan material rates.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="area">Construction Area (Sq.ft.)</Label>
            <Input
              id="area"
              type="number"
              min={100}
              step={1}
              className="mt-1 text-lg tabular-nums"
              value={calculator.areaSft}
              onChange={(e) =>
                setCalculator({ areaSft: Number(e.target.value) || 0 })
              }
            />
          </div>

          {calculator.mode === 'simple' && (
            <div>
              <Label htmlFor="cps">Cost per Sq.ft. (PKR)</Label>
              <Input
                id="cps"
                type="number"
                min={0}
                step={50}
                className="mt-1 text-lg tabular-nums"
                value={calculator.costPerSft}
                onChange={(e) =>
                  setCalculator({ costPerSft: Number(e.target.value) || 0 })
                }
              />
              <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                Indicative total:{' '}
                {formatPKR(calculator.areaSft * calculator.costPerSft)}
              </p>
            </div>
          )}

          {calculator.mode === 'advanced' && (
            <div className="space-y-2">
              <p className="text-xs font-medium uppercase tracking-wide text-[var(--muted-foreground)]">
                Material rates
              </p>
              <div className="overflow-hidden rounded-lg border border-[var(--border)]">
                <table className="w-full text-sm">
                  <thead className="bg-[var(--muted)]/50 text-left text-xs text-[var(--muted-foreground)]">
                    <tr>
                      <th className="px-3 py-2 font-medium">Material</th>
                      <th className="px-3 py-2 font-medium">Unit</th>
                      <th className="px-3 py-2 font-medium text-right">Rate (PKR)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {AREA_ADVANCE_MATERIALS.map((row) => {
                      const rate =
                        project.materialRates.find((m) => m.id === row.id)?.rate ?? 0;
                      return (
                        <tr key={row.id} className="border-t border-[var(--border)]">
                          <td className="px-3 py-2.5 font-medium">{row.label}</td>
                          <td className="px-3 py-2.5 text-[var(--muted-foreground)]">
                            {row.unit}
                          </td>
                          <td className="px-3 py-2">
                            <Input
                              type="number"
                              step="0.01"
                              className="h-9 text-right tabular-nums"
                              value={rate}
                              onChange={(e) =>
                                setMaterialRate(row.id, Number(e.target.value) || 0)
                              }
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div>
                <Label htmlFor="cps2">Reference cost / Sq.ft. (optional)</Label>
                <Input
                  id="cps2"
                  type="number"
                  className="mt-1"
                  value={calculator.costPerSft}
                  onChange={(e) =>
                    setCalculator({ costPerSft: Number(e.target.value) || 0 })
                  }
                />
              </div>
            </div>
          )}

          <div>
            <Label htmlFor="duration">Project Duration</Label>
            <select
              id="duration"
              className="mt-1 flex h-10 w-full rounded-md border border-[var(--border)] bg-[var(--card)] px-3 text-sm"
              value={calculator.durationMonths}
              onChange={(e) =>
                setCalculator({ durationMonths: Number(e.target.value) })
              }
            >
              {DURATION_OPTIONS.map((d) => (
                <option key={d.value} value={d.value}>
                  {d.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-2 pt-2 sm:flex-row">
            <Button className="flex-1" size="lg" onClick={calculate}>
              Calculate
            </Button>
            <Button
              variant="outline"
              size="lg"
              onClick={() => {
                resetCalculator();
              }}
            >
              Reset
            </Button>
            <Button variant="secondary" size="lg" onClick={share}>
              <Share2 className="h-4 w-4" />
              Share
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
