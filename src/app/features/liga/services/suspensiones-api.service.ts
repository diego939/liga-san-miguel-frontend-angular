import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import type { Paginated, Suspension } from '../models/api.types';

@Injectable({ providedIn: 'root' })
export class SuspensionesApiService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/api/suspensiones`;

  list(params?: {
    page?: number;
    limit?: number;
    torneoId?: number;
    jugadorId?: number;
    activas?: boolean;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }): Observable<Paginated<Suspension>> {
    let hp = new HttpParams();
    if (params?.page != null) hp = hp.set('page', String(params.page));
    if (params?.limit != null) hp = hp.set('limit', String(params.limit));
    if (params?.torneoId != null) hp = hp.set('torneoId', String(params.torneoId));
    if (params?.jugadorId != null) hp = hp.set('jugadorId', String(params.jugadorId));
    if (params?.activas != null) hp = hp.set('activas', String(params.activas));
    if (params?.sortBy) hp = hp.set('sortBy', params.sortBy);
    if (params?.sortOrder) hp = hp.set('sortOrder', params.sortOrder);
    return this.http.get<Paginated<Suspension>>(this.base, { params: hp });
  }

  suspendidosPorTorneo(torneoId: number): Observable<Suspension[]> {
    return this.http.get<Suspension[]>(
      `${environment.apiUrl}/api/torneos/${torneoId}/suspendidos`,
    );
  }

  get(id: number): Observable<Suspension> {
    return this.http.get<Suspension>(`${this.base}/${id}`);
  }

  create(body: {
    jugadorId: number;
    torneoId: number;
    motivo: string;
    partidosRestantes: number;
  }): Observable<Suspension> {
    return this.http.post<Suspension>(this.base, body);
  }

  update(
    id: number,
    body: Partial<{ motivo: string; partidosRestantes: number }>,
  ): Observable<Suspension> {
    return this.http.patch<Suspension>(`${this.base}/${id}`, body);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }
}
