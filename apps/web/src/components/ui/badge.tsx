import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/cn';

const badgeVariants = cva(
  'inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium transition-colors',
  {
    variants: {
      variant: {
        default:
          'bg-[var(--accent-muted)] text-[var(--accent)]',
        secondary:
          'bg-[var(--muted)] text-[var(--muted-foreground)]',
        outline:
          'border border-[var(--border)] text-[var(--foreground)]',
        success:
          'bg-[color-mix(in_oklab,var(--success)_15%,transparent)] text-[var(--success)]',
        warning:
          'bg-[color-mix(in_oklab,var(--warning)_15%,transparent)] text-[var(--warning)]',
        danger:
          'bg-[color-mix(in_oklab,var(--danger)_15%,transparent)] text-[var(--danger)]',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

export function Badge({
  className,
  variant,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof badgeVariants>) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}
