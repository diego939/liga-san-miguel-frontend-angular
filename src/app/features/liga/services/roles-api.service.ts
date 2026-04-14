import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import type { Paginated, Rol } from '../models/api.types';

@Injectable({ providedIn: 'root' })
export class RolesApiService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/api/roles`;

  list(params?: {
    page?: number;
    limit?: number;
    q?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }): Observable<Paginated<Rol>> {
    let hp = new HttpParams();
    if (params?.page != null) hp = hp.set('page', String(params.page));
    if (params?.limit != null) hp = hp.set('limit', String(params.limit));
    if (params?.q) hp = hp.set('q', params.q);
    if (params?.sortBy) hp = hp.set('sortBy', params.sortBy);
    if (params?.sortOrder) hp = hp.set('sortOrder', params.sortOrder);
    return this.http.get<Paginated<Rol>>(this.base, { params: hp });
  }

  get(id: number): Observable<Rol> {
    return this.http.get<Rol>(`${this.base}/${id}`);
  }

  create(body: { descripcion: string }): Observable<Rol> {
    return this.http.post<Rol>(this.base, body);
  }

  update(id: number, body: Partial<{ descripcion: string }>): Observable<Rol> {
    return this.http.patch<Rol>(`${this.base}/${id}`, body);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }
}
