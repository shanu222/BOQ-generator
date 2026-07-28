'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight, Calculator, FileText, ClipboardList } from 'lucide-react';
import { useEstimate } from '@/hooks/use-estimate';
import { useProjectStore } from '@/store/project-store';
import { formatPKR, formatDate } from '@/lib/format';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const fade = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
};

export default function DashboardPage() {
  const estimate = useEstimate();
  const project = useProjectStore((s) => s.project);
  const calculator = useProjectStore((s) => s.calculator);
  const recentReports = useProjectStore((s) => s.recentReports);
  const hydrated = useProjectStore((s) => s.hydrated);

  if (!hydrated) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-[var(--muted-foreground)]">
        Loading project…
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <motion.div
        {...fade}
        transition={{ duration: 0.35 }}
        className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"
      >
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-[var(--accent)]">
            Dashboard
          </p>
          <h1 className="font-display mt-1 text-3xl font-semibold tracking-tight sm:text-4xl">
            {project.name}
          </h1>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">
            Pakistan residential BOQ & estimation — area-based calculator
          </p>
        </div>
        <Button asChild size="lg">
          <Link href="/calculator">
            <Calculator className="h-4 w-4" />
            Construction Cost Calculator
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </motion.div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Card>
          <CardContent className="p-5">
            <p className="text-xs text-[var(--muted-foreground)]">Covered area</p>
            <p className="font-display mt-1 text-2xl font-semibold tabular-nums">
              {calculator.calculated ? `${calculator.areaSft} Sq.ft.` : '—'}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-xs text-[var(--muted-foreground)]">BOQ items</p>
            <p className="font-display mt-1 text-2xl font-semibold tabular-nums">
              {estimate.boq.length}
            </p>
          </CardContent>
        </Card>
        <Card className="border-[color-mix(in_oklab,var(--accent)_35%,var(--border))] bg-[color-mix(in_oklab,var(--accent-muted)_50%,var(--card))]">
          <CardContent className="p-5">
            <p className="text-xs text-[var(--muted-foreground)]">Grand total</p>
            <p className="font-display mt-1 text-2xl font-semibold tabular-nums">
              {formatPKR(estimate.costs.grandTotal)}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Link href="/calculator">
          <Card className="h-full transition-all hover:border-[var(--accent)]">
            <CardContent className="flex items-start gap-3 p-5">
              <Calculator className="mt-0.5 h-5 w-5 text-[var(--accent)]" />
              <div>
                <p className="font-medium">Cost Calculator</p>
                <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                  Simple or Advanced area-based estimate
                </p>
              </div>
            </CardContent>
          </Card>
        </Link>
        <Link href="/boq">
          <Card className="h-full transition-all hover:border-[var(--accent)]">
            <CardContent className="flex items-start gap-3 p-5">
              <ClipboardList className="mt-0.5 h-5 w-5 text-[var(--accent)]" />
              <div>
                <p className="font-medium">Bill of Quantities</p>
                <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                  Review and edit BOQ lines
                </p>
              </div>
            </CardContent>
          </Card>
        </Link>
        <Link href="/reports">
          <Card className="h-full transition-all hover:border-[var(--accent)]">
            <CardContent className="flex items-start gap-3 p-5">
              <FileText className="mt-0.5 h-5 w-5 text-[var(--accent)]" />
              <div>
                <p className="font-medium">Report Center</p>
                <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                  Export Excel, Word, PDF
                </p>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent reports</CardTitle>
          <CardDescription>Exports from this browser</CardDescription>
        </CardHeader>
        <CardContent>
          {recentReports.length === 0 ? (
            <p className="text-sm text-[var(--muted-foreground)]">
              No reports yet. Calculate an estimate, then open Report Center.
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
