'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight, PenTool, Ruler } from 'lucide-react';
import {
  PLOT_PRESETS,
  addPlotBoundary,
  createEmptyPlan,
  customPlot,
  instantiateTemplate,
  type PlotSizeKey,
  type PlotSpec,
  type PlannerTool,
  type RoomType,
} from '@boq/geometry';
import { useProjectStore } from '@/store/project-store';
import { useEstimate } from '@/hooks/use-estimate';
import { formatPKR } from '@/lib/format';
import { PlannerCanvas, type PlannerSelection } from '@/components/planner/PlannerCanvas';
import { PlannerToolbar } from '@/components/planner/PlannerToolbar';
import { PlannerProperties } from '@/components/planner/PlannerProperties';
import { TemplateGallery } from '@/components/planner/TemplateGallery';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input, Label, Select } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

type Step = 'plot' | 'templates';

export default function PlannerPage() {
  const plan = useProjectStore((s) => s.plan);
  const setPlan = useProjectStore((s) => s.setPlan);
  const updatePlan = useProjectStore((s) => s.updatePlan);
  const clearPlan = useProjectStore((s) => s.clearPlan);
  const estimate = useEstimate();
  const [tool, setTool] = useState<PlannerTool>('select');
  const [selection, setSelection] = useState<PlannerSelection>(null);
  const [customW, setCustomW] = useState(30);
  const [customD, setCustomD] = useState(60);
  const [roomType, setRoomType] = useState<RoomType>('bedroom');
  const [step, setStep] = useState<Step>('plot');
  const [pendingPlot, setPendingPlot] = useState<{
    key: PlotSizeKey;
    plot: PlotSpec;
  } | null>(null);

  const plannerEntries = useProjectStore(
    (s) => s.project.entries.filter((e) => e.label.startsWith('[Plan]')).length,
  );

  function selectPlot(key: Exclude<PlotSizeKey, 'custom'>) {
    setPendingPlot({ key, plot: PLOT_PRESETS[key] });
    setStep('templates');
  }

  function selectCustom() {
    const plot = customPlot(customW, customD);
    setPendingPlot({ key: 'custom', plot });
    setStep('templates');
  }

  function loadTemplate(templateId: string) {
    if (!pendingPlot) return;
    const next = instantiateTemplate(templateId, pendingPlot.plot);
    if (!next) return;
    setPlan(next);
    setSelection(null);
  }

  function startBlank() {
    if (!pendingPlot) return;
    setPlan(addPlotBoundary(createEmptyPlan(pendingPlot.plot)));
    setSelection(null);
  }

  function backToPlots() {
    setStep('plot');
    setPendingPlot(null);
  }

  function changePlot() {
    clearPlan();
    setSelection(null);
    setStep('plot');
    setPendingPlot(null);
  }

  function changeTemplate() {
    if (plan) {
      setPendingPlot({ key: plan.plot.key, plot: plan.plot });
    }
    clearPlan();
    setSelection(null);
    setStep('templates');
  }

  if (!plan && step === 'templates' && pendingPlot) {
    return (
      <TemplateGallery
        plotKey={pendingPlot.key}
        plot={pendingPlot.plot}
        onBack={backToPlots}
        onSelect={loadTemplate}
        onBlank={startBlank}
      />
    );
  }

  if (!plan) {
    return (
      <div className="mx-auto max-w-5xl space-y-8">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-[var(--accent)]">
            Smart House Planner
          </p>
          <h1 className="font-display mt-1 text-3xl font-semibold sm:text-4xl">
            Draw once. Quantities forever.
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-[var(--muted-foreground)]">
            Select a plot, choose a professional house template, then edit walls and openings.
            Geometry feeds the existing BOQ engine — no AI, no OCR.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Card className="border-[color-mix(in_oklab,var(--accent)_30%,var(--border))]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PenTool className="h-4 w-4 text-[var(--accent)]" />
                Smart House Planner
              </CardTitle>
              <CardDescription>Template library → editable plan → live BOQ</CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-[var(--muted-foreground)]">
              Choose a plot size to browse professionally designed layouts.
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Ruler className="h-4 w-4" />
                Manual Measurement
              </CardTitle>
              <CardDescription>Existing workflow — unchanged</CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild variant="secondary">
                <Link href="/measure">
                  Open modules <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>

        <div>
          <h2 className="font-display mb-3 text-lg font-semibold">1 · Select plot size</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {(Object.keys(PLOT_PRESETS) as Exclude<PlotSizeKey, 'custom'>[]).map((key) => {
              const p = PLOT_PRESETS[key];
              return (
                <motion.div
                  key={key}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <Card className="h-full transition-all hover:border-[var(--accent)]">
                    <CardContent className="flex flex-col gap-3 p-4">
                      <div>
                        <p className="font-display font-semibold">{p.label}</p>
                        <p className="text-xs text-[var(--muted-foreground)]">
                          {p.widthFt}′ × {p.depthFt}′ ({p.widthM.toFixed(2)} × {p.depthM.toFixed(2)}{' '}
                          m)
                        </p>
                      </div>
                      <Button size="sm" onClick={() => selectPlot(key)}>
                        Browse templates
                      </Button>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
            <Card>
              <CardContent className="space-y-3 p-4">
                <p className="font-display font-semibold">Custom Plot</p>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label>Width (ft)</Label>
                    <Input
                      className="mt-1"
                      type="number"
                      value={customW}
                      onChange={(e) => setCustomW(Number(e.target.value) || 0)}
                    />
                  </div>
                  <div>
                    <Label>Depth (ft)</Label>
                    <Input
                      className="mt-1"
                      type="number"
                      value={customD}
                      onChange={(e) => setCustomD(Number(e.target.value) || 0)}
                    />
                  </div>
                </div>
                <Button size="sm" onClick={selectCustom}>
                  Browse templates
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-[1600px] flex-col gap-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-[var(--accent)]">
            Smart House Planner
          </p>
          <h1 className="font-display text-2xl font-semibold">{plan.name}</h1>
          <p className="text-sm text-[var(--muted-foreground)]">
            Live sync · {plannerEntries} plan measurements · {formatPKR(estimate.costs.grandTotal)}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary">{plan.plot.label}</Badge>
          <Button asChild variant="secondary" size="sm">
            <Link href="/boq">View BOQ</Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href="/mto">View MTO</Link>
          </Button>
          <Button variant="outline" size="sm" onClick={changeTemplate}>
            Change template
          </Button>
          <Button variant="ghost" size="sm" onClick={changePlot}>
            Change plot
          </Button>
        </div>
      </div>

      <PlannerToolbar tool={tool} onToolChange={setTool} />

      {tool === 'room' && (
        <div className="flex items-center gap-2">
          <Label className="shrink-0">New room type</Label>
          <Select
            className="max-w-xs"
            value={roomType}
            onChange={(e) => setRoomType(e.target.value as RoomType)}
          >
            <option value="bedroom">Bedroom</option>
            <option value="kitchen">Kitchen</option>
            <option value="washroom">Washroom</option>
            <option value="drawing-room">Drawing Room</option>
            <option value="lounge">Lounge</option>
            <option value="dining">Dining</option>
            <option value="store">Store</option>
            <option value="porch">Porch</option>
            <option value="garage">Garage</option>
            <option value="stair">Stair</option>
            <option value="other">Other</option>
          </Select>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
        <div className="h-[min(78vh,820px)] overflow-hidden rounded-xl border border-[var(--border)] shadow-sm">
          <PlannerCanvas
            plan={plan}
            tool={tool}
            onPlanChange={updatePlan}
            selection={selection}
            onSelect={setSelection}
            roomType={roomType}
          />
        </div>
        <div className="space-y-4">
          <PlannerProperties
            plan={plan}
            selection={selection}
            onPlanChange={updatePlan}
          />
          <Card>
            <CardHeader>
              <CardTitle>Live estimate</CardTitle>
              <CardDescription>Existing calculation engine</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-[var(--muted-foreground)]">Materials</span>
                <span className="tabular-nums">{formatPKR(estimate.costs.material)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--muted-foreground)]">Labour</span>
                <span className="tabular-nums">{formatPKR(estimate.costs.labour)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--muted-foreground)]">Equipment</span>
                <span className="tabular-nums">{formatPKR(estimate.costs.equipment)}</span>
              </div>
              <div className="flex justify-between border-t border-[var(--border)] pt-2 font-medium">
                <span>Grand total</span>
                <span className="tabular-nums text-[var(--accent)]">
                  {formatPKR(estimate.costs.grandTotal)}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
