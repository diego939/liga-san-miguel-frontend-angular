import { DateTime } from 'luxon';
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
  const raw = String(iso).trim();
  const dateOnlyMatch = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (dateOnlyMatch) {
    const [, year, month, day] = dateOnlyMatch;
    return `${day}/${month}/${year}`;
  }
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('es-AR', {
    timeZone: displayTimeZone,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

/**
 * Valor `yyyy-MM-dd` para `<input type="date">` a partir de un ISO del API
 * (p. ej. Prisma en UTC). Usa el día civil en `appTimeZone`, alineado con el backend.
 */
export function fechaIsoADateInputValue(iso: string | null | undefined): string {
  if (!iso) return '';
  const trimmed = String(iso).trim();
  let dt = DateTime.fromISO(trimmed, { setZone: true });
  if (!dt.isValid) {
    const d = new Date(trimmed);
    if (Number.isNaN(d.getTime())) return '';
    dt = DateTime.fromJSDate(d, { zone: 'utc' });
  }
  return dt.setZone(displayTimeZone).toFormat('yyyy-MM-dd');
}
