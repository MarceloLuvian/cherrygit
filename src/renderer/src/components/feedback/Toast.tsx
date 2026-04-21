/**
 * Placeholder de Toast. TODO: implementar con @radix-ui/react-toast.
 *
 * Razon: en este sprint priorizamos el bootstrap del shell; el sistema de
 * toasts con Radix requiere provider a nivel app y viewport. Se deja una
 * helper `toast(msg)` que usa alert() como fallback temporal; los call-sites
 * no necesitaran cambiar cuando se complete la implementacion real.
 */

export function toast(message: string): void {
  // TODO(sprint-siguiente): reemplazar por un dispatcher a un Radix Toast provider.
  // eslint-disable-next-line no-alert
  alert(message);
}

export function toastError(err: unknown): void {
  const msg = err instanceof Error ? err.message : String(err);
  // TODO(sprint-siguiente): usar variante "destructive" del Radix Toast.
  // eslint-disable-next-line no-alert
  alert(`Error: ${msg}`);
}
