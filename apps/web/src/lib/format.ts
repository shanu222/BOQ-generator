const pkr = new Intl.NumberFormat('en-PK', {
  style: 'currency',
  currency: 'PKR',
  maximumFractionDigits: 0,
});

const pkrPrecise = new Intl.NumberFormat('en-PK', {
  style: 'currency',
  currency: 'PKR',
  maximumFractionDigits: 2,
});

const numberFmt = new Intl.NumberFormat('en-PK', {
  maximumFractionDigits: 3,
});

export function formatPKR(value: number, precise = false): string {
  if (!Number.isFinite(value)) return 'PKR 0';
  return (precise ? pkrPrecise : pkr).format(value);
}

export function formatNumber(value: number, digits = 3): string {
  if (!Number.isFinite(value)) return '0';
  return new Intl.NumberFormat('en-PK', {
    maximumFractionDigits: digits,
  }).format(value);
}

export function formatCompact(value: number): string {
  if (!Number.isFinite(value)) return '0';
  if (Math.abs(value) >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(2)}M`;
  }
  if (Math.abs(value) >= 1_000) {
    return `${(value / 1_000).toFixed(1)}K`;
  }
  return numberFmt.format(value);
}

export function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('en-PK', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return iso;
  }
}
