'use client';

import { useRef } from 'react';
import Link from 'next/link';
import { buildAreaPresentation } from '@boq/engine';
import { useEstimate } from '@/hooks/use-estimate';
import { useProjectStore } from '@/store/project-store';
import { formatPKR } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

export default function QuotationPage() {
  const printRef = useRef<HTMLDivElement>(null);
  const quotation = useProjectStore((s) => s.quotation);
  const setQuotation = useProjectStore((s) => s.setQuotation);
  const calculator = useProjectStore((s) => s.calculator);
  const project = useProjectStore((s) => s.project);
  const updateMeta = useProjectStore((s) => s.updateMeta);
  const estimate = useEstimate();

  const view = buildAreaPresentation(project, estimate, {
    areaSft: calculator.areaSft,
    costPerSft: calculator.costPerSft,
    durationMonths: calculator.durationMonths,
    mode: calculator.mode,
  });

  function generatePdf() {
    window.print();
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 pb-12">
      <div>
        <p className="text-xs font-medium uppercase tracking-wider text-[var(--accent)]">
          Quotation
        </p>
        <h1 className="font-display mt-1 text-3xl font-semibold">Generate Quotation</h1>
        <p className="mt-1 text-sm text-[var(--muted-foreground)]">
          Client-facing summary for {formatPKR(view.grandTotal)}
        </p>
      </div>

      <Card className="print:hidden">
        <CardHeader>
          <CardTitle>Quotation details</CardTitle>
          <CardDescription>Only the fields needed for a residential quote</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="client">Client Name</Label>
            <Input
              id="client"
              className="mt-1"
              value={quotation.clientName}
              onChange={(e) => {
                setQuotation({ clientName: e.target.value });
                updateMeta({ client: e.target.value });
              }}
            />
          </div>
          <div>
            <Label htmlFor="pname">Project Name</Label>
            <Input
              id="pname"
              className="mt-1"
              value={quotation.projectName || project.name}
              onChange={(e) => {
                setQuotation({ projectName: e.target.value });
                updateMeta({ name: e.target.value });
              }}
            />
          </div>
          <div>
            <Label htmlFor="addr">Project Address</Label>
            <Input
              id="addr"
              className="mt-1"
              value={quotation.projectAddress || project.location}
              onChange={(e) => {
                setQuotation({ projectAddress: e.target.value });
                updateMeta({ location: e.target.value });
              }}
            />
          </div>
          <div>
            <Label htmlFor="notes">Additional Notes</Label>
            <textarea
              id="notes"
              className="mt-1 min-h-[88px] w-full rounded-md border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm"
              value={quotation.notes}
              onChange={(e) => setQuotation({ notes: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="sign">Signatory Name</Label>
            <Input
              id="sign"
              className="mt-1"
              value={quotation.signatoryName || project.preparedBy}
              onChange={(e) => {
                setQuotation({ signatoryName: e.target.value });
                updateMeta({ preparedBy: e.target.value });
              }}
            />
          </div>
          <p className="text-xs text-[var(--muted-foreground)]">
            Contractor signature: sign on the printed / PDF copy below the signatory name.
          </p>
          <div className="flex flex-wrap gap-2 pt-2">
            <Button onClick={generatePdf}>Generate PDF</Button>
            <Button asChild variant="secondary">
              <Link href="/boq">Add to BOQ</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/reports">Full Report Center</Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      <div
        ref={printRef}
        className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-8 print:border-0"
      >
        <h2 className="font-display text-2xl font-semibold">Quotation</h2>
        <p className="mt-1 text-sm text-[var(--muted-foreground)]">BOQ Pro — Pakistan Residential</p>
        <dl className="mt-6 space-y-2 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-[var(--muted-foreground)]">Client</dt>
            <dd className="font-medium">{quotation.clientName || '—'}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-[var(--muted-foreground)]">Project</dt>
            <dd className="font-medium">{quotation.projectName || project.name}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-[var(--muted-foreground)]">Address</dt>
            <dd className="font-medium text-right">
              {quotation.projectAddress || project.location || '—'}
            </dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-[var(--muted-foreground)]">Plot area</dt>
            <dd className="font-medium">{calculator.plotAreaSft ?? '—'} Sq.ft.</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-[var(--muted-foreground)]">Ground floor</dt>
            <dd className="font-medium">{calculator.groundCoveredSft ?? 0} Sq.ft.</dd>
          </div>
          {calculator.floors?.first && (
            <>
              <div className="flex justify-between gap-4">
                <dt className="text-[var(--muted-foreground)]">Balcony</dt>
                <dd className="font-medium">{calculator.balconySft ?? 0} Sq.ft.</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-[var(--muted-foreground)]">Terrace</dt>
                <dd className="font-medium">{calculator.terraceSft ?? 0} Sq.ft.</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-[var(--muted-foreground)]">First floor</dt>
                <dd className="font-medium">{calculator.firstCoveredSft ?? 0} Sq.ft.</dd>
              </div>
            </>
          )}
          {calculator.floors?.mumty && (
            <div className="flex justify-between gap-4">
              <dt className="text-[var(--muted-foreground)]">Mumty</dt>
              <dd className="font-medium">{calculator.mumtyCoveredSft ?? 0} Sq.ft.</dd>
            </div>
          )}
          <div className="flex justify-between gap-4">
            <dt className="text-[var(--muted-foreground)]">Total covered</dt>
            <dd className="font-medium">{calculator.areaSft} Sq.ft.</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-[var(--muted-foreground)]">Open area</dt>
            <dd className="font-medium">{calculator.openAreaSft ?? 0} Sq.ft.</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-[var(--muted-foreground)]">Duration</dt>
            <dd className="font-medium">{calculator.durationMonths} Months</dd>
          </div>
          <div className="flex justify-between gap-4 border-t border-[var(--border)] pt-3 text-base">
            <dt className="font-semibold">Total Construction Cost</dt>
            <dd className="font-semibold tabular-nums">{formatPKR(view.grandTotal)}</dd>
          </div>
        </dl>
        {quotation.notes && (
          <div className="mt-6 text-sm">
            <p className="font-medium">Notes</p>
            <p className="mt-1 text-[var(--muted-foreground)] whitespace-pre-wrap">
              {quotation.notes}
            </p>
          </div>
        )}
        <div className="mt-16 grid gap-8 sm:grid-cols-2">
          <div>
            <div className="h-16 border-b border-[var(--border)]" />
            <p className="mt-2 text-sm font-medium">
              {quotation.signatoryName || project.preparedBy || 'Signatory'}
            </p>
            <p className="text-xs text-[var(--muted-foreground)]">Contractor Signature</p>
          </div>
        </div>
      </div>
    </div>
  );
}
