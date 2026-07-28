'use client';

import { useMemo } from 'react';
import type { MaterialCategory } from '@boq/shared';
import { MATERIAL_CATEGORY_LABELS } from '@boq/shared';
import { useEstimate } from '@/hooks/use-estimate';
import { formatNumber, formatPKR } from '@/lib/format';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';

export function MTOTable() {
  const estimate = useEstimate();

  const byCategory = useMemo(() => {
    const map = new Map<
      MaterialCategory,
      { qty: number; amount: number; count: number }
    >();
    for (const m of estimate.materials) {
      const cur = map.get(m.category) ?? { qty: 0, amount: 0, count: 0 };
      cur.amount += m.amount;
      cur.count += 1;
      cur.qty += m.quantity;
      map.set(m.category, cur);
    }
    return [...map.entries()].sort((a, b) => b[1].amount - a[1].amount);
  }, [estimate.materials]);

  const total = estimate.materials.reduce((s, m) => s + m.amount, 0);
  const missing = estimate.materials.filter((m) => m.missingRate || m.rate <= 0);

  if (estimate.materials.length === 0) {
    return (
      <Card>
        <CardContent className="py-16 text-center text-sm text-[var(--muted-foreground)]">
          No material takeoff yet. Add measurements to generate quantities.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {byCategory.slice(0, 4).map(([cat, stats]) => (
          <Card key={cat}>
            <CardContent className="p-4">
              <p className="text-xs text-[var(--muted-foreground)]">
                {MATERIAL_CATEGORY_LABELS[cat] ?? cat}
              </p>
              <p className="font-display mt-1 text-lg font-semibold tabular-nums">
                {formatPKR(stats.amount)}
              </p>
              <p className="text-xs text-[var(--muted-foreground)]">
                {stats.count} line{stats.count === 1 ? '' : 's'}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {missing.length > 0 && (
        <Card className="border-[color-mix(in_oklab,var(--warning)_40%,var(--border))]">
          <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4 text-sm">
            <p>
              <span className="font-medium">{missing.length} material line(s)</span> have
              missing or zero rates and contribute Rs 0 until priced.
            </p>
            <Link href="/rates" className="text-[var(--accent)] hover:underline">
              Open Pakistan Rates →
            </Link>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle>Material Takeoff</CardTitle>
            <CardDescription>Consolidated materials from all modules</CardDescription>
          </div>
          <p className="font-display text-lg font-semibold tabular-nums">
            {formatPKR(total)}
          </p>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Material</TableHead>
                <TableHead>Category</TableHead>
                <TableHead className="w-20">Unit</TableHead>
                <TableHead className="w-28 text-right">Quantity</TableHead>
                <TableHead className="w-28 text-right">Rate</TableHead>
                <TableHead className="w-32 text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {estimate.materials.map((m) => (
                <TableRow
                  key={m.id}
                  className={
                    m.missingRate || m.rate <= 0
                      ? 'bg-[color-mix(in_oklab,var(--warning)_12%,transparent)]'
                      : undefined
                  }
                >
                  <TableCell className="font-medium">
                    {m.name}
                    {(m.missingRate || m.rate <= 0) && (
                      <Badge variant="warning" className="ml-2">
                        No rate
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">
                      {MATERIAL_CATEGORY_LABELS[m.category] ?? m.category}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-[var(--muted-foreground)]">{m.unit}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatNumber(m.quantity)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-[var(--muted-foreground)]">
                    {formatPKR(m.rate, true)}
                  </TableCell>
                  <TableCell className="text-right font-medium tabular-nums">
                    {formatPKR(m.amount, true)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Category summary</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Category</TableHead>
                <TableHead className="text-right">Lines</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {byCategory.map(([cat, stats]) => (
                <TableRow key={cat}>
                  <TableCell>{MATERIAL_CATEGORY_LABELS[cat] ?? cat}</TableCell>
                  <TableCell className="text-right tabular-nums">{stats.count}</TableCell>
                  <TableCell className="text-right font-medium tabular-nums">
                    {formatPKR(stats.amount)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
