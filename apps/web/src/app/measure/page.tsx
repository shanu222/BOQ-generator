'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { MODULE_DEFINITIONS } from '@boq/engine';
import { useProjectStore } from '@/store/project-store';
import { ModuleIcon } from '@/lib/module-icons';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useMemo, useState } from 'react';

export default function MeasurePage() {
  const entries = useProjectStore((s) => s.project.entries);
  const [q, setQ] = useState('');

  const grouped = useMemo(() => {
    const query = q.trim().toLowerCase();
    const mods = MODULE_DEFINITIONS.filter(
      (m) =>
        !query ||
        m.name.toLowerCase().includes(query) ||
        m.category.toLowerCase().includes(query) ||
        m.description.toLowerCase().includes(query),
    );
    const map = new Map<string, typeof mods>();
    for (const m of mods) {
      const list = map.get(m.category) ?? [];
      list.push(m);
      map.set(m.category, list);
    }
    return [...map.entries()];
  }, [q]);

  const counts = useMemo(() => {
    const c = new Map<string, number>();
    for (const e of entries) {
      c.set(e.moduleId, (c.get(e.moduleId) ?? 0) + 1);
    }
    return c;
  }, [entries]);

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-[var(--accent)]">
            Measurement
          </p>
          <h1 className="font-display mt-1 text-3xl font-semibold">Modules</h1>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">
            Manual entry · {MODULE_DEFINITIONS.length} components · or use{' '}
            <Link href="/planner" className="text-[var(--accent)] hover:underline">
              Smart House Planner
            </Link>
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button asChild variant="secondary" size="sm">
            <Link href="/planner">Smart Planner</Link>
          </Button>
          <Input
            className="max-w-xs"
            placeholder="Search modules…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
      </div>

      {grouped.map(([category, mods]) => (
        <section key={category} className="space-y-3">
          <h2 className="font-display text-sm font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">
            {category}
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {mods.map((m, i) => {
              const count = counts.get(m.id) ?? 0;
              return (
                <motion.div
                  key={m.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(i * 0.03, 0.3) }}
                >
                  <Link href={`/measure/${m.id}`}>
                    <Card className="h-full transition-all hover:border-[var(--accent)] hover:shadow-[var(--shadow)]">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--accent-muted)] text-[var(--accent)]">
                            <ModuleIcon icon={m.icon} className="h-5 w-5" />
                          </div>
                          {count > 0 && (
                            <Badge>{count} entr{count === 1 ? 'y' : 'ies'}</Badge>
                          )}
                        </div>
                        <p className="mt-3 font-medium">{m.name}</p>
                        <p className="mt-1 text-xs text-[var(--muted-foreground)] line-clamp-2">
                          {m.description}
                        </p>
                      </CardContent>
                    </Card>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        </section>
      ))}

      {grouped.length === 0 && (
        <p className="py-12 text-center text-sm text-[var(--muted-foreground)]">
          No modules match “{q}”
        </p>
      )}
    </div>
  );
}
