import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import type { Paginated, Usuario } from '../models/api.types';

@Injectable({ providedIn: 'root' })
export class UsuariosApiService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/api/usuarios`;

  list(params?: {
    page?: number;
    limit?: number;
    q?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }): Observable<Paginated<Usuario>> {
    let hp = new HttpParams();
    if (params?.page != null) hp = hp.set('page', String(params.page));
    if (params?.limit != null) hp = hp.set('limit', String(params.limit));
    if (params?.q) hp = hp.set('q', params.q);
    if (params?.sortBy) hp = hp.set('sortBy', params.sortBy);
    if (params?.sortOrder) hp = hp.set('sortOrder', params.sortOrder);
    return this.http.get<Paginated<Usuario>>(this.base, { params: hp });
  }

  create(body: { email: string; password: string; rolId: number }): Observable<Usuario> {
    return this.http.post<Usuario>(this.base, body);
  }

  update(
    id: number,
    body: Partial<{ email: string; password: string; rolId: number }>,
  ): Observable<Usuario> {
    return this.http.patch<Usuario>(`${this.base}/${id}`, body);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }
}
