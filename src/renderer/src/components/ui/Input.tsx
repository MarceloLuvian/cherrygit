import React from 'react';
import { cn } from '@renderer/lib/utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, invalid, ...rest },
  ref
) {
  return (
    <input
      ref={ref}
      className={cn(
        'h-9 w-full rounded-md border bg-[var(--color-bg-elevated)] px-3 text-sm text-[var(--color-fg)]',
        'placeholder:text-[var(--color-fg-subtle)]',
        'focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2',
        invalid
          ? 'border-[var(--color-danger)]'
          : 'border-[var(--color-border)] hover:border-[var(--color-border-strong)]',
        className
      )}
      {...rest}
    />
  );
});
