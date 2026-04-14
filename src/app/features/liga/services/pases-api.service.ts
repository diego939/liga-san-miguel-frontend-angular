import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import type { Paginated, Pase, TipoPase } from '../models/api.types';

@Injectable({ providedIn: 'root' })
export class PasesApiService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/api/pases`;

  list(params: {
    page?: number;
    limit?: number;
    jugadorId?: number;
    clubId?: number;
    estado?: 'activo' | 'vencido' | 'todos';
    fechaReferencia?: string;
    q?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }): Observable<Paginated<Pase> & { fechaReferencia?: string }> {
    let hp = new HttpParams();
    if (params.page != null) hp = hp.set('page', String(params.page));
    if (params.limit != null) hp = hp.set('limit', String(params.limit));
    if (params.jugadorId != null) hp = hp.set('jugadorId', String(params.jugadorId));
    if (params.clubId != null) hp = hp.set('clubId', String(params.clubId));
    if (params.estado) hp = hp.set('estado', params.estado);
    if (params.fechaReferencia) hp = hp.set('fechaReferencia', params.fechaReferencia);
    if (params.q) hp = hp.set('q', params.q);
    if (params.sortBy) hp = hp.set('sortBy', params.sortBy);
    if (params.sortOrder) hp = hp.set('sortOrder', params.sortOrder);
    return this.http.get<Paginated<Pase> & { fechaReferencia?: string }>(
      this.base,
      { params: hp },
    );
  }

  get(id: number): Observable<Pase> {
    return this.http.get<Pase>(`${this.base}/${id}`);
  }

  create(body: {
    jugadorId: number;
    clubOrigenId?: number | null;
    clubDestinoId: number;
    tipo: TipoPase;
    fechaInicio: string;
    fechaFin?: string;
  }): Observable<Pase> {
    return this.http.post<Pase>(this.base, body);
  }

  update(
    id: number,
    body: Partial<{
      fechaInicio: string;
      fechaFin: string | null;
      tipo: TipoPase;
    }>,
  ): Observable<Pase> {
    return this.http.patch<Pase>(`${this.base}/${id}`, body);
  }

  renovar(
    id: number,
    body: { fechaInicio: string; fechaFin?: string; tipo?: TipoPase },
  ): Observable<Pase> {
    return this.http.post<Pase>(`${this.base}/${id}/renovar`, body);
  }
}
