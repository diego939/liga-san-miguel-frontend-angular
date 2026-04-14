import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import type { Paginated, Torneo } from '../models/api.types';

@Injectable({ providedIn: 'root' })
export class TorneosApiService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/api/torneos`;

  list(params?: {
    page?: number;
    limit?: number;
    q?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }): Observable<Paginated<Torneo>> {
    let hp = new HttpParams();
    if (params?.page != null) hp = hp.set('page', String(params.page));
    if (params?.limit != null) hp = hp.set('limit', String(params.limit));
    if (params?.q) hp = hp.set('q', params.q);
    if (params?.sortBy) hp = hp.set('sortBy', params.sortBy);
    if (params?.sortOrder) hp = hp.set('sortOrder', params.sortOrder);
    return this.http.get<Paginated<Torneo>>(this.base, { params: hp });
  }

  get(id: number): Observable<Torneo> {
    return this.http.get<Torneo>(`${this.base}/${id}`);
  }

  create(body: {
    nombre: string;
    categoria: string;
    formato: string;
    fechaInicio: string;
    fechaFin: string;
    limiteForaneos?: number;
    maxJugadores: number;
  }): Observable<Torneo> {
    return this.http.post<Torneo>(this.base, body);
  }

  update(
    id: number,
    body: Partial<{
      nombre: string;
      categoria: string;
      formato: string;
      fechaInicio: string;
      fechaFin: string;
      limiteForaneos: number | null;
      maxJugadores: number;
    }>,
  ): Observable<Torneo> {
    return this.http.patch<Torneo>(`${this.base}/${id}`, body);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }

  resumen(id: number): Observable<{
    torneo: Torneo;
    equiposInscriptos: number;
    partidosPorEstado: Record<string, number>;
  }> {
    return this.http.get(`${this.base}/${id}/resumen`) as Observable<{
      torneo: Torneo;
      equiposInscriptos: number;
      partidosPorEstado: Record<string, number>;
    }>;
  }
}
