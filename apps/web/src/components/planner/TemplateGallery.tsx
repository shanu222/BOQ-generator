'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Bath, BedDouble, Car, DoorOpen, Layers, ArrowUpFromLine } from 'lucide-react';
import {
  enrichTemplateCard,
  listTemplatesForPlot,
  nearestPlotKey,
  type HouseTemplateDefinition,
  type PlotSizeKey,
  type PlotSpec,
  PLOT_PRESETS,
} from '@boq/geometry';
import { TemplatePreview } from '@/components/planner/TemplatePreview';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { formatNumber, formatPKR } from '@/lib/format';

function templatesForSelection(
  plotKey: PlotSizeKey,
  plot: PlotSpec,
): HouseTemplateDefinition[] {
  if (plotKey === 'custom') {
    return listTemplatesForPlot(nearestPlotKey(plot.widthFt, plot.depthFt));
  }
  return listTemplatesForPlot(plotKey);
}

export function TemplateGallery({
  plotKey,
  plot,
  onBack,
  onSelect,
  onBlank,
}: {
  plotKey: PlotSizeKey;
  plot: PlotSpec;
  onBack: () => void;
  onSelect: (templateId: string) => void;
  onBlank: () => void;
}) {
  const cards = useMemo(() => {
    const defs = templatesForSelection(plotKey, plot);
    return defs.map((def) => enrichTemplateCard(def, plot));
  }, [plotKey, plot]);

  const plotLabel =
    plotKey === 'custom'
      ? `Custom ${plot.widthFt}′ × ${plot.depthFt}′`
      : PLOT_PRESETS[plotKey as keyof typeof PLOT_PRESETS]?.label ?? plot.label;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <button
            type="button"
            onClick={onBack}
            className="mb-3 inline-flex items-center gap-1.5 text-xs font-medium text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Change plot size
          </button>
          <p className="text-xs font-medium uppercase tracking-wider text-[var(--accent)]">
            House Template Library
          </p>
          <h1 className="font-display mt-1 text-3xl font-semibold">{plotLabel}</h1>
          <p className="mt-2 max-w-2xl text-sm text-[var(--muted-foreground)]">
            Choose a professionally designed layout. Everything loads as editable vector
            geometry — walls, rooms, doors, and windows stay fully connected to live BOQ.
          </p>
        </div>
        <Button type="button" variant="outline" onClick={onBlank}>
          Start blank plot
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {cards.map((card, i) => {
          const { definition: def, plan, stats, estimatedCost } = card;
          return (
            <motion.div
              key={def.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
            >
              <Card className="group h-full overflow-hidden transition-all hover:border-[var(--accent)]">
                <div className="relative aspect-[4/3] border-b border-[var(--border)] bg-[var(--muted)]/30 p-3">
                  <TemplatePreview plan={plan} className="h-full w-full" />
                  <div className="pointer-events-none absolute left-3 top-3">
                    <Badge variant="secondary" className="capitalize">
                      {def.style}
                    </Badge>
                  </div>
                </div>
                <CardContent className="flex flex-col gap-3 p-4">
                  <div>
                    <h2 className="font-display text-lg font-semibold leading-tight">
                      {def.name}
                    </h2>
                    <p className="mt-1 text-sm text-[var(--muted-foreground)]">{def.tagline}</p>
                  </div>

                  <div className="flex flex-wrap gap-x-3 gap-y-1.5 text-xs text-[var(--muted-foreground)]">
                    <span className="inline-flex items-center gap-1">
                      <BedDouble className="h-3.5 w-3.5" />
                      {stats.bedrooms} Bed
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Bath className="h-3.5 w-3.5" />
                      {stats.bathrooms} Bath
                    </span>
                    {stats.hasPorch && (
                      <span className="inline-flex items-center gap-1">
                        <DoorOpen className="h-3.5 w-3.5" />
                        Porch
                      </span>
                    )}
                    {stats.hasStair && (
                      <span className="inline-flex items-center gap-1">
                        <ArrowUpFromLine className="h-3.5 w-3.5" />
                        Stair
                      </span>
                    )}
                    {stats.hasGarage && (
                      <span className="inline-flex items-center gap-1">
                        <Car className="h-3.5 w-3.5" />
                        Garage
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2 rounded-md border border-[var(--border)] bg-[var(--muted)]/20 p-2.5 text-xs">
                    <div>
                      <p className="text-[var(--muted-foreground)]">Covered</p>
                      <p className="font-medium tabular-nums">
                        {formatNumber(stats.coveredAreaSft, 0)} sft
                      </p>
                    </div>
                    <div>
                      <p className="text-[var(--muted-foreground)]">Open</p>
                      <p className="font-medium tabular-nums">
                        {formatNumber(stats.openAreaSft, 0)} sft
                      </p>
                    </div>
                    <div className="col-span-2 flex items-center justify-between border-t border-[var(--border)] pt-2">
                      <span className="inline-flex items-center gap-1 text-[var(--muted-foreground)]">
                        <Layers className="h-3.5 w-3.5" />
                        Est. BOQ
                      </span>
                      <span className="font-semibold tabular-nums text-[var(--accent)]">
                        {formatPKR(estimatedCost)}
                      </span>
                    </div>
                  </div>

                  <ul className="flex flex-wrap gap-1.5">
                    {def.features.slice(0, 5).map((f) => (
                      <li
                        key={f}
                        className="rounded bg-[var(--muted)]/40 px-1.5 py-0.5 text-[10px] text-[var(--muted-foreground)]"
                      >
                        {f}
                      </li>
                    ))}
                  </ul>

                  <Button
                    type="button"
                    className="mt-1 w-full"
                    onClick={() => onSelect(def.id)}
                  >
                    Use this template
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
