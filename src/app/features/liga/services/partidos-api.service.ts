import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import type {
  CambioPartido,
  EstadoPartido,
  EventoPartido,
  Paginated,
  Partido,
  PartidoJugadorLinea,
  PreviewPlanilla,
  TipoEvento,
} from '../models/api.types';

@Injectable({ providedIn: 'root' })
export class PartidosApiService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/api`;

  listByTorneo(
    torneoId: number,
    params?: {
      page?: number;
      limit?: number;
      estado?: EstadoPartido;
      q?: string;
      sortBy?: string;
      sortOrder?: 'asc' | 'desc';
    },
  ): Observable<Paginated<Partido>> {
    let hp = new HttpParams();
    if (params?.page != null) hp = hp.set('page', String(params.page));
    if (params?.limit != null) hp = hp.set('limit', String(params.limit));
    if (params?.estado) hp = hp.set('estado', params.estado);
    if (params?.q) hp = hp.set('q', params.q);
    if (params?.sortBy) hp = hp.set('sortBy', params.sortBy);
    if (params?.sortOrder) hp = hp.set('sortOrder', params.sortOrder);
    return this.http.get<Paginated<Partido>>(
      `${this.base}/torneos/${torneoId}/partidos`,
      { params: hp },
    );
  }

  create(
    torneoId: number,
    body: { equipoLocalId: number; equipoVisitanteId: number; fecha: string },
  ): Observable<Partido> {
    return this.http.post<Partido>(
      `${this.base}/torneos/${torneoId}/partidos`,
      body,
    );
  }

  get(id: number): Observable<Partido> {
    return this.http.get<Partido>(`${this.base}/partidos/${id}`);
  }

  update(
    id: number,
    body: Partial<{
      fecha: string;
      equipoLocalId: number;
      equipoVisitanteId: number;
    }>,
  ): Observable<Partido> {
    return this.http.patch<Partido>(`${this.base}/partidos/${id}`, body);
  }

  updateEstado(id: number, body: { estado: EstadoPartido }): Observable<Partido> {
    return this.http.patch<Partido>(`${this.base}/partidos/${id}/estado`, body);
  }

  updateMarcador(
    id: number,
    body: { golesLocal: number; golesVisitante: number },
  ): Observable<Partido> {
    return this.http.patch<Partido>(`${this.base}/partidos/${id}/marcador`, body);
  }

  getPlanilla(id: number): Observable<PartidoJugadorLinea[]> {
    return this.http.get<PartidoJugadorLinea[]>(
      `${this.base}/partidos/${id}/planilla`,
    );
  }

  putPlanilla(
    id: number,
    body: {
      local: {
        jugadorId: number;
        titular: boolean;
        numeroCamiseta?: number | null;
      }[];
      visitante: {
        jugadorId: number;
        titular: boolean;
        numeroCamiseta?: number | null;
      }[];
      capitanLocalJugadorId?: number | null;
      capitanVisitanteJugadorId?: number | null;
      arbitroPrincipal?: string | null;
      juezLinea1?: string | null;
      juezLinea2?: string | null;
      observaciones?: string | null;
    },
  ): Observable<PartidoJugadorLinea[]> {
    return this.http.put<PartidoJugadorLinea[]>(
      `${this.base}/partidos/${id}/planilla`,
      body,
    );
  }

  previewJugador(
    partidoId: number,
    jugadorId: number,
    equipoTorneoId: number,
  ): Observable<PreviewPlanilla> {
    const params = new HttpParams()
      .set('jugadorId', String(jugadorId))
      .set('equipoTorneoId', String(equipoTorneoId));
    return this.http.get<PreviewPlanilla>(
      `${this.base}/partidos/${partidoId}/preview-jugador`,
      { params },
    );
  }

  listEventos(id: number): Observable<EventoPartido[]> {
    return this.http.get<EventoPartido[]>(`${this.base}/partidos/${id}/eventos`);
  }

  addEvento(
    id: number,
    body: { jugadorId: number; tipo: TipoEvento; minuto: number; notas?: string | null },
  ): Observable<EventoPartido> {
    return this.http.post<EventoPartido>(
      `${this.base}/partidos/${id}/eventos`,
      body,
    );
  }

  listCambios(id: number): Observable<CambioPartido[]> {
    return this.http.get<CambioPartido[]>(`${this.base}/partidos/${id}/cambios`);
  }

  addCambio(
    id: number,
    body: { jugadorSaleId: number; jugadorEntraId: number; minuto: number },
  ): Observable<CambioPartido> {
    return this.http.post<CambioPartido>(
      `${this.base}/partidos/${id}/cambios`,
      body,
    );
  }
}
