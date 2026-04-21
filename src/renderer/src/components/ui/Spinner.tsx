import { cn } from '@renderer/lib/utils';

interface SpinnerProps {
  size?: number;
  className?: string;
  label?: string;
}

export function Spinner({ size = 16, className, label = 'Cargando' }: SpinnerProps): JSX.Element {
  return (
    <span
      role="status"
      aria-label={label}
      className={cn(
        'inline-block animate-spin rounded-full border-2 border-current border-r-transparent',
        className
      )}
      style={{ width: size, height: size }}
    />
  );
}
