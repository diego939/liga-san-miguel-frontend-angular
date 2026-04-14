import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import type { Club, ClubPersonal, Paginated } from '../models/api.types';

@Injectable({ providedIn: 'root' })
export class ClubesApiService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/api/clubes`;

  list(params?: {
    page?: number;
    limit?: number;
    q?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }): Observable<Paginated<Club>> {
    let hp = new HttpParams();
    if (params?.page != null) hp = hp.set('page', String(params.page));
    if (params?.limit != null) hp = hp.set('limit', String(params.limit));
    if (params?.q) hp = hp.set('q', params.q);
    if (params?.sortBy) hp = hp.set('sortBy', params.sortBy);
    if (params?.sortOrder) hp = hp.set('sortOrder', params.sortOrder);
    return this.http.get<Paginated<Club>>(this.base, { params: hp });
  }

  /** Lista simple para selects (alta límite). */
  listAllForSelect(): Observable<Paginated<Club>> {
    return this.list({ page: 1, limit: 100, sortBy: 'nombre', sortOrder: 'asc' });
  }

  get(id: number): Observable<Club> {
    return this.http.get<Club>(`${this.base}/${id}`);
  }

  create(body: { nombre: string; logo?: string }): Observable<Club> {
    return this.http.post<Club>(this.base, body);
  }

  update(id: number, body: Partial<{ nombre: string; logo: string }>): Observable<Club> {
    return this.http.patch<Club>(`${this.base}/${id}`, body);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }

  listPersonal(clubId: number): Observable<ClubPersonal[]> {
    return this.http.get<ClubPersonal[]>(`${this.base}/${clubId}/personal`);
  }

  addPersonal(
    clubId: number,
    body: { tipo: string; nombre: string; dni?: string; telefono?: string },
  ): Observable<ClubPersonal> {
    return this.http.post<ClubPersonal>(`${this.base}/${clubId}/personal`, body);
  }

  updatePersonal(
    clubId: number,
    personalId: number,
    body: Partial<{
      tipo: string;
      nombre: string;
      dni: string | null;
      telefono: string | null;
    }>,
  ): Observable<ClubPersonal> {
    return this.http.patch<ClubPersonal>(
      `${this.base}/${clubId}/personal/${personalId}`,
      body,
    );
  }

  deletePersonal(clubId: number, personalId: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/${clubId}/personal/${personalId}`);
  }
}
