import { environment } from '../../../../environments/environment';

const displayTimeZone =
  environment.appTimeZone ?? 'America/Argentina/Buenos_Aires';

export function formatDateTime(iso: string | undefined | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString('es-AR', {
    timeZone: displayTimeZone,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatDateOnly(iso: string | undefined | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('es-AR', {
    timeZone: displayTimeZone,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}
