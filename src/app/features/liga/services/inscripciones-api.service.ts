import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import type {
  CandidatosInscripcionResponse,
  InscripcionesListaBuenaFeResponse,
  Inscripcion,
  PreviewInscripcion,
} from '../models/api.types';
import { fechaReferenciaIsoUtc } from '../utils/liga-day-bounds';

@Injectable({ providedIn: 'root' })
export class InscripcionesApiService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/api`;

  list(
    equipoTorneoId: number,
    params?: {
      page?: number;
      limit?: number;
      soloActivas?: boolean;
      q?: string;
      sortBy?: string;
      sortOrder?: 'asc' | 'desc';
    },
  ): Observable<InscripcionesListaBuenaFeResponse> {
    let hp = new HttpParams();
    if (params?.page != null) hp = hp.set('page', String(params.page));
    if (params?.limit != null) hp = hp.set('limit', String(params.limit));
    if (params?.soloActivas != null) hp = hp.set('soloActivas', String(params.soloActivas));
    if (params?.q) hp = hp.set('q', params.q);
    if (params?.sortBy) hp = hp.set('sortBy', params.sortBy);
    if (params?.sortOrder) hp = hp.set('sortOrder', params.sortOrder);
    return this.http.get<InscripcionesListaBuenaFeResponse>(
      `${this.base}/equipos-torneo/${equipoTorneoId}/inscripciones`,
      { params: hp },
    );
  }

  listCandidatos(
    equipoTorneoId: number,
    params?: {
      page?: number;
      limit?: number;
      dni?: string;
      q?: string;
    },
  ): Observable<CandidatosInscripcionResponse> {
    let hp = new HttpParams();
    if (params?.page != null) hp = hp.set('page', String(params.page));
    if (params?.limit != null) hp = hp.set('limit', String(params.limit));
    if (params?.dni) hp = hp.set('dni', params.dni);
    if (params?.q) hp = hp.set('q', params.q);
    return this.http.get<CandidatosInscripcionResponse>(
      `${this.base}/equipos-torneo/${equipoTorneoId}/inscripciones/candidatos`,
      { params: hp },
    );
  }

  preview(
    equipoTorneoId: number,
    jugadorId: number,
    opts?: { fechaReferencia?: string | Date },
  ): Observable<PreviewInscripcion> {
    let params = new HttpParams().set('jugadorId', String(jugadorId));
    if (opts?.fechaReferencia != null) {
      const v =
        opts.fechaReferencia instanceof Date
          ? opts.fechaReferencia.toISOString()
          : fechaReferenciaIsoUtc(opts.fechaReferencia);
      params = params.set('fechaReferencia', v);
    }
    return this.http.get<PreviewInscripcion>(
      `${this.base}/equipos-torneo/${equipoTorneoId}/inscripciones/preview`,
      { params },
    );
  }

  create(
    equipoTorneoId: number,
    body: { jugadorId: number; esForaneo: boolean },
  ): Observable<Inscripcion> {
    return this.http.post<Inscripcion>(
      `${this.base}/equipos-torneo/${equipoTorneoId}/inscripciones`,
      body,
    );
  }

  createBatch(
    equipoTorneoId: number,
    body: { items: Array<{ jugadorId: number; esForaneo: boolean }> },
  ): Observable<Inscripcion[]> {
    return this.http.post<Inscripcion[]>(
      `${this.base}/equipos-torneo/${equipoTorneoId}/inscripciones/batch`,
      body,
    );
  }

  cerrarBatch(body: { ids: number[] }): Observable<{ cerradas: number }> {
    return this.http.post<{ cerradas: number }>(
      `${this.base}/inscripciones/cerrar-batch`,
      body,
    );
  }

  cerrar(inscripcionId: number): Observable<Inscripcion> {
    return this.http.patch<Inscripcion>(
      `${this.base}/inscripciones/${inscripcionId}/cerrar`,
      {},
    );
  }

  cambioEquipo(
    torneoId: number,
    body: { jugadorId: number; equipoDestinoId: number; esForaneo: boolean },
  ): Observable<Inscripcion> {
    return this.http.post<Inscripcion>(
      `${this.base}/torneos/${torneoId}/cambio-equipo`,
      body,
    );
  }
}
