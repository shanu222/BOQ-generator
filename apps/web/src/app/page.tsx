'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight, AlertTriangle, FileText } from 'lucide-react';
import { MODULE_DEFINITIONS } from '@boq/engine';
import { useEstimate } from '@/hooks/use-estimate';
import { useProjectStore } from '@/store/project-store';
import { formatPKR, formatDate, formatNumber } from '@/lib/format';
import { CostCharts } from '@/components/charts/CostCharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/input';
import { ModuleIcon } from '@/lib/module-icons';

const fade = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
};

export default function DashboardPage() {
  const estimate = useEstimate();
  const project = useProjectStore((s) => s.project);
  const updateMeta = useProjectStore((s) => s.updateMeta);
  const recentReports = useProjectStore((s) => s.recentReports);
  const hydrated = useProjectStore((s) => s.hydrated);

  const entryCounts = MODULE_DEFINITIONS.map((m) => ({
    ...m,
    count: project.entries.filter((e) => e.moduleId === m.id).length,
  }))
    .filter((m) => m.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);

  const quickModules = MODULE_DEFINITIONS.filter((m) =>
    ['excavation', 'rcc', 'masonry', 'plaster', 'paint', 'steel-bbs'].includes(m.id),
  );

  if (!hydrated) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-[var(--muted-foreground)]">
        Loading project…
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <motion.div
        {...fade}
        transition={{ duration: 0.35 }}
        className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"
      >
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-[var(--accent)]">
            Engineering dashboard
          </p>
          <h1 className="font-display mt-1 text-3xl font-semibold tracking-tight sm:text-4xl">
            {project.name}
          </h1>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">
            Instant client-side estimates · Pakistan market rates
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="secondary">
            <Link href="/planner">Smart Planner</Link>
          </Button>
          <Button asChild variant="secondary">
            <Link href="/measure">
              Measure <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          <Button asChild>
            <Link href="/reports">Report Center</Link>
          </Button>
        </div>
      </motion.div>

      <motion.div
        {...fade}
        transition={{ duration: 0.4, delay: 0.05 }}
        className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
      >
        {[
          { label: 'Grand total', value: estimate.costs.grandTotal, accent: true },
          { label: 'Materials', value: estimate.costs.material },
          { label: 'Labour', value: estimate.costs.labour },
          { label: 'Equipment', value: estimate.costs.equipment },
        ].map((stat) => (
          <Card
            key={stat.label}
            className={
              stat.accent
                ? 'border-[color-mix(in_oklab,var(--accent)_35%,var(--border))] bg-[color-mix(in_oklab,var(--accent-muted)_55%,var(--card))]'
                : undefined
            }
          >
            <CardContent className="p-5">
              <p className="text-xs font-medium uppercase tracking-wide text-[var(--muted-foreground)]">
                {stat.label}
              </p>
              <p className="font-display mt-2 text-2xl font-semibold tabular-nums">
                {formatPKR(stat.value)}
              </p>
            </CardContent>
          </Card>
        ))}
      </motion.div>

      <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
        <CostCharts costs={estimate.costs} materials={estimate.materials} />

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Project info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {(
                [
                  ['name', 'Project name'],
                  ['client', 'Client'],
                  ['location', 'Location'],
                  ['preparedBy', 'Prepared by'],
                  ['date', 'Date'],
                ] as const
              ).map(([key, label]) => (
                <div key={key}>
                  <Label htmlFor={key}>{label}</Label>
                  <Input
                    id={key}
                    className="mt-1"
                    type={key === 'date' ? 'date' : 'text'}
                    value={project[key]}
                    onChange={(e) => updateMeta({ [key]: e.target.value })}
                  />
                </div>
              ))}
            </CardContent>
          </Card>

          {estimate.warnings.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-[var(--warning)]" />
                  Warnings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {estimate.warnings.slice(0, 5).map((w) => (
                  <div key={w.id} className="rounded-lg bg-[var(--muted)]/50 p-3 text-xs">
                    <Badge
                      variant={
                        w.severity === 'error'
                          ? 'danger'
                          : w.severity === 'warning'
                            ? 'warning'
                            : 'secondary'
                      }
                    >
                      {w.severity}
                    </Badge>
                    <p className="mt-1 font-medium">{w.title}</p>
                    <p className="text-[var(--muted-foreground)]">{w.message}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>BOQ snapshot</CardTitle>
            <CardDescription>
              {estimate.boq.length} items · {formatPKR(estimate.boq.reduce((s, b) => s + b.amount, 0))}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {estimate.boq.slice(0, 6).map((b) => (
              <div key={b.id} className="flex items-center justify-between gap-3 text-sm">
                <span className="truncate">
                  <span className="mr-2 text-[var(--muted-foreground)]">{b.itemNo}</span>
                  {b.description}
                </span>
                <span className="shrink-0 tabular-nums">{formatPKR(b.amount)}</span>
              </div>
            ))}
            {estimate.boq.length === 0 && (
              <p className="text-sm text-[var(--muted-foreground)]">No BOQ lines yet.</p>
            )}
            <Button asChild variant="outline" className="mt-2 w-full">
              <Link href="/boq">Open full BOQ</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>MTO snapshot</CardTitle>
            <CardDescription>
              {estimate.materials.length} materials ·{' '}
              {formatNumber(estimate.materials.reduce((s, m) => s + m.quantity, 0), 1)} total units
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {estimate.materials.slice(0, 6).map((m) => (
              <div key={m.id} className="flex items-center justify-between gap-3 text-sm">
                <span className="truncate">{m.name}</span>
                <span className="shrink-0 tabular-nums text-[var(--muted-foreground)]">
                  {formatNumber(m.quantity)} {m.unit}
                </span>
              </div>
            ))}
            {estimate.materials.length === 0 && (
              <p className="text-sm text-[var(--muted-foreground)]">No materials yet.</p>
            )}
            <Button asChild variant="outline" className="mt-2 w-full">
              <Link href="/mto">Open material takeoff</Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold">Quick calculate</h2>
          <Link
            href="/measure"
            className="text-sm text-[var(--accent)] hover:underline"
          >
            All modules
          </Link>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {quickModules.map((m, i) => (
            <motion.div
              key={m.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.04 * i }}
            >
              <Link href={`/measure/${m.id}`}>
                <Card className="h-full transition-all hover:border-[var(--accent)] hover:shadow-[var(--shadow)]">
                  <CardContent className="flex items-start gap-3 p-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--accent-muted)] text-[var(--accent)]">
                      <ModuleIcon icon={m.icon} className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-medium">{m.name}</p>
                      <p className="mt-0.5 text-xs text-[var(--muted-foreground)] line-clamp-2">
                        {m.description}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>

      {entryCounts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Active modules</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {entryCounts.map((m) => (
              <Link key={m.id} href={`/measure/${m.id}`}>
                <Badge variant="outline" className="gap-1.5 py-1">
                  <ModuleIcon icon={m.icon} className="h-3 w-3" />
                  {m.name}
                  <span className="text-[var(--muted-foreground)]">×{m.count}</span>
                </Badge>
              </Link>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Recent reports
          </CardTitle>
          <CardDescription>Exports from this browser session</CardDescription>
        </CardHeader>
        <CardContent>
          {recentReports.length === 0 ? (
            <p className="text-sm text-[var(--muted-foreground)]">
              No reports yet. Open Report Center to generate.
            </p>
          ) : (
            <ul className="divide-y divide-[var(--border)]">
              {recentReports.map((r) => (
                <li
                  key={r.id}
                  className="flex items-center justify-between gap-3 py-3 text-sm"
                >
                  <div>
                    <p className="font-medium">{r.name}</p>
                    <p className="text-xs text-[var(--muted-foreground)]">
                      {r.type.toUpperCase()} · {formatDate(r.createdAt)}
                    </p>
                  </div>
                  <span className="tabular-nums text-[var(--muted-foreground)]">
                    {formatPKR(r.total)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
