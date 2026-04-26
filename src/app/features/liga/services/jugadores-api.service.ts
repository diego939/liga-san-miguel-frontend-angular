import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import type {
  Inscripcion,
  Jugador,
  Paginated,
  Pase,
  Suspension,
} from '../models/api.types';

@Injectable({ providedIn: 'root' })
export class JugadoresApiService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/api/jugadores`;

  list(params: {
    page?: number;
    limit?: number;
    q?: string;
    dni?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }): Observable<Paginated<Jugador>> {
    let hp = new HttpParams();
    if (params.page != null) hp = hp.set('page', String(params.page));
    if (params.limit != null) hp = hp.set('limit', String(params.limit));
    if (params.q) hp = hp.set('q', params.q);
    if (params.dni) hp = hp.set('dni', params.dni);
    if (params.sortBy) hp = hp.set('sortBy', params.sortBy);
    if (params.sortOrder) hp = hp.set('sortOrder', params.sortOrder);
    return this.http.get<Paginated<Jugador>>(this.base, { params: hp });
  }

  get(id: number): Observable<Jugador> {
    return this.http.get<Jugador>(`${this.base}/${id}`);
  }

  create(body: {
    dni: string;
    nombre: string;
    apellido: string;
    anioNacimiento: number;
    telefono?: string;
    fechaNacimiento?: string;
    nacionalidad?: string;
    /** Pase inicial: origen null → destino este club. */
    clubDestinoInicialId?: number;
  }): Observable<Jugador> {
    return this.http.post<Jugador>(this.base, body);
  }

  update(
    id: number,
    body: Partial<{
      dni: string;
      nombre: string;
      apellido: string;
      telefono: string;
      anioNacimiento: number;
      fechaNacimiento: string | null;
      nacionalidad: string;
    }>,
  ): Observable<Jugador> {
    return this.http.patch<Jugador>(`${this.base}/${id}`, body);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }

  listPases(id: number): Observable<Pase[]> {
    return this.http.get<Pase[]>(`${this.base}/${id}/pases`);
  }

  listTorneosJugados(id: number): Observable<Inscripcion[]> {
    return this.http.get<Inscripcion[]>(`${this.base}/${id}/torneos-jugados`);
  }

  listSuspensiones(id: number): Observable<Suspension[]> {
    return this.http.get<Suspension[]>(`${this.base}/${id}/suspensiones`);
  }
}
