import { cn } from '../../lib/utils';

type Variant = 'default' | 'success' | 'warning' | 'error' | 'info';

const variants: Record<Variant, string> = {
  default: 'bg-bnr-muted/60 text-bnr-text',
  success: 'bg-green-100 text-green-800',
  warning: 'bg-amber-100 text-amber-800',
  error:   'bg-red-100 text-red-800',
  info:    'bg-bnr-cream text-bnr-dark border border-bnr-muted',
};

export function Badge({
  children,
  variant = 'default',
  className,
}: {
  children: React.ReactNode;
  variant?: Variant;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        variants[variant],
        className,
      )}
    >
      {children}
    </span>
  );
}
