import { DateTime } from 'luxon';

/** Zona por defecto si no viene en environment (misma que backend `APP_TIMEZONE`). */
export const DEFAULT_APP_TIMEZONE = 'America/Argentina/Buenos_Aires';

/** Inicio y fin del día civil en `timeZone` que contiene el instante `fecha`. */
export function rangoDiaCivil(
  fecha: Date,
  timeZone: string,
): { inicio: Date; fin: Date } {
  const local = DateTime.fromMillis(fecha.getTime(), { zone: timeZone });
  const start = local.startOf('day');
  const end = local.endOf('day');
  return { inicio: start.toJSDate(), fin: end.toJSDate() };
}

/** Solape de [fechaInicio, fechaFin] con el día civil de `fechaRef` en `timeZone`. */
export function inscripcionSolapaDiaCivil(
  ins: { fechaInicio: string | Date; fechaFin?: string | Date | null },
  fechaRef: Date,
  timeZone: string,
): boolean {
  const { inicio, fin } = rangoDiaCivil(fechaRef, timeZone);
  const fi = new Date(ins.fechaInicio);
  if (fi > fin) return false;
  const ff = ins.fechaFin != null ? new Date(ins.fechaFin) : null;
  if (ff !== null && ff <= inicio) return false;
  return true;
}
