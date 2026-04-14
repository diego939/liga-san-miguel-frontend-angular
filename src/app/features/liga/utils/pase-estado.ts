import type { Pase } from '../models/api.types';

export function paseActivoEnFecha(p: Pase, ref: Date = new Date()): boolean {
  const ini = new Date(p.fechaInicio);
  const fin = p.fechaFin ? new Date(p.fechaFin) : null;
  return ini <= ref && (fin === null || fin > ref);
}

export function labelEstadoPase(p: Pase, ref: Date = new Date()): 'Activo' | 'Vencido' {
  return paseActivoEnFecha(p, ref) ? 'Activo' : 'Vencido';
}
