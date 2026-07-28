'use client';

import Link from 'next/link';
import { useProjectStore } from '@/store/project-store';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

export default function SettingsPage() {
  const project = useProjectStore((s) => s.project);
  const updateMeta = useProjectStore((s) => s.updateMeta);
  const resetProject = useProjectStore((s) => s.resetProject);
  const resetCalculator = useProjectStore((s) => s.resetCalculator);

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <p className="text-xs font-medium uppercase tracking-wider text-[var(--accent)]">
          Settings
        </p>
        <h1 className="font-display mt-1 text-3xl font-semibold">Project settings</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Project info</CardTitle>
          <CardDescription>Used on BOQ and quotation exports</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {(
            [
              ['name', 'Project name'],
              ['client', 'Client'],
              ['location', 'Location / address'],
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

      <Card>
        <CardHeader>
          <CardTitle>Rates database</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button asChild variant="secondary">
            <Link href="/rates">Open Pakistan Rates</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/quotation">Quotation</Link>
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              if (confirm('Reset project measurements and calculator inputs?')) {
                resetCalculator();
                resetProject();
              }
            }}
          >
            Reset project
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
