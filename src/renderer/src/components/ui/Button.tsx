import React from 'react';
import { cn } from '@renderer/lib/utils';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
}

const base =
  'inline-flex items-center justify-center gap-2 rounded-md font-medium transition-colors select-none focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-50';

const variants: Record<Variant, string> = {
  primary:
    'bg-[var(--color-primary)] text-[var(--color-primary-fg)] hover:bg-[var(--color-primary-hover)]',
  secondary:
    'bg-[var(--color-bg-muted)] text-[var(--color-fg)] border border-[var(--color-border)] hover:bg-[var(--color-bg-elevated)]',
  ghost:
    'bg-transparent text-[var(--color-fg)] hover:bg-[var(--color-bg-muted)]',
  danger:
    'bg-[var(--color-danger)] text-white hover:brightness-110'
};

const sizes: Record<Size, string> = {
  sm: 'h-7 px-2.5 text-xs',
  md: 'h-9 px-3.5 text-sm',
  lg: 'h-11 px-5 text-base'
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  function Button({ variant = 'primary', size = 'md', className, loading, disabled, children, ...rest }, ref) {
    return (
      <button
        ref={ref}
        className={cn(base, variants[variant], sizes[size], className)}
        disabled={disabled || loading}
        {...rest}
      >
        {loading ? (
          <span
            className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-r-transparent"
            aria-hidden="true"
          />
        ) : null}
        {children}
      </button>
    );
  }
);
