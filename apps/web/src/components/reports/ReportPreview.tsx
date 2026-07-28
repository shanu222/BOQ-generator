'use client';

import type { ReactNode } from 'react';
import { useMemo, useState } from 'react';
import { ZoomIn, ZoomOut } from 'lucide-react';
import type { ReportContext } from '@/lib/reports/assemble';
import { formatPKR } from '@/lib/format';
import { Button } from '@/components/ui/button';

/** Live HTML preview of the report before file generation */
export function ReportPreview({ ctx }: { ctx: ReportContext }) {
  const [zoom, setZoom] = useState(1);
  const sections = useMemo(() => {
    const s = ctx.config.sections;
    const list: { id: string; title: string; body: ReactNode }[] = [];

    if (s.coverPage) {
      list.push({
        id: 'cover',
        title: 'Cover',
        body: (
          <div
            className="flex min-h-[420px] flex-col justify-between rounded-lg p-8 text-white"
            style={{ background: ctx.style.primary }}
          >
            <div>
              <p className="text-xs uppercase tracking-[0.2em] opacity-80">
                {ctx.companyName}
              </p>
              <h2 className="font-display mt-6 text-3xl font-semibold">
                Engineering Estimation Report
              </h2>
              <p className="mt-2 text-lg opacity-90">{ctx.title}</p>
            </div>
            <div className="space-y-1 text-sm opacity-95">
              <p className="text-xl font-semibold">{ctx.subtitle}</p>
              <p>Location: {ctx.project.location || '—'}</p>
              {ctx.plot.plotAreaSft > 0 && (
                <p>Plot: {Math.round(ctx.plot.plotAreaSft)} sft</p>
              )}
              {ctx.coveredAreaSft > 0 && (
                <p>Covered area: {Math.round(ctx.coveredAreaSft)} sft</p>
              )}
              {ctx.plot.openAreaSft > 0 && (
                <p>Open area: {Math.round(ctx.plot.openAreaSft)} sft</p>
              )}
              <p>
                {ctx.dateLabel} · Rev {ctx.version} · {ctx.generatedBy}
              </p>
              <p className="mt-4 text-lg font-semibold" style={{ color: ctx.style.accent }}>
                {formatPKR(ctx.estimate.costs.grandTotal)}
              </p>
            </div>
          </div>
        ),
      });
    }

    if (s.projectInfo) {
      list.push({
        id: 'project',
        title: 'Project Information',
        body: (
          <dl className="grid gap-2 text-sm sm:grid-cols-2">
            {[
              ['Project', ctx.project.name],
              ['Client', ctx.project.client || '—'],
              ['Location', ctx.project.location],
              ['Prepared by', ctx.generatedBy],
              ...(ctx.plot.plotAreaSft > 0
                ? ([['Plot area', `${Math.round(ctx.plot.plotAreaSft)} sft`]] as [
                    string,
                    string,
                  ][])
                : []),
              ...(ctx.plot.groundCoveredSft > 0
                ? ([
                    ['Ground floor', `${Math.round(ctx.plot.groundCoveredSft)} sft`],
                  ] as [string, string][])
                : []),
              ...(ctx.plot.balconySft > 0
                ? ([
                    ['Balcony', `${Math.round(ctx.plot.balconySft)} sft`],
                  ] as [string, string][])
                : []),
              ...(ctx.plot.terraceSft > 0
                ? ([
                    ['Terrace', `${Math.round(ctx.plot.terraceSft)} sft`],
                  ] as [string, string][])
                : []),
              ...(ctx.plot.firstCoveredSft > 0
                ? ([
                    ['First floor', `${Math.round(ctx.plot.firstCoveredSft)} sft`],
                  ] as [string, string][])
                : []),
              ...(ctx.plot.mumtyCoveredSft > 0
                ? ([['Mumty', `${Math.round(ctx.plot.mumtyCoveredSft)} sft`]] as [
                    string,
                    string,
                  ][])
                : []),
              ...(ctx.coveredAreaSft > 0
                ? ([
                    ['Total covered', `${Math.round(ctx.coveredAreaSft)} sft`],
                  ] as [string, string][])
                : []),
              ...(ctx.plot.openAreaSft > 0
                ? ([['Open area', `${Math.round(ctx.plot.openAreaSft)} sft`]] as [
                    string,
                    string,
                  ][])
                : []),
            ].map(([k, v]) => (
              <div key={k} className="rounded border border-[var(--border)] px-3 py-2">
                <dt className="text-xs text-[var(--muted-foreground)]">{k}</dt>
                <dd className="font-medium">{v}</dd>
              </div>
            ))}
          </dl>
        ),
      });
    }

    if (s.costSummary || s.grandTotal) {
      list.push({
        id: 'cost',
        title: 'Cost Summary',
        body: (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] text-left text-xs text-[var(--muted-foreground)]">
                <th className="py-2">Component</th>
                <th className="py-2 text-right">Amount</th>
                <th className="py-2 text-right">%</th>
              </tr>
            </thead>
            <tbody>
              {ctx.rateBreakdown
                .filter((r) => r.amount > 0)
                .map((r) => (
                  <tr key={r.label} className="border-b border-[var(--border)]/60">
                    <td className="py-1.5">{r.label}</td>
                    <td className="py-1.5 text-right tabular-nums">{formatPKR(r.amount)}</td>
                    <td className="py-1.5 text-right tabular-nums text-[var(--muted-foreground)]">
                      {r.pct.toFixed(1)}%
                    </td>
                  </tr>
                ))}
              <tr className="font-semibold">
                <td className="py-2">Grand Total</td>
                <td className="py-2 text-right tabular-nums text-[var(--accent)]">
                  {formatPKR(ctx.estimate.costs.grandTotal)}
                </td>
                <td className="py-2 text-right">100%</td>
              </tr>
            </tbody>
          </table>
        ),
      });
    }

    if (s.charts) {
      const max = Math.max(...ctx.rateBreakdown.map((r) => r.amount), 1);
      list.push({
        id: 'charts',
        title: 'Cost Distribution',
        body: (
          <div className="space-y-2">
            {ctx.rateBreakdown
              .filter((r) => r.amount > 0)
              .slice(0, 6)
              .map((r) => (
                <div
                  key={r.label}
                  className="grid grid-cols-[100px_1fr_auto] items-center gap-2 text-xs"
                >
                  <span className="truncate text-[var(--muted-foreground)]">{r.label}</span>
                  <div className="h-2 overflow-hidden rounded bg-[var(--muted)]">
                    <div
                      className="h-full rounded"
                      style={{
                        width: `${(r.amount / max) * 100}%`,
                        background: ctx.style.accent,
                      }}
                    />
                  </div>
                  <span className="tabular-nums">{formatPKR(r.amount)}</span>
                </div>
              ))}
          </div>
        ),
      });
    }

    if (s.boq) {
      list.push({
        id: 'boq',
        title: `BOQ (${ctx.estimate.boq.length} items)`,
        body: (
          <div className="max-h-64 overflow-auto">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-[var(--card)]">
                <tr className="border-b border-[var(--border)] text-left text-[var(--muted-foreground)]">
                  <th className="py-1 pr-2">Item</th>
                  <th className="py-1">Description</th>
                  <th className="py-1 text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {ctx.estimate.boq.slice(0, 40).map((b) => (
                  <tr key={b.id} className="border-b border-[var(--border)]/50">
                    <td className="py-1 pr-2 tabular-nums">{b.itemNo}</td>
                    <td className="py-1">{b.description}</td>
                    <td className="py-1 text-right tabular-nums">{formatPKR(b.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {ctx.estimate.boq.length > 40 && (
              <p className="mt-2 text-[11px] text-[var(--muted-foreground)]">
                Preview shows first 40 items — full BOQ is included in the export.
              </p>
            )}
          </div>
        ),
      });
    }

    if (s.materialTakeoff) {
      list.push({
        id: 'mto',
        title: `Material Takeoff (${ctx.estimate.materials.length})`,
        body: (
          <p className="text-sm text-[var(--muted-foreground)]">
            {ctx.estimate.materials.length} materials ·{' '}
            {formatPKR(ctx.estimate.costs.material)} material cost — full table in export.
          </p>
        ),
      });
    }

    if (s.assumptions) {
      list.push({
        id: 'assumptions',
        title: 'Assumptions',
        body: (
          <ul className="list-disc space-y-1 pl-4 text-sm text-[var(--muted-foreground)]">
            {ctx.assumptions.map((a) => (
              <li key={a}>{a}</li>
            ))}
          </ul>
        ),
      });
    }

    return list;
  }, [ctx]);

  return (
    <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--muted)]/20">
      <div className="flex items-center justify-between border-b border-[var(--border)] bg-[var(--card)] px-3 py-2">
        <p className="text-xs font-medium text-[var(--muted-foreground)]">Live preview</p>
        <div className="flex gap-1">
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => setZoom((z) => Math.max(0.7, z - 0.1))}
          >
            <ZoomOut className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => setZoom((z) => Math.min(1.4, z + 0.1))}
          >
            <ZoomIn className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <div className="max-h-[min(70vh,720px)] overflow-auto p-4">
        <div
          className="mx-auto origin-top space-y-6 transition-transform"
          style={{ transform: `scale(${zoom})`, width: `${100 / zoom}%` }}
        >
          {sections.map((sec) => (
            <section
              key={sec.id}
              className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-5 shadow-sm"
            >
              <h3
                className="font-display mb-3 text-base font-semibold"
                style={{ color: ctx.style.primary }}
              >
                {sec.title}
              </h3>
              {sec.body}
            </section>
          ))}
          {sections.length === 0 && (
            <p className="text-sm text-[var(--muted-foreground)]">
              Enable at least one section in Options to preview the report.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
