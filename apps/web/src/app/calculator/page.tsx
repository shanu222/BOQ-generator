'use client';

import { useRouter } from 'next/navigation';
import { Share2 } from 'lucide-react';
import {
  AREA_ADVANCE_MATERIALS,
  DURATION_OPTIONS,
  PLOT_PRESETS,
  TEMPLATE_LABELS,
  type CoverageTemplate,
} from '@boq/engine';
import { useProjectStore } from '@/store/project-store';
import { formatPKR, formatNumber } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

export default function CalculatorPage() {
  const router = useRouter();
  const calculator = useProjectStore((s) => s.calculator);
  const project = useProjectStore((s) => s.project);
  const setCalculator = useProjectStore((s) => s.setCalculator);
  const applyPlotAndTemplate = useProjectStore((s) => s.applyPlotAndTemplate);
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

  const totalCovered = calculator.areaSft;
  const previewCost =
    calculator.mode === 'simple'
      ? totalCovered * calculator.costPerSft
      : null;

  function calculate() {
    runAreaCalculation();
    router.push('/calculator/results');
  }

  async function share() {
    const text = `BOQ Pro — Plot ${formatNumber(calculator.plotAreaSft, 0)} sft · Covered ${formatNumber(totalCovered, 0)} sft · Open ${formatNumber(calculator.openAreaSft, 0)} sft`;
    try {
      if (navigator.share) {
        await navigator.share({ title: 'BOQ Pro', text });
      } else {
        await navigator.clipboard.writeText(text);
        alert('Estimate summary copied to clipboard.');
      }
    } catch {
      /* cancelled */
    }
  }

  function FloorSwitch({
    id,
    label,
    checked,
    locked,
    onChange,
  }: {
    id: string;
    label: string;
    checked: boolean;
    locked?: boolean;
    onChange: (v: boolean) => void;
  }) {
    return (
      <label
        htmlFor={id}
        className={`flex cursor-pointer items-center justify-between rounded-lg border border-[var(--border)] px-4 py-3 ${
          locked ? 'opacity-90' : ''
        }`}
      >
        <span className="text-sm font-medium">{label}</span>
        <input
          id={id}
          type="checkbox"
          className="h-4 w-4 accent-[var(--accent)]"
          checked={checked}
          disabled={locked}
          onChange={(e) => onChange(e.target.checked)}
        />
      </label>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 pb-10">
      <div className="text-center sm:text-left">
        <p className="text-xs font-medium uppercase tracking-wider text-[var(--accent)]">
          Pakistan residential
        </p>
        <h1 className="font-display mt-1 text-3xl font-semibold">
          Construction Cost Calculator
        </h1>
        <p className="mt-1 text-sm text-[var(--muted-foreground)]">
          Plot · floors · covered area · open area — professional QS workflow
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

      {/* Step 1 — Plot */}
      <Card>
        <CardHeader>
          <CardTitle>1. Plot size</CardTitle>
          <CardDescription>
            Enter plot area in Sq.ft, Marla, or Kanal (1 Marla = 225 Sq.ft)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {PLOT_PRESETS.map((p) => (
              <Button
                key={p.id}
                type="button"
                size="sm"
                variant={
                  calculator.plotAreaSft === p.plotSft ? 'default' : 'outline'
                }
                onClick={() => {
                  if (p.id === '1-kanal') {
                    applyPlotAndTemplate({
                      plotValue: 1,
                      plotUnit: 'kanal',
                      template:
                        calculator.template === 'custom'
                          ? 'standard'
                          : calculator.template,
                    });
                  } else {
                    const marlas = Number(p.id.split('-')[0]);
                    applyPlotAndTemplate({
                      plotValue: marlas,
                      plotUnit: 'marla',
                      template:
                        calculator.template === 'custom'
                          ? 'standard'
                          : calculator.template,
                    });
                  }
                }}
              >
                {p.label}
              </Button>
            ))}
          </div>
          <div className="grid gap-3 sm:grid-cols-[1fr_140px]">
            <div>
              <Label htmlFor="plot">Plot area</Label>
              <Input
                id="plot"
                type="number"
                min={0}
                step={calculator.plotUnit === 'sft' ? 1 : 0.1}
                className="mt-1 text-lg tabular-nums"
                value={calculator.plotValue}
                onChange={(e) =>
                  applyPlotAndTemplate({
                    plotValue: Number(e.target.value) || 0,
                    plotUnit: calculator.plotUnit,
                  })
                }
              />
            </div>
            <div>
              <Label htmlFor="plotUnit">Unit</Label>
              <select
                id="plotUnit"
                className="mt-1 flex h-10 w-full rounded-md border border-[var(--border)] bg-[var(--card)] px-3 text-sm"
                value={calculator.plotUnit}
                onChange={(e) =>
                  applyPlotAndTemplate({
                    plotUnit: e.target.value as 'sft' | 'marla' | 'kanal',
                  })
                }
              >
                <option value="sft">Sq.ft</option>
                <option value="marla">Marla</option>
                <option value="kanal">Kanal</option>
              </select>
            </div>
          </div>
          <p className="text-xs text-[var(--muted-foreground)]">
            = {formatNumber(calculator.plotAreaSft, 0)} Sq.ft plot
          </p>
        </CardContent>
      </Card>

      {/* Step 2 — Floors */}
      <Card>
        <CardHeader>
          <CardTitle>2. Floors to construct</CardTitle>
          <CardDescription>Ground floor is always included</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <FloorSwitch
            id="floor-gf"
            label="Ground Floor"
            checked={calculator.floors.ground}
            locked
            onChange={() => undefined}
          />
          <FloorSwitch
            id="floor-ff"
            label="First Floor"
            checked={calculator.floors.first}
            onChange={(v) =>
              applyPlotAndTemplate({
                floors: { first: v },
              })
            }
          />
          <FloorSwitch
            id="floor-mumty"
            label="Mumty"
            checked={calculator.floors.mumty}
            onChange={(v) =>
              applyPlotAndTemplate({
                floors: { mumty: v },
              })
            }
          />
        </CardContent>
      </Card>

      {/* Step 3 — Templates */}
      <Card>
        <CardHeader>
          <CardTitle>3. Coverage template</CardTitle>
          <CardDescription>
            Standard ≈80% covered · Compact ≈90% · Luxury ≈65%
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {(Object.keys(TEMPLATE_LABELS) as CoverageTemplate[]).map((t) => (
              <Button
                key={t}
                type="button"
                variant={calculator.template === t ? 'default' : 'outline'}
                onClick={() => applyPlotAndTemplate({ template: t })}
              >
                {TEMPLATE_LABELS[t]}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Step 4 — Covered areas */}
      <Card>
        <CardHeader>
          <CardTitle>4. Covered area</CardTitle>
          <CardDescription>
            Auto-filled from Pakistan standards — edit any value
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {calculator.floors.ground && (
            <div>
              <Label htmlFor="gf">Ground Floor Covered Area (Sq.ft)</Label>
              <Input
                id="gf"
                type="number"
                min={0}
                className="mt-1 text-lg tabular-nums"
                value={calculator.groundCoveredSft}
                onChange={(e) =>
                  setCalculator({
                    groundCoveredSft: Number(e.target.value) || 0,
                    openAreaManual: false,
                  })
                }
              />
            </div>
          )}
          {calculator.floors.first && (
            <div>
              <Label htmlFor="ff">First Floor Covered Area (Sq.ft)</Label>
              <Input
                id="ff"
                type="number"
                min={0}
                className="mt-1 text-lg tabular-nums"
                value={calculator.firstCoveredSft}
                onChange={(e) =>
                  setCalculator({
                    firstCoveredSft: Number(e.target.value) || 0,
                  })
                }
              />
            </div>
          )}
          {calculator.floors.mumty && (
            <div>
              <Label htmlFor="mumty">Mumty Covered Area (Sq.ft)</Label>
              <Input
                id="mumty"
                type="number"
                min={0}
                className="mt-1 text-lg tabular-nums"
                value={calculator.mumtyCoveredSft}
                onChange={(e) =>
                  setCalculator({
                    mumtyCoveredSft: Number(e.target.value) || 0,
                  })
                }
              />
            </div>
          )}
          <div className="rounded-lg bg-[var(--muted)]/40 px-4 py-3 text-sm">
            <span className="text-[var(--muted-foreground)]">Total covered area</span>
            <p className="font-display mt-0.5 text-xl font-semibold tabular-nums">
              {formatNumber(totalCovered, 0)} Sq.ft.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Step 5 — Open area */}
      <Card>
        <CardHeader>
          <CardTitle>5. Open area</CardTitle>
          <CardDescription>
            Plot − Ground Floor covered (editable). Used for external works only.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="open">Open Area (Sq.ft)</Label>
            <Input
              id="open"
              type="number"
              min={0}
              className="mt-1 text-lg tabular-nums"
              value={calculator.openAreaSft}
              onChange={(e) =>
                setCalculator({
                  openAreaSft: Number(e.target.value) || 0,
                  openAreaManual: true,
                })
              }
            />
          </div>
          <label className="flex items-center gap-3 text-sm">
            <input
              type="checkbox"
              className="h-4 w-4 accent-[var(--accent)]"
              checked={calculator.includeExternalWorks}
              onChange={(e) =>
                setCalculator({ includeExternalWorks: e.target.checked })
              }
            />
            Include external works (boundary, driveway, tanks)
          </label>
        </CardContent>
      </Card>

      {/* Duration + rates */}
      <Card>
        <CardHeader>
          <CardTitle>
            {calculator.mode === 'simple' ? 'Simple estimate' : 'Advanced rates'}
          </CardTitle>
          <CardDescription>
            {calculator.mode === 'simple'
              ? 'Cost per square foot applied to total covered area.'
              : 'Editable Pakistan material rates feed the BOQ engine.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
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
              {previewCost != null && (
                <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                  Indicative total: {formatPKR(previewCost)}
                </p>
              )}
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
                        project.materialRates.find((m) => m.id === row.id)?.rate ??
                        0;
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
