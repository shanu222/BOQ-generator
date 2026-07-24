'use client';

import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import type { CostBreakdown, MaterialLine } from '@boq/shared';
import { formatPKR, formatCompact } from '@/lib/format';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const COLORS = [
  'var(--chart-1)',
  'var(--chart-2)',
  'var(--chart-3)',
  'var(--chart-4)',
  'var(--chart-5)',
];

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { value: number; name: string }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-xs shadow-md">
      {label && <p className="mb-1 font-medium">{label}</p>}
      {payload.map((p) => (
        <p key={p.name} className="tabular-nums text-[var(--muted-foreground)]">
          {p.name}: {formatPKR(p.value)}
        </p>
      ))}
    </div>
  );
}

export function CostCharts({
  costs,
  materials,
}: {
  costs: CostBreakdown;
  materials: MaterialLine[];
}) {
  const pieData = [
    { name: 'Material', value: costs.material },
    { name: 'Labour', value: costs.labour },
    { name: 'Equipment', value: costs.equipment },
  ].filter((d) => d.value > 0);

  const factorData = [
    { name: 'Transport', value: costs.transportation },
    { name: 'Loading', value: costs.loadingUnloading },
    { name: 'Waste', value: costs.waste },
    { name: 'Overhead', value: costs.overhead },
    { name: 'Profit', value: costs.contractorProfit },
    { name: 'Tax', value: costs.tax },
  ].filter((d) => d.value > 0);

  const topMats = [...materials]
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 6)
    .map((m) => ({
      name: m.name.length > 18 ? `${m.name.slice(0, 16)}…` : m.name,
      value: m.amount,
    }));

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Cost composition</CardTitle>
        </CardHeader>
        <CardContent>
          {pieData.length === 0 ? (
            <EmptyChart />
          ) : (
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={58}
                    outerRadius={84}
                    paddingAngle={3}
                    stroke="none"
                  >
                    {pieData.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<ChartTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="mt-2 flex flex-wrap justify-center gap-3 text-xs text-[var(--muted-foreground)]">
                {pieData.map((d, i) => (
                  <span key={d.name} className="inline-flex items-center gap-1.5">
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ background: COLORS[i % COLORS.length] }}
                    />
                    {d.name} ({formatCompact(d.value)})
                  </span>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Rate analysis add-ons</CardTitle>
        </CardHeader>
        <CardContent>
          {factorData.length === 0 ? (
            <EmptyChart />
          ) : (
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={factorData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tickFormatter={(v) => formatCompact(v)}
                    tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
                    axisLine={false}
                    tickLine={false}
                    width={48}
                  />
                  <Tooltip content={<ChartTooltip />} />
                  <Bar dataKey="value" name="Amount" fill="var(--chart-1)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      {topMats.length > 0 && (
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Top materials by cost</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={topMats}
                  layout="vertical"
                  margin={{ top: 0, right: 16, left: 8, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                  <XAxis
                    type="number"
                    tickFormatter={(v) => formatCompact(v)}
                    tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={120}
                    tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip content={<ChartTooltip />} />
                  <Bar dataKey="value" name="Cost" fill="var(--chart-3)" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function EmptyChart() {
  return (
    <div className="flex h-56 items-center justify-center text-sm text-[var(--muted-foreground)]">
      Add measurements to see charts
    </div>
  );
}
