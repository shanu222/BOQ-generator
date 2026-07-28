'use client';

import { useMemo, useState } from 'react';
import {
  Check,
  ChevronLeft,
  ChevronRight,
  FileSpreadsheet,
  FileText,
  FileType,
  Loader2,
} from 'lucide-react';
import type { EstimateResult, ProjectState } from '@boq/shared';
import { cn } from '@/lib/cn';
import { formatPKR } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input, Label } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  REPORT_STYLES,
  REPORT_TYPES,
  SECTION_LABELS,
  applyReportType,
  defaultWizardConfig,
  type ExportFormat,
  type ReportWizardConfig,
} from '@/lib/reports/types';
import { buildReportContext } from '@/lib/reports/assemble';
import { ReportPreview } from '@/components/reports/ReportPreview';
import { useProjectStore } from '@/store/project-store';

const STEPS = ['Report Type', 'Format', 'Options', 'Preview & Generate'] as const;

export function ReportWizard({
  project,
  estimate,
  onGenerated,
}: {
  project: ProjectState;
  estimate: EstimateResult;
  onGenerated?: (info: { formats: string[]; total: number }) => void;
}) {
  const calculator = useProjectStore((s) => s.calculator);
  const plotSummary = useMemo(
    () => ({
      plotAreaSft: calculator.plotAreaSft ?? 0,
      groundCoveredSft: calculator.floors?.ground ? calculator.groundCoveredSft ?? 0 : 0,
      firstCoveredSft: calculator.floors?.first ? calculator.firstCoveredSft ?? 0 : 0,
      mumtyCoveredSft: calculator.floors?.mumty ? calculator.mumtyCoveredSft ?? 0 : 0,
      balconySft: calculator.floors?.first ? calculator.balconySft ?? 0 : 0,
      terraceSft: calculator.floors?.first ? calculator.terraceSft ?? 0 : 0,
      openAreaSft: calculator.openAreaSft ?? 0,
      coveredAreaSft: calculator.areaSft,
      costPerSft: calculator.costPerSft,
      durationMonths: calculator.durationMonths,
    }),
    [calculator],
  );
  const [step, setStep] = useState(0);
  const [config, setConfig] = useState<ReportWizardConfig>(() => {
    const base = defaultWizardConfig();
    return {
      ...base,
      meta: {
        ...base.meta,
        generatedBy: project.preparedBy || '',
        reportTitle: 'Complete Engineering Report',
        companyName: '',
      },
    };
  });
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const ctx = useMemo(
    () => buildReportContext(config, project, estimate, plotSummary),
    [config, project, estimate, plotSummary],
  );

  function toggleFormat(fmt: ExportFormat) {
    setConfig((c) => {
      const has = c.formats.includes(fmt);
      const formats = has ? c.formats.filter((f) => f !== fmt) : [...c.formats, fmt];
      return { ...c, formats };
    });
  }

  function toggleSection(key: keyof ReportWizardConfig['sections']) {
    setConfig((c) => ({
      ...c,
      sections: { ...c.sections, [key]: !c.sections[key] },
    }));
  }

  async function generate() {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const { generateAndDownloadReports } = await import('@/lib/reports/generate');
      const files = await generateAndDownloadReports(
        config,
        project,
        estimate,
        plotSummary,
      );
      setMessage(
        `Generated ${files.length} file${files.length > 1 ? 's' : ''}: ${files
          .map((f) => f.filename)
          .join(', ')}`,
      );
      onGenerated?.({
        formats: files.map((f) => f.format),
        total: estimate.costs.grandTotal,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Report generation failed');
    } finally {
      setBusy(false);
    }
  }

  const canNext =
    step === 0
      ? Boolean(config.reportType)
      : step === 1
        ? config.formats.length > 0
        : true;

  return (
    <div className="space-y-6">
      {/* Step indicator */}
      <ol className="flex flex-wrap gap-2">
        {STEPS.map((label, i) => (
          <li key={label}>
            <button
              type="button"
              onClick={() => i < step && setStep(i)}
              className={cn(
                'inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
                i === step
                  ? 'border-[var(--accent)] bg-[color-mix(in_oklab,var(--accent)_12%,transparent)] text-[var(--foreground)]'
                  : i < step
                    ? 'border-[var(--border)] text-[var(--foreground)] hover:border-[var(--accent)]'
                    : 'border-[var(--border)] text-[var(--muted-foreground)]',
              )}
            >
              <span
                className={cn(
                  'flex h-5 w-5 items-center justify-center rounded-full text-[10px]',
                  i <= step ? 'bg-[var(--accent)] text-white' : 'bg-[var(--muted)]',
                )}
              >
                {i < step ? <Check className="h-3 w-3" /> : i + 1}
              </span>
              {label}
            </button>
          </li>
        ))}
      </ol>

      {step === 0 && (
        <div className="grid gap-3 sm:grid-cols-2">
          {REPORT_TYPES.map((t) => {
            const active = config.reportType === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setConfig((c) => applyReportType(c, t.id))}
                className={cn(
                  'rounded-xl border p-4 text-left transition-all',
                  active
                    ? 'border-[var(--accent)] bg-[color-mix(in_oklab,var(--accent)_8%,transparent)]'
                    : 'border-[var(--border)] hover:border-[var(--accent)]',
                )}
              >
                <p className="font-display font-semibold">{t.name}</p>
                <p className="mt-1 text-sm text-[var(--muted-foreground)]">{t.description}</p>
              </button>
            );
          })}
        </div>
      )}

      {step === 1 && (
        <div className="space-y-4">
          <p className="text-sm text-[var(--muted-foreground)]">
            Select one or more formats. All selected files generate with one click.
          </p>
          <div className="grid gap-3 sm:grid-cols-3">
            {(
              [
                { id: 'pdf' as const, label: 'PDF', desc: 'Print-ready A4 engineering report', icon: FileType },
                { id: 'docx' as const, label: 'Word', desc: 'Consulting-style .docx with TOC', icon: FileText },
                { id: 'xlsx' as const, label: 'Excel', desc: 'Multi-sheet presentation workbook', icon: FileSpreadsheet },
              ] as const
            ).map((f) => {
              const active = config.formats.includes(f.id);
              const Icon = f.icon;
              return (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => toggleFormat(f.id)}
                  className={cn(
                    'rounded-xl border p-4 text-left transition-all',
                    active
                      ? 'border-[var(--accent)] bg-[color-mix(in_oklab,var(--accent)_8%,transparent)]'
                      : 'border-[var(--border)] hover:border-[var(--accent)]',
                  )}
                >
                  <div className="flex items-start justify-between">
                    <Icon className="h-5 w-5 text-[var(--accent)]" />
                    <span
                      className={cn(
                        'flex h-5 w-5 items-center justify-center rounded border text-[10px]',
                        active
                          ? 'border-[var(--accent)] bg-[var(--accent)] text-white'
                          : 'border-[var(--border)]',
                      )}
                    >
                      {active ? <Check className="h-3 w-3" /> : null}
                    </span>
                  </div>
                  <p className="mt-3 font-display font-semibold">{f.label}</p>
                  <p className="mt-1 text-xs text-[var(--muted-foreground)]">{f.desc}</p>
                </button>
              );
            })}
          </div>

          <div>
            <p className="mb-2 text-sm font-medium">Report style</p>
            <div className="flex flex-wrap gap-2">
              {REPORT_STYLES.map((st) => (
                <button
                  key={st.id}
                  type="button"
                  onClick={() => setConfig((c) => ({ ...c, style: st.id }))}
                  className={cn(
                    'rounded-full border px-3 py-1.5 text-xs',
                    config.style === st.id
                      ? 'border-[var(--accent)] bg-[color-mix(in_oklab,var(--accent)_12%,transparent)]'
                      : 'border-[var(--border)]',
                  )}
                  title={st.description}
                >
                  <span
                    className="mr-1.5 inline-block h-2 w-2 rounded-full"
                    style={{ background: st.accent }}
                  />
                  {st.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
          <Card>
            <CardContent className="space-y-3 p-4">
              <p className="text-sm font-medium">Include sections</p>
              <div className="grid gap-2 sm:grid-cols-2">
                {SECTION_LABELS.map(({ key, label }) => (
                  <label
                    key={key}
                    className="flex cursor-pointer items-center gap-2 rounded-md border border-[var(--border)] px-3 py-2 text-sm hover:bg-[var(--muted)]/30"
                  >
                    <input
                      type="checkbox"
                      checked={config.sections[key]}
                      onChange={() => toggleSection(key)}
                      className="accent-[var(--accent)]"
                    />
                    {label}
                  </label>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="space-y-3 p-4">
              <p className="text-sm font-medium">Cover details</p>
              <div>
                <Label>Report title</Label>
                <Input
                  className="mt-1"
                  value={config.meta.reportTitle}
                  onChange={(e) =>
                    setConfig((c) => ({
                      ...c,
                      meta: { ...c.meta, reportTitle: e.target.value },
                    }))
                  }
                />
              </div>
              <div>
                <Label>Company name (optional)</Label>
                <Input
                  className="mt-1"
                  placeholder="Your consulting firm"
                  value={config.meta.companyName}
                  onChange={(e) =>
                    setConfig((c) => ({
                      ...c,
                      meta: { ...c.meta, companyName: e.target.value },
                    }))
                  }
                />
              </div>
              <div>
                <Label>Generated by (optional)</Label>
                <Input
                  className="mt-1"
                  value={config.meta.generatedBy}
                  onChange={(e) =>
                    setConfig((c) => ({
                      ...c,
                      meta: { ...c.meta, generatedBy: e.target.value },
                    }))
                  }
                />
              </div>
              <div>
                <Label>Report version</Label>
                <Input
                  className="mt-1"
                  value={config.meta.reportVersion}
                  onChange={(e) =>
                    setConfig((c) => ({
                      ...c,
                      meta: { ...c.meta, reportVersion: e.target.value },
                    }))
                  }
                />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {step === 3 && (
        <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
          <ReportPreview ctx={ctx} />
          <Card>
            <CardContent className="space-y-4 p-4">
              <div>
                <p className="text-xs uppercase tracking-wider text-[var(--muted-foreground)]">
                  Ready to generate
                </p>
                <p className="font-display mt-1 text-lg font-semibold">{ctx.title}</p>
                <p className="text-sm text-[var(--muted-foreground)]">{ctx.subtitle}</p>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {config.formats.map((f) => (
                  <Badge key={f} variant="secondary">
                    .{f}
                  </Badge>
                ))}
                <Badge variant="outline">{ctx.style.name}</Badge>
              </div>
              <dl className="space-y-1.5 text-sm">
                <div className="flex justify-between">
                  <dt className="text-[var(--muted-foreground)]">BOQ items</dt>
                  <dd className="tabular-nums">{estimate.boq.length}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-[var(--muted-foreground)]">Materials</dt>
                  <dd className="tabular-nums">{estimate.materials.length}</dd>
                </div>
                <div className="flex justify-between border-t border-[var(--border)] pt-2 font-medium">
                  <dt>Grand total</dt>
                  <dd className="tabular-nums text-[var(--accent)]">
                    {formatPKR(estimate.costs.grandTotal)}
                  </dd>
                </div>
              </dl>
              <Button className="w-full" disabled={busy || config.formats.length === 0} onClick={generate}>
                {busy ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating…
                  </>
                ) : (
                  `Generate ${config.formats.length} file${config.formats.length === 1 ? '' : 's'}`
                )}
              </Button>
              {message && <p className="text-xs text-[var(--accent)]">{message}</p>}
              {error && <p className="text-xs text-red-600">{error}</p>}
            </CardContent>
          </Card>
        </div>
      )}

      <div className="flex items-center justify-between border-t border-[var(--border)] pt-4">
        <Button
          type="button"
          variant="ghost"
          disabled={step === 0 || busy}
          onClick={() => setStep((s) => Math.max(0, s - 1))}
        >
          <ChevronLeft className="mr-1 h-4 w-4" />
          Back
        </Button>
        {step < STEPS.length - 1 && (
          <Button type="button" disabled={!canNext} onClick={() => setStep((s) => s + 1)}>
            Continue
            <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
