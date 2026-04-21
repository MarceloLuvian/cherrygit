import React from 'react';
import { cn } from '@renderer/lib/utils';

export function Card({
  className,
  children,
  ...rest
}: React.HTMLAttributes<HTMLDivElement>): JSX.Element {
  return (
    <div
      className={cn(
        'rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-4 shadow-sm',
        className
      )}
      {...rest}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  className,
  children,
  ...rest
}: React.HTMLAttributes<HTMLDivElement>): JSX.Element {
  return (
    <div className={cn('mb-3 flex items-start justify-between gap-3', className)} {...rest}>
      {children}
    </div>
  );
}

export function CardTitle({
  className,
  children,
  ...rest
}: React.HTMLAttributes<HTMLHeadingElement>): JSX.Element {
  return (
    <h3 className={cn('text-base font-semibold text-[var(--color-fg)]', className)} {...rest}>
      {children}
    </h3>
  );
}

export function CardDescription({
  className,
  children,
  ...rest
}: React.HTMLAttributes<HTMLParagraphElement>): JSX.Element {
  return (
    <p className={cn('text-sm text-[var(--color-fg-muted)]', className)} {...rest}>
      {children}
    </p>
  );
}
