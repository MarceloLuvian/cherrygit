/**
 * Utilidades varias para el renderer.
 */

type ClassValue = string | number | null | false | undefined | ClassValue[] | Record<string, boolean>;

/**
 * Concatena clases CSS condicionalmente, estilo `clsx` simplificado.
 */
export function cn(...inputs: ClassValue[]): string {
  const out: string[] = [];

  const push = (v: ClassValue): void => {
    if (!v) return;
    if (typeof v === 'string' || typeof v === 'number') {
      out.push(String(v));
      return;
    }
    if (Array.isArray(v)) {
      v.forEach(push);
      return;
    }
    if (typeof v === 'object') {
      for (const [key, enabled] of Object.entries(v)) {
        if (enabled) out.push(key);
      }
    }
  };

  inputs.forEach(push);
  return out.join(' ');
}

/**
 * Formatea una fecha ISO a formato corto local es-MX.
 */
export function formatDate(iso: string | Date): string {
  const d = typeof iso === 'string' ? new Date(iso) : iso;
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('es-MX', {
    year: 'numeric',
    month: 'short',
    day: '2-digit'
  });
}

/**
 * Formatea una fecha como tiempo relativo ("hace 3 horas", "hace 2 dias").
 */
export function timeAgo(iso: string | Date): string {
  const d = typeof iso === 'string' ? new Date(iso) : iso;
  if (Number.isNaN(d.getTime())) return '';

  const diffMs = Date.now() - d.getTime();
  const diffSec = Math.round(diffMs / 1000);
  const diffMin = Math.round(diffSec / 60);
  const diffHr = Math.round(diffMin / 60);
  const diffDay = Math.round(diffHr / 24);
  const diffMon = Math.round(diffDay / 30);
  const diffYr = Math.round(diffDay / 365);

  if (diffSec < 45) return 'hace unos segundos';
  if (diffMin < 2) return 'hace un minuto';
  if (diffMin < 60) return `hace ${diffMin} minutos`;
  if (diffHr < 2) return 'hace una hora';
  if (diffHr < 24) return `hace ${diffHr} horas`;
  if (diffDay < 2) return 'ayer';
  if (diffDay < 30) return `hace ${diffDay} dias`;
  if (diffMon < 2) return 'hace un mes';
  if (diffMon < 12) return `hace ${diffMon} meses`;
  if (diffYr < 2) return 'hace un ano';
  return `hace ${diffYr} anos`;
}

/**
 * Abre una URL externa en el navegador del sistema.
 * En Electron con sandbox, `window.open` con target _blank lo delega.
 */
export function openExternal(url: string): void {
  window.open(url, '_blank', 'noopener,noreferrer');
}
